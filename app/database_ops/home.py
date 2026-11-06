import uuid

from sqlmodel import Session, col, select

from app.models.card import Card
from app.models.deck import Deck
from app.models.deck_practice_config import DeckPracticeConfig
from app.models.home_payloads import HomeSteps
from app.models.subject import Subject


def db_read_home_steps(db: Session, user_id: uuid.UUID) -> HomeSteps:
    """Whether the user has a subject, a deck, a card and a configuration, in one
    statement."""
    decks = select(Deck.id).join(Subject, Subject.id == Deck.subject_id).where(
        Subject.user_id == user_id
    )
    has_subject, has_deck, has_card, has_configuration = db.exec(
        select(
            select(Subject.id).where(Subject.user_id == user_id).exists(),
            decks.exists(),
            select(Card.id).where(col(Card.deck_id).in_(decks)).exists(),
            select(DeckPracticeConfig.id).where(col(DeckPracticeConfig.deck_id).in_(decks)).exists(),
        )
    ).one()
    return HomeSteps(
        has_subject=has_subject,
        has_deck=has_deck,
        has_card=has_card,
        has_configuration=has_configuration,
    )
