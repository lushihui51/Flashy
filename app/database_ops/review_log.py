import uuid
from collections.abc import Collection
from datetime import datetime
from enum import Enum

from sqlalchemy import func, text, update
from sqlalchemy.dialects.postgresql import insert
from sqlmodel import Session, col, select

from app.models.card import Card
from app.models.review_log import ReviewLog


class ReviewGroupWriteOutcome(str, Enum):
    new = "new"
    retry = "retry"


class ReviewGroupInconsistent(Exception):
    """Raised when the review_log rows already on record for a review_group_id don't
    match, field-for-field, what's being submitted for it now. Not a routine client
    error — it's a should-never-happen signal that some caller violated the invariant
    mastery math depends on: an appearance must be logged atomically, in one
    transaction, and never appended to afterward. Phase 4's endpoint should map this to
    a 409/500 and log it loudly rather than surface it as an ordinary validation
    failure."""

    def __init__(
        self,
        review_group_id: uuid.UUID,
        existing_field_ids: frozenset[uuid.UUID],
        submitted_field_ids: frozenset[uuid.UUID],
    ):
        self.review_group_id = review_group_id
        self.existing_field_ids = existing_field_ids
        self.submitted_field_ids = submitted_field_ids
        super().__init__(
            f"review_group_id={review_group_id} has fields {sorted(existing_field_ids)} "
            f"on record but this submission has {sorted(submitted_field_ids)} — an "
            "appearance must be logged atomically and never appended to"
        )


def db_read_latest_reviewed_at(db: Session, card_id: uuid.UUID) -> datetime | None:
    """The card's own latest review_log timestamp (`max(reviewed_at)`), served by
    `ix_review_log_card_id_reviewed_at`. record_review_group (ADR 050) reads this
    under the card's advisory lock to keep mastery_log's order strictly increasing
    per card; None for a card with no reviews yet."""
    return db.exec(
        select(func.max(ReviewLog.reviewed_at)).where(ReviewLog.card_id == card_id)
    ).one()


def db_stage_create_review_logs(db: Session, rows: list[dict]) -> None:
    """Idempotent bulk insert — ON CONFLICT DO NOTHING on the (review_group_id,
    field_def_id) key. Does not commit; the caller owns the transaction."""
    if not rows:
        return
    stmt = insert(ReviewLog).values(rows)
    stmt = stmt.on_conflict_do_nothing(index_elements=["review_group_id", "field_def_id"])
    db.execute(stmt)


def db_stage_log_review_group(
    db: Session, review_group_id: uuid.UUID, rows: list[dict]
) -> ReviewGroupWriteOutcome:
    """Logs one appearance's rows, enforcing that a review_group_id is written exactly
    once and never appended to.

    Takes a Postgres advisory lock scoped to review_group_id first (released
    automatically at commit/rollback) so a genuinely concurrent submission for the same
    group serializes behind this check instead of racing it — there's no row to lock
    yet for a brand-new group, hence the advisory lock rather than SELECT ... FOR
    UPDATE.

    Compares the *full* set of field_def_ids already on record against what's being
    submitted, not just whether this particular insert had conflicts: a submission that
    is a subset (or any other mismatch) of what's already logged would show zero
    conflicting rows and look like a clean retry under a naive
    INSERT ... RETURNING row-count check, when it isn't.

    Returns NEW when this review_group_id has never been logged before (the rows are
    written). Returns RETRY, without writing anything, when the exact same set of rated
    fields is already on record for it — see record_review_group's docstring for why
    skipping the mastery write is correct in that case, not a shortcut. Raises
    ReviewGroupInconsistent for anything else.
    """
    db.execute(
        text("SELECT pg_advisory_xact_lock(hashtext(:key))"), {"key": str(review_group_id)}
    )

    submitted_field_ids = frozenset(row["field_def_id"] for row in rows)
    existing_field_ids = frozenset(
        db.exec(
            select(ReviewLog.field_def_id).where(ReviewLog.review_group_id == review_group_id)
        ).all()
    )

    if not existing_field_ids:
        db_stage_create_review_logs(db, rows)
        return ReviewGroupWriteOutcome.new

    if existing_field_ids == submitted_field_ids:
        return ReviewGroupWriteOutcome.retry

    raise ReviewGroupInconsistent(review_group_id, existing_field_ids, submitted_field_ids)


def db_fetch_review_log_for_rebuild(
    db: Session, user_id: uuid.UUID | None = None, deck_id: uuid.UUID | None = None
) -> list[ReviewLog]:
    """Every row, oldest first — the replay order rebuild_mastery and
    rebuild_deck_mastery fold through. review_log.card_id/field_def_id cascade-delete
    with their card/field (ADR 047, ADR 048), so every remaining row is already about
    a live (card, field) pair — no filter needed to establish that. At most one of
    user_id/deck_id is ever passed — a user-wide rebuild and a deck-scoped one are
    different callers, never combined in one call."""
    query = select(ReviewLog).order_by(ReviewLog.reviewed_at)
    if user_id is not None:
        query = query.where(ReviewLog.user_id == user_id)
    if deck_id is not None:
        query = query.where(
            col(ReviewLog.card_id).in_(select(Card.id).where(Card.deck_id == deck_id))
        )
    return list(db.exec(query).all())


def db_stage_scrub_shown_prompt_ids(
    db: Session, deck_id: uuid.UUID, field_ids: Collection[uuid.UUID]
) -> None:
    """Removes each of field_ids from shown_prompt_ids on this deck's own cards' rows
    (ADR 049) — one UPDATE per id, so cost scales with how many fields are being
    deleted, not with how many review_log rows exist. `= ANY (shown_prompt_ids)`
    narrows each UPDATE to rows that actually name the id, the same effect
    array_remove's own "not present, no-op" gives a single row, applied at the query
    level so an id nobody used touches nothing. No commit — apply_deletion (ADR 051)
    owns the transaction."""
    if not field_ids:
        return
    deck_card_ids = select(Card.id).where(Card.deck_id == deck_id)
    for field_id in field_ids:
        db.execute(
            update(ReviewLog)
            .where(
                col(ReviewLog.card_id).in_(deck_card_ids),
                ReviewLog.shown_prompt_ids.any(field_id),
            )
            .values(shown_prompt_ids=func.array_remove(ReviewLog.shown_prompt_ids, field_id))
        )
