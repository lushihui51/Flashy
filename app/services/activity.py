from sqlmodel import Session

from app.models.base import utcnow
from app.models.deck import Deck
from app.models.subject import Subject


def touch(db: Session, *rows: Subject | Deck) -> None:
    """Bumps `last_activity_at` to now on the given rows (D13's sort key), in the
    current transaction — never a separate commit. The one place this column is ever
    written."""
    now = utcnow()
    for row in rows:
        row.last_activity_at = now
        db.add(row)
