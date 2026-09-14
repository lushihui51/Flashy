import uuid
from datetime import datetime

from sqlalchemy import BigInteger, Row, Uuid, column, delete, desc, insert, values
from sqlmodel import Session, col, select

from app.mastery.types import FieldMasteryState
from app.models.card import Card
from app.models.deck import Deck
from app.models.field_def import FieldDef
from app.models.mastery_log import MasteryLog
from app.models.subject import Subject

# Invariant 8: this module fetches and writes state; it never computes it. Every value
# written below is already-computed Python data handed in by a MasteryStrategy — no
# blending, scoring, or aggregation expression appears in any statement here.


def db_fetch_latest_mastery_states(
    db: Session, card_id: uuid.UUID, field_def_ids: list[uuid.UUID]
) -> dict[uuid.UUID, FieldMasteryState]:
    """Latest row per (card, field) among this card's affected fields — DISTINCT ON,
    ordered by id descending (the ledger's total order, not reviewed_at). No FOR
    UPDATE: apply_rating's caller takes a per-card advisory lock instead, since
    append-only rows have nothing for a row lock to serialize against. Missing rows
    are simply absent from the returned dict — invariant 4, lazy creation."""
    if not field_def_ids:
        return {}
    rows = db.exec(
        select(MasteryLog)
        .where(
            MasteryLog.card_id == card_id,
            col(MasteryLog.field_def_id).in_(field_def_ids),
        )
        .distinct(MasteryLog.field_def_id)
        .order_by(MasteryLog.field_def_id, desc(MasteryLog.id))
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


def db_append_mastery_log(
    db: Session,
    card_id: uuid.UUID,
    states: dict[uuid.UUID, FieldMasteryState],
    reviewed_at: datetime,
    practice_run_id: uuid.UUID | None,
) -> None:
    """Writes computed values only. No `SET x = <expression>` — the incoming states are
    already the strategy's output; this just appends them. Plain bulk INSERT — the
    ledger is append-only, so there's nothing to upsert."""
    if not states:
        return
    rows = [
        {
            "card_id": card_id,
            "field_def_id": field_def_id,
            "practice_run_id": practice_run_id,
            "prompt_mastery": state.prompt_mastery,
            "answer_mastery": state.answer_mastery,
            "prompt_review_count": state.prompt_review_count,
            "answer_review_count": state.answer_review_count,
            "reviewed_at": reviewed_at,
        }
        for field_def_id, state in states.items()
    ]
    db.execute(insert(MasteryLog).values(rows))


def db_fetch_mastery_read_rows(
    db: Session, card_ids: list[uuid.UUID], field_def_ids: list[uuid.UUID] | None = None
) -> list[Row]:
    """Raw material for card_mastery/deck_mastery. Drives from field_def (invariant 4):
    one row per (card, active field def), mastery columns NULL when never reviewed.
    Purely a fetch — no scoring or aggregation happens here; the caller folds scores in
    Python via the strategy.

    The old single-row-per-pair cache table's outerjoin becomes an outerjoin to a
    DISTINCT ON subquery of mastery_log's latest row per (card, field), bounded to
    the requested card_ids — one statement, never a history replay."""
    if not card_ids:
        return []
    latest_query = select(
        MasteryLog.card_id,
        MasteryLog.field_def_id,
        MasteryLog.prompt_mastery,
        MasteryLog.answer_mastery,
        MasteryLog.prompt_review_count,
        MasteryLog.answer_review_count,
    ).where(col(MasteryLog.card_id).in_(card_ids))
    if field_def_ids is not None:
        latest_query = latest_query.where(col(MasteryLog.field_def_id).in_(field_def_ids))
    latest_mastery = (
        latest_query.distinct(MasteryLog.card_id, MasteryLog.field_def_id)
        .order_by(MasteryLog.card_id, MasteryLog.field_def_id, desc(MasteryLog.id))
        .subquery()
    )

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
        .join(
            FieldDef,
            (FieldDef.deck_id == Card.deck_id) & (col(FieldDef.archived_at).is_(None)),
        )
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


def db_fetch_run_mastery_log_rows(db: Session, practice_run_id: uuid.UUID) -> list[MasteryLog]:
    """Every mastery_log row attributed to this run — one statement (`ix_mastery_log_run`),
    used by the breakdown's delta computation (task 010 T3, ADR 042/043, 010 MD-4) to
    find each (card, field) pair this run itself touched and, among those, its own
    first and last row. `id` ascending (the ledger's total order) so callers reading
    min/max per pair don't need to re-sort."""
    return list(
        db.exec(
            select(MasteryLog)
            .where(MasteryLog.practice_run_id == practice_run_id)
            .order_by(MasteryLog.id)
        ).all()
    )


def db_fetch_mastery_before_bound(
    db: Session, bounds: list[tuple[uuid.UUID, uuid.UUID, int]]
) -> dict[tuple[uuid.UUID, uuid.UUID], FieldMasteryState]:
    """The breakdown's per-pair 'before' lookup (task 010 T3, ADR 042/043, 010 MD-4):
    one statement for every (card_id, field_def_id, bound) triple in `bounds`,
    regardless of how many there are — a VALUES relation of each pair's own bound id,
    inner-joined to mastery_log on (card_id, field_def_id, id < bound) and reduced to
    one row per pair with DISTINCT ON, ordered by id descending. The join predicate is
    covered by `ix_mastery_log_card_field (card_id, field_def_id, id)`: an index
    range scan per pair, never a scan of a pair's full history. A pair with no row
    below its bound contributes nothing to an inner join, so it's simply absent from
    the returned dict — the caller's contract for 'never reviewed as of that point'."""
    if not bounds:
        return {}
    bounds_values = values(
        column("card_id", Uuid),
        column("field_def_id", Uuid),
        column("bound", BigInteger),
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
            & (MasteryLog.id < bounds_values.c.bound),
        )
        .distinct(bounds_values.c.card_id, bounds_values.c.field_def_id)
        .order_by(bounds_values.c.card_id, bounds_values.c.field_def_id, desc(MasteryLog.id))
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


def db_clear_mastery(db: Session, user_id: uuid.UUID | None = None) -> None:
    """Delete-scoped clear for rebuild_mastery. user_id=None clears every row; otherwise
    only rows for cards owned (via deck -> subject) by that user."""
    if user_id is None:
        db.execute(delete(MasteryLog))
        return
    owned_card_ids = (
        select(Card.id)
        .join(Deck, Deck.id == Card.deck_id)
        .join(Subject, Subject.id == Deck.subject_id)
        .where(Subject.user_id == user_id)
    )
    db.execute(delete(MasteryLog).where(col(MasteryLog.card_id).in_(owned_card_ids)))
