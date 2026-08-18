import uuid
from collections import defaultdict

from sqlmodel import Session, col, select

from app.database_ops.card_field_mastery import (
    db_clear_mastery,
    db_fetch_mastery_read_rows,
    db_fetch_mastery_states_for_update,
    db_upsert_mastery_states,
)
from app.database_ops.review_log import (
    ReviewGroupWriteOutcome,
    db_fetch_review_log_for_rebuild,
    db_log_review_group,
)
from app.mastery.strategy import MasteryStrategy
from app.mastery.types import CardScore, FieldMasteryState, ReviewGroup
from app.models.card import Card
from app.models.review_log import ReviewLog


def apply_rating(db: Session, strategy: MasteryStrategy, group: ReviewGroup) -> None:
    """Unconditionally blends one appearance into mastery — the pure write-path
    primitive. Assumes the caller has already established that this group is new to
    the log (record_review_group does that for the live write path; rebuild_mastery
    doesn't need to, since it only ever replays rows that are already on record). Not
    idempotent on its own: calling it twice for the same group blends toward the same
    target twice, which is exactly why record_review_group exists as the safe entry
    point instead of calling this directly from a request handler.

    expand() decides every (card, field, side) update up front — including the prompt
    side's breadth, which needs the whole group, not one row, hence taking a
    ReviewGroup rather than a raw log row. Does not commit — the caller owns the
    transaction."""
    updates = strategy.expand(group)
    affected_field_ids = {field_def_id for _, field_def_id, _ in updates}
    states = dict(db_fetch_mastery_states_for_update(db, group.card_id, list(affected_field_ids)))

    # Applied sequentially onto an evolving working state (not a one-pass collapse) so
    # that if an update set ever legitimately touched both sides of the same field
    # within one group, the second apply_review would compound onto the first's result
    # instead of clobbering it.
    for (_, field_def_id, _side), update in updates.items():
        states[field_def_id] = strategy.apply_review(states.get(field_def_id), update)

    db_upsert_mastery_states(db, group.card_id, states, group.reviewed_at)


def record_review_group(
    db: Session, strategy: MasteryStrategy, user_id: uuid.UUID, group: ReviewGroup
) -> ReviewGroupWriteOutcome:
    """The retry-safe write-path entry point for one appearance — what Phase 4's rating
    endpoint should call, not apply_rating directly. Logs the group, then blends it
    into mastery only when the log didn't already have it:

    - NEW: the group was written for the first time; apply_rating runs.
    - RETRY: review_log already had exactly this group's rated fields on record.
      Mastery is deliberately *not* re-blended. This looks like a bug at a glance —
      "we skipped the update" — but it's invariant 2 doing exactly the work it exists
      for: mastery is a disposable, faithful function of the log, so if the log already
      reflects this appearance, the mastery write that happened when it was first
      logged already reflects it too. Re-blending here would move mastery toward the
      same target a second time for a client-side retry that changed nothing.
    - Raises ReviewGroupInconsistent (propagated from db_log_review_group) if the log
      has a different set of rated fields on record for this review_group_id already.

    Does not commit — the caller owns the transaction."""
    rows = [
        {
            "user_id": user_id,
            "card_id": group.card_id,
            "field_def_id": field_def_id,
            "review_group_id": group.review_group_id,
            "rating": rating,
            "shown_prompt_ids": list(group.shown_prompt_ids),
            "reviewed_at": group.reviewed_at,
        }
        for field_def_id, rating in group.ratings
    ]
    outcome = db_log_review_group(db, group.review_group_id, rows)
    if outcome is ReviewGroupWriteOutcome.new:
        apply_rating(db, strategy, group)
    return outcome


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


def _group_review_log_rows(rows: list[ReviewLog]) -> list[ReviewGroup]:
    """Collapses flat review_log rows into ReviewGroups, one per review_group_id,
    ordered by (reviewed_at, review_group_id) for a deterministic replay order — the
    id tiebreak matters when two appearances share a timestamp. Relies on the
    atomicity invariant: every row for a given review_group_id must already be
    present, never a partial subset."""
    by_group: dict[uuid.UUID, list[ReviewLog]] = defaultdict(list)
    for row in rows:
        by_group[row.review_group_id].append(row)

    groups = [
        ReviewGroup(
            review_group_id=review_group_id,
            card_id=group_rows[0].card_id,
            reviewed_at=min(r.reviewed_at for r in group_rows),
            ratings=tuple((r.field_def_id, r.rating) for r in group_rows),
            shown_prompt_ids=tuple(group_rows[0].shown_prompt_ids),
        )
        for review_group_id, group_rows in by_group.items()
    ]
    groups.sort(key=lambda g: (g.reviewed_at, g.review_group_id))
    return groups


def rebuild_mastery(
    db: Session, strategy: MasteryStrategy, user_id: uuid.UUID | None = None
) -> None:
    """Truncates (or delete-scopes) card_field_mastery and replays review_log through
    the same write path apply_rating uses, one appearance at a time, oldest first.
    Because the strategy is a parameter, changing strategies is not a migration — it's
    a rebuild. Slow is fine."""
    db_clear_mastery(db, user_id)
    rows = db_fetch_review_log_for_rebuild(db, user_id)
    for group in _group_review_log_rows(rows):
        apply_rating(db, strategy, group)
    db.commit()
