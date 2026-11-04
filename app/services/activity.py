from sqlmodel import Session

from app.models.base import utcnow
from app.models.card import Card
from app.models.deck import Deck
from app.models.deck_practice_config import DeckPracticeConfig
from app.models.subject import Subject


def touch(db: Session, *rows: Subject | Deck | Card | DeckPracticeConfig) -> None:
    """Bumps `last_activity_at` to now on the given rows (the recency sort key), in the
    current transaction — never a separate commit. The one place this column is ever
    written. Every row must be one this session already loaded: assigning the attribute
    is what marks it dirty, so a detached row would be silently ignored."""
    now = utcnow()
    for row in rows:
        row.last_activity_at = now
