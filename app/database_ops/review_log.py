import uuid
from enum import Enum

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert
from sqlmodel import Session, select

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


def db_insert_review_logs(db: Session, rows: list[dict]) -> None:
    """Idempotent bulk insert — ON CONFLICT DO NOTHING on the (review_group_id,
    field_def_id) key. Does not commit; the caller owns the transaction."""
    if not rows:
        return
    stmt = insert(ReviewLog).values(rows)
    stmt = stmt.on_conflict_do_nothing(index_elements=["review_group_id", "field_def_id"])
    db.execute(stmt)


def db_log_review_group(
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
        db_insert_review_logs(db, rows)
        return ReviewGroupWriteOutcome.new

    if existing_field_ids == submitted_field_ids:
        return ReviewGroupWriteOutcome.retry

    raise ReviewGroupInconsistent(review_group_id, existing_field_ids, submitted_field_ids)


def db_fetch_review_log_for_rebuild(
    db: Session, user_id: uuid.UUID | None = None
) -> list[ReviewLog]:
    """Every row, oldest first — the replay order rebuild_mastery folds through."""
    query = select(ReviewLog).order_by(ReviewLog.reviewed_at)
    if user_id is not None:
        query = query.where(ReviewLog.user_id == user_id)
    return list(db.exec(query).all())
