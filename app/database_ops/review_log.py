from sqlalchemy.dialects.postgresql import insert
from sqlmodel import Session

from app.models.review_log import ReviewLog


def db_insert_review_logs(db: Session, rows: list[dict]) -> None:
    if not rows:
        return
    stmt = insert(ReviewLog).values(rows)
    stmt = stmt.on_conflict_do_nothing(index_elements=["review_group_id", "field_def_id"])
    db.execute(stmt)
    db.commit()
