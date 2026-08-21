import uuid
from datetime import datetime

from sqlalchemy import Row, delete
from sqlalchemy.dialects.postgresql import insert
from sqlmodel import Session, col, select

from app.mastery.types import FieldMasteryState
from app.models.card import Card
from app.models.card_field_mastery import CardFieldMastery
from app.models.deck import Deck
from app.models.field_def import FieldDef
from app.models.subject import Subject

# Invariant 8: this module fetches and writes state; it never computes it. Every value
# written below is already-computed Python data handed in by a MasteryStrategy — no
# blending, scoring, or aggregation expression appears in any statement here.


def db_fetch_mastery_states_for_update(
    db: Session, card_id: uuid.UUID, field_def_ids: list[uuid.UUID]
) -> dict[uuid.UUID, FieldMasteryState]:
    """Row-locks the mastery rows for this card's affected fields. Missing rows are
    simply absent from the returned dict — invariant 4, lazy creation."""
    if not field_def_ids:
        return {}
    rows = db.exec(
        select(CardFieldMastery)
        .where(
            CardFieldMastery.card_id == card_id,
            col(CardFieldMastery.field_def_id).in_(field_def_ids),
        )
        .with_for_update()
    ).all()
    return {
        row.field_def_id: FieldMasteryState(
            prompt_mastery=row.prompt_mastery,
            answer_mastery=row.answer_mastery,
            prompt_review_count=row.prompt_review_count,
            answer_review_count=row.answer_review_count,
        )
        for row in rows
    }


def db_upsert_mastery_states(
    db: Session,
    card_id: uuid.UUID,
    states: dict[uuid.UUID, FieldMasteryState],
    updated_at: datetime,
) -> None:
    """Writes computed values only. No `SET x = <expression>` — the incoming states are
    already the strategy's output; this just persists them."""
    if not states:
        return
    rows = [
        {
            "card_id": card_id,
            "field_def_id": field_def_id,
            "prompt_mastery": state.prompt_mastery,
            "answer_mastery": state.answer_mastery,
            "prompt_review_count": state.prompt_review_count,
            "answer_review_count": state.answer_review_count,
            "updated_at": updated_at,
        }
        for field_def_id, state in states.items()
    ]
    stmt = insert(CardFieldMastery).values(rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=["card_id", "field_def_id"],
        set_={
            "prompt_mastery": stmt.excluded.prompt_mastery,
            "answer_mastery": stmt.excluded.answer_mastery,
            "prompt_review_count": stmt.excluded.prompt_review_count,
            "answer_review_count": stmt.excluded.answer_review_count,
            "updated_at": stmt.excluded.updated_at,
        },
    )
    db.execute(stmt)


def db_fetch_mastery_read_rows(
    db: Session, card_ids: list[uuid.UUID], field_def_ids: list[uuid.UUID] | None = None
) -> list[Row]:
    """Raw material for card_mastery/deck_mastery. Drives from field_def (invariant 4):
    one row per (card, active field def), mastery columns NULL when never reviewed.
    Purely a fetch — no scoring or aggregation happens here; the caller folds scores in
    Python via the strategy."""
    if not card_ids:
        return []
    query = (
        select(
            Card.id.label("card_id"),
            Card.deck_id.label("deck_id"),
            FieldDef.id.label("field_def_id"),
            CardFieldMastery.prompt_mastery,
            CardFieldMastery.answer_mastery,
            CardFieldMastery.prompt_review_count,
            CardFieldMastery.answer_review_count,
        )
        .select_from(Card)
        .join(
            FieldDef,
            (FieldDef.deck_id == Card.deck_id) & (col(FieldDef.archived_at).is_(None)),
        )
        .outerjoin(
            CardFieldMastery,
            (CardFieldMastery.card_id == Card.id)
            & (CardFieldMastery.field_def_id == FieldDef.id),
        )
        .where(col(Card.id).in_(card_ids))
    )
    if field_def_ids is not None:
        query = query.where(col(FieldDef.id).in_(field_def_ids))
    return list(db.exec(query).all())


def db_clear_mastery(db: Session, user_id: uuid.UUID | None = None) -> None:
    """Delete-scoped clear for rebuild_mastery. user_id=None clears every row; otherwise
    only rows for cards owned (via deck -> subject) by that user."""
    if user_id is None:
        db.execute(delete(CardFieldMastery))
        return
    owned_card_ids = (
        select(Card.id)
        .join(Deck, Deck.id == Card.deck_id)
        .join(Subject, Subject.id == Deck.subject_id)
        .where(Subject.user_id == user_id)
    )
    db.execute(delete(CardFieldMastery).where(col(CardFieldMastery.card_id).in_(owned_card_ids)))
