from sqlmodel import SQLModel

SQLModel.metadata.naming_convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

from app.models.card import Card
from app.models.deck import Deck
from app.models.deck_config import DeckConfig
from app.models.practice_card import PracticeCard
from app.models.practice_session import PracticeSession
from app.models.practice_session_deck_config import PracticeSessionDeckConfig
from app.models.subject import Subject

__all__ = [
    "Card",
    "Deck",
    "DeckConfig",
    "PracticeCard",
    "PracticeSession",
    "PracticeSessionDeckConfig",
    "Subject",
]
