from sqlalchemy import text
from sqlmodel import Session


def db_ping(db: Session) -> None:
    """Run `SELECT 1` to prove the database answers; commits nothing (ADR 064)."""
    db.execute(text("SELECT 1"))
