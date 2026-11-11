import uuid

from sqlmodel import Session, col, select

from app.models.card import Card
from app.models.deck import Deck
from app.models.home_payloads import HomeSteps


def db_read_home_steps(db: Session, user_id: uuid.UUID) -> HomeSteps:
    """Whether the user has a deck and a card, in one statement."""
    decks = select(Deck.id).where(Deck.user_id == user_id)
    has_deck, has_card = db.exec(
        select(
            decks.exists(),
            select(Card.id).where(col(Card.deck_id).in_(decks)).exists(),
        )
    ).one()
    return HomeSteps(
        has_deck=has_deck,
        has_card=has_card,
    )
