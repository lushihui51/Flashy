import uuid
from datetime import datetime

from sqlmodel import Session, col, select

from app.database_ops.card_field_mastery import (
    db_clear_mastery,
    db_fetch_mastery_read_rows,
    db_fetch_mastery_states_for_update,
    db_upsert_mastery_states,
)
from app.database_ops.review_log import db_fetch_review_log_for_rebuild
from app.mastery.strategy import MasteryStrategy
from app.mastery.types import CardScore, FieldMasteryState, ReviewEvent, ReviewSide
from app.models.card import Card


def apply_rating(
    db: Session,
    strategy: MasteryStrategy,
    card_id: uuid.UUID,
    field_def_id: uuid.UUID,
    shown_prompt_ids: list[uuid.UUID],
    rating: int,
    reviewed_at: datetime,
) -> None:
    """Write path for one rated answer field: the answer field's answer_mastery blends
    toward the rating, and every shown prompt field's prompt_mastery does too. Does not
    commit — the caller owns the transaction (Phase 4 wraps this alongside the
    review_log insert and practice_card update)."""
    affected_ids = [field_def_id, *shown_prompt_ids]
    current_states = db_fetch_mastery_states_for_update(db, card_id, affected_ids)

    answer_event = ReviewEvent(side=ReviewSide.answer, rating=rating, reviewed_at=reviewed_at)
    new_states = {
        field_def_id: strategy.apply_review(current_states.get(field_def_id), answer_event)
    }

    prompt_event = ReviewEvent(side=ReviewSide.prompt, rating=rating, reviewed_at=reviewed_at)
    for prompt_id in shown_prompt_ids:
        new_states[prompt_id] = strategy.apply_review(
            current_states.get(prompt_id), prompt_event
        )

    db_upsert_mastery_states(db, card_id, new_states, reviewed_at)


def _row_state(row) -> FieldMasteryState | None:
    if row.prompt_mastery is None:
        return None
    return FieldMasteryState(
        prompt_mastery=row.prompt_mastery,
        answer_mastery=row.answer_mastery,
        prompt_review_count=row.prompt_review_count,
        answer_review_count=row.answer_review_count,
    )


def card_mastery(
    db: Session,
    strategy: MasteryStrategy,
    card_ids: list[uuid.UUID],
    field_ids: list[uuid.UUID] | None = None,
) -> dict[uuid.UUID, CardScore]:
    """Read path. The fetch drives from field_def (invariant 4); this function only
    folds the already-fetched rows through the strategy — no scoring in SQL."""
    rows = db_fetch_mastery_read_rows(db, card_ids, field_ids)
    scores_by_card: dict[uuid.UUID, list[float | None]] = {cid: [] for cid in card_ids}
    for row in rows:
        scores_by_card[row.card_id].append(strategy.field_score(_row_state(row)))
    return {cid: strategy.card_score(scores) for cid, scores in scores_by_card.items()}


def deck_mastery(
    db: Session, strategy: MasteryStrategy, deck_ids: list[uuid.UUID]
) -> dict[uuid.UUID, CardScore]:
    """Same fetch as card_mastery, grouped by deck in Python. Display-only — never
    stored, never a trigger."""
    if not deck_ids:
        return {}
    card_ids = list(db.exec(select(Card.id).where(col(Card.deck_id).in_(deck_ids))).all())
    rows = db_fetch_mastery_read_rows(db, card_ids)
    scores_by_deck: dict[uuid.UUID, list[float | None]] = {did: [] for did in deck_ids}
    for row in rows:
        scores_by_deck[row.deck_id].append(strategy.field_score(_row_state(row)))
    return {did: strategy.card_score(scores) for did, scores in scores_by_deck.items()}


def rebuild_mastery(
    db: Session, strategy: MasteryStrategy, user_id: uuid.UUID | None = None
) -> None:
    """Truncates (or delete-scopes) card_field_mastery and replays review_log through
    the same write path apply_rating uses, oldest first. Because the strategy is a
    parameter, changing strategies is not a migration — it's a rebuild. Slow is fine."""
    db_clear_mastery(db, user_id)
    for row in db_fetch_review_log_for_rebuild(db, user_id):
        apply_rating(
            db,
            strategy,
            card_id=row.card_id,
            field_def_id=row.field_def_id,
            shown_prompt_ids=row.shown_prompt_ids,
            rating=row.rating,
            reviewed_at=row.reviewed_at,
        )
    db.commit()
