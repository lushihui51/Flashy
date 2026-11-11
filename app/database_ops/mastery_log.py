import uuid
from datetime import datetime

from sqlalchemy import (
    ColumnElement,
    DateTime,
    Row,
    Subquery,
    Uuid,
    column,
    delete,
    desc,
    insert,
    text,
    values,
)
from sqlalchemy.orm import InstrumentedAttribute
from sqlmodel import Session, col, select

from app.mastery.types import FieldMasteryState
from app.models.card import Card
from app.models.deck import Deck
from app.models.field_def import FieldDef
from app.models.mastery_log import MasteryLog

# This module fetches and writes state; it never computes it. Every value
# written below is already-computed Python data handed in by a MasteryStrategy — no
# blending, scoring, or aggregation expression appears in any statement here.


def db_lock_card(db: Session, card_id: uuid.UUID) -> None:
    """Takes the per-card transaction-scoped advisory lock that serializes every
    read-modify-append of a card's ledger: released at commit or rollback, never
    explicitly. Carries no prefix because it writes nothing."""
    db.execute(text("SELECT pg_advisory_xact_lock(hashtext(:key))"), {"key": str(card_id)})


def db_fetch_latest_mastery_states(
    db: Session, card_id: uuid.UUID, field_def_ids: list[uuid.UUID]
) -> dict[uuid.UUID, FieldMasteryState]:
    """Latest row per (card, field) among this card's affected fields — DISTINCT ON,
    ordered by reviewed_at descending (the ledger's order). No FOR UPDATE:
    apply_rating takes the per-card advisory lock (db_lock_card) instead, since
    append-only rows have nothing for a row lock to serialize against. Missing rows are
    simply absent from the returned dict: a missing row means never reviewed."""
    if not field_def_ids:
        return {}
    rows = db.exec(
        select(MasteryLog)
        .where(
            MasteryLog.card_id == card_id,
            col(MasteryLog.field_def_id).in_(field_def_ids),
        )
        .distinct(MasteryLog.field_def_id)
        .order_by(MasteryLog.field_def_id, desc(MasteryLog.reviewed_at))
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


def db_stage_append_mastery_log(
    db: Session,
    card_id: uuid.UUID,
    states: dict[uuid.UUID, FieldMasteryState],
    reviewed_at: datetime,
    review_group_id: uuid.UUID,
    run_id: uuid.UUID | None,
) -> None:
    """Writes computed values only. No `SET x = <expression>` — the incoming states are
    already the strategy's output; this just appends them. Plain bulk INSERT — the
    ledger is append-only, so there's nothing to upsert. `id` is supplied here
    (a uuid that identifies the row and orders nothing) since the column has
    no server default; `review_group_id` is provenance only, carried on every row of
    the appearance that produced it."""
    if not states:
        return
    rows = [
        {
            "id": uuid.uuid4(),
            "card_id": card_id,
            "field_def_id": field_def_id,
            "run_id": run_id,
            "review_group_id": review_group_id,
            "prompt_mastery": state.prompt_mastery,
            "answer_mastery": state.answer_mastery,
            "prompt_review_count": state.prompt_review_count,
            "answer_review_count": state.answer_review_count,
            "reviewed_at": reviewed_at,
        }
        for field_def_id, state in states.items()
    ]
    db.execute(insert(MasteryLog).values(rows))


def _latest_mastery_subquery(*conditions: ColumnElement[bool]) -> Subquery:
    """mastery_log's latest row per (card, field) among the rows `conditions` select."""
    return (
        select(
            MasteryLog.card_id,
            MasteryLog.field_def_id,
            MasteryLog.prompt_mastery,
            MasteryLog.answer_mastery,
            MasteryLog.prompt_review_count,
            MasteryLog.answer_review_count,
        )
        .where(*conditions)
        .distinct(MasteryLog.card_id, MasteryLog.field_def_id)
        .order_by(MasteryLog.card_id, MasteryLog.field_def_id, desc(MasteryLog.reviewed_at))
        .subquery()
    )


def db_fetch_mastery_read_rows(
    db: Session, card_ids: list[uuid.UUID], field_def_ids: list[uuid.UUID] | None = None
) -> list[Row]:
    """Raw material for card_readiness. Drives from field_def:
    one row per (card, active field def), mastery columns NULL when never reviewed.
    Purely a fetch — no scoring or aggregation happens here; the caller folds scores in
    Python via the strategy.

    field_def is outer-joined to a DISTINCT ON subquery of mastery_log's latest row
    per (card, field), bounded to the requested card_ids — one statement, never a
    history replay."""
    if not card_ids:
        return []
    conditions = [col(MasteryLog.card_id).in_(card_ids)]
    if field_def_ids is not None:
        conditions.append(col(MasteryLog.field_def_id).in_(field_def_ids))
    latest_mastery = _latest_mastery_subquery(*conditions)

    query = (
        select(
            Card.id.label("card_id"),
            Card.deck_id.label("deck_id"),
            FieldDef.id.label("field_def_id"),
            latest_mastery.c.prompt_mastery,
            latest_mastery.c.answer_mastery,
            latest_mastery.c.prompt_review_count,
            latest_mastery.c.answer_review_count,
        )
        .select_from(Card)
        .join(FieldDef, FieldDef.deck_id == Card.deck_id)
        .outerjoin(
            latest_mastery,
            (latest_mastery.c.card_id == Card.id)
            & (latest_mastery.c.field_def_id == FieldDef.id),
        )
        .where(col(Card.id).in_(card_ids))
    )
    if field_def_ids is not None:
        query = query.where(col(FieldDef.id).in_(field_def_ids))
    return list(db.exec(query).all())


def _fetch_collection_mastery_read_rows(
    db: Session, owner_id: InstrumentedAttribute[uuid.UUID], owner_ids: list[uuid.UUID]
) -> list[Row]:
    if not owner_ids:
        return []
    owned_card_ids = (
        select(Card.id).join(Deck, Deck.id == Card.deck_id).where(col(owner_id).in_(owner_ids))
    )
    latest_mastery = _latest_mastery_subquery(col(MasteryLog.card_id).in_(owned_card_ids))
    query = (
        select(
            owner_id.label("owner_id"),
            Card.id.label("card_id"),
            FieldDef.id.label("field_def_id"),
            latest_mastery.c.prompt_mastery,
            latest_mastery.c.answer_mastery,
            latest_mastery.c.prompt_review_count,
            latest_mastery.c.answer_review_count,
        )
        .select_from(Card)
        .join(Deck, Deck.id == Card.deck_id)
        .join(FieldDef, FieldDef.deck_id == Card.deck_id)
        .outerjoin(
            latest_mastery,
            (latest_mastery.c.card_id == Card.id)
            & (latest_mastery.c.field_def_id == FieldDef.id),
        )
        .where(col(owner_id).in_(owner_ids))
    )
    return list(db.exec(query).all())


def db_fetch_deck_mastery_read_rows(db: Session, deck_ids: list[uuid.UUID]) -> list[Row]:
    """Raw material for deck_readiness: one row per (card, field of its deck) over these
    decks, `owner_id` being the deck's id and the mastery columns NULL when never
    reviewed. A deck with no card has no row. One statement whatever the count."""
    return _fetch_collection_mastery_read_rows(db, Deck.id, deck_ids)


def db_fetch_run_mastery_log_rows(db: Session, run_id: uuid.UUID) -> list[MasteryLog]:
    """Every mastery_log row attributed to this run — one statement (`ix_mastery_log_run`),
    used by the breakdown's delta computation to find each (card, field) pair this
    run itself touched and, among those, its own first and last row. `reviewed_at`
    ascending (the ledger's order) so callers reading min/max per pair don't need to
    re-sort."""
    return list(
        db.exec(
            select(MasteryLog)
            .where(MasteryLog.run_id == run_id)
            .order_by(MasteryLog.reviewed_at)
        ).all()
    )


def db_fetch_mastery_before_bound(
    db: Session, bounds: list[tuple[uuid.UUID, uuid.UUID, datetime]]
) -> dict[tuple[uuid.UUID, uuid.UUID], FieldMasteryState]:
    """The breakdown's per-pair 'before' lookup: one statement for every (card_id, field_def_id,
    bound_reviewed_at) triple in `bounds`, regardless of how many there are — a
    VALUES relation of each pair's own bound timestamp, inner-joined to mastery_log on
    (card_id, field_def_id, reviewed_at < bound_reviewed_at) and reduced to one row
    per pair with DISTINCT ON, ordered by reviewed_at descending. The join predicate is
    covered by the `uq_mastery_log_card_field_reviewed` unique constraint's backing
    index (card_id, field_def_id, reviewed_at): an index range scan per pair, never a
    scan of a pair's full history. A pair with no row below its bound contributes
    nothing to an inner join, so it's simply absent from the returned dict — the
    caller's contract for 'never reviewed as of that point'."""
    if not bounds:
        return {}
    bounds_values = values(
        column("card_id", Uuid),
        column("field_def_id", Uuid),
        column("bound_reviewed_at", DateTime(timezone=True)),
        name="bounds",
    ).data(bounds)
    query = (
        select(
            bounds_values.c.card_id,
            bounds_values.c.field_def_id,
            MasteryLog.prompt_mastery,
            MasteryLog.answer_mastery,
            MasteryLog.prompt_review_count,
            MasteryLog.answer_review_count,
        )
        .select_from(bounds_values)
        .join(
            MasteryLog,
            (MasteryLog.card_id == bounds_values.c.card_id)
            & (MasteryLog.field_def_id == bounds_values.c.field_def_id)
            & (MasteryLog.reviewed_at < bounds_values.c.bound_reviewed_at),
        )
        .distinct(bounds_values.c.card_id, bounds_values.c.field_def_id)
        .order_by(
            bounds_values.c.card_id,
            bounds_values.c.field_def_id,
            desc(MasteryLog.reviewed_at),
        )
    )
    rows = db.exec(query).all()
    return {
        (row.card_id, row.field_def_id): FieldMasteryState(
            prompt_mastery=row.prompt_mastery,
            answer_mastery=row.answer_mastery,
            prompt_review_count=row.prompt_review_count,
            answer_review_count=row.answer_review_count,
        )
        for row in rows
    }


def db_stage_clear_mastery(db: Session, user_id: uuid.UUID | None = None) -> None:
    """Delete-scoped clear for rebuild_mastery. user_id=None clears every row; otherwise
    only rows for cards owned (via their deck) by that user."""
    if user_id is None:
        db.execute(delete(MasteryLog))
        return
    owned_card_ids = (
        select(Card.id)
        .join(Deck, Deck.id == Card.deck_id)
        .where(Deck.user_id == user_id)
    )
    db.execute(delete(MasteryLog).where(col(MasteryLog.card_id).in_(owned_card_ids)))


def db_stage_clear_mastery_for_deck(db: Session, deck_id: uuid.UUID) -> None:
    """Delete-scoped clear for rebuild_deck_mastery: only rows for cards
    belonging to this one deck — every other deck's rows, and their ids, are
    untouched."""
    deck_card_ids = select(Card.id).where(Card.deck_id == deck_id)
    db.execute(delete(MasteryLog).where(col(MasteryLog.card_id).in_(deck_card_ids)))
