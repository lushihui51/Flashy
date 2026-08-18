import uuid

from sqlalchemy.dialects.postgresql import insert
from sqlmodel import Session, select

from app.models.review_log import ReviewLog


def db_insert_review_logs(db: Session, rows: list[dict]) -> None:
    if not rows:
        return
    stmt = insert(ReviewLog).values(rows)
    stmt = stmt.on_conflict_do_nothing(index_elements=["review_group_id", "field_def_id"])
    db.execute(stmt)
    db.commit()


def db_fetch_review_log_for_rebuild(
    db: Session, user_id: uuid.UUID | None = None
) -> list[ReviewLog]:
    """Every row, oldest first — the replay order rebuild_mastery folds through."""
    query = select(ReviewLog).order_by(ReviewLog.reviewed_at)
    if user_id is not None:
        query = query.where(ReviewLog.user_id == user_id)
    return list(db.exec(query).all())
