import uuid

from sqlmodel import Session, col, select

from app.models.card import Card
from app.models.deck import Deck
from app.models.home_payloads import HomeSteps
from app.models.practice import Practice


def db_read_home_steps(db: Session, user_id: uuid.UUID) -> HomeSteps:
    """Whether the user has a deck and a card, and their newest practice, in one statement."""
    decks = select(Deck.id).where(Deck.user_id == user_id)
    newest_practice = (
        select(Practice.id)
        .where(Practice.user_id == user_id)
        .order_by(col(Practice.created_at).desc(), col(Practice.id).desc())
        .limit(1)
        .scalar_subquery()
    )
    has_deck, has_card, practice_id = db.exec(
        select(
            decks.exists(),
            select(Card.id).where(col(Card.deck_id).in_(decks)).exists(),
            newest_practice,
        )
    ).one()
    return HomeSteps(
        has_deck=has_deck,
        has_card=has_card,
        practice_id=practice_id,
    )
