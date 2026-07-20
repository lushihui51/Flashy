import uuid
from typing import List, Tuple

from sqlmodel import Session, col, func, select

from app.models.card import Card
from app.models.deck import Deck


def db_create_deck(
    db: Session, name: str, subject_id: uuid.UUID, deck_schema: dict[str, str]
) -> Deck:
    new_deck = Deck(name=name, subject_id=subject_id, deck_schema=deck_schema)
    db.add(new_deck)
    db.commit()
    db.refresh(new_deck)
    return new_deck


def db_read_deck(db: Session, deck_id: uuid.UUID) -> Deck | None:
    return db.get(Deck, deck_id)


def db_read_deck_card_count(db: Session, deck_id: uuid.UUID) -> int:
    return db.exec(
        select(func.count(col(Card.id))).where(Card.deck_id == deck_id)
    ).one()


def db_read_all_decks(db: Session) -> list[Deck]:
    decks = db.exec(select(Deck)).all()
    return list(decks)


def db_read_decks(db: Session) -> List[Tuple[Deck, int]]:
    card_count = (
        select(func.count(col(Card.id)))
        .where(Card.deck_id == Deck.id)
        .correlate(Deck)
        .scalar_subquery()
        .label("card_count")
    )
    rows = db.exec(select(Deck, card_count)).all()
    return list(rows)


def db_update_deck(db: Session, deck: Deck, payload: dict) -> Deck:
    for key, value in payload.items():
        setattr(deck, key, value)
    db.add(deck)
    db.commit()
    db.refresh(deck)
    return deck


def db_delete_deck(db: Session, deck: Deck) -> None:
    db.delete(deck)
    db.commit()
