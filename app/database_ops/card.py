import uuid
from typing import Any

from sqlmodel import select

from app.database import Session
from app.models.card import Card


def db_create_card(db: Session, deck_id: uuid.UUID, fields: dict[str, Any]) -> Card:
    new_card = Card(deck_id=deck_id, fields=fields)
    db.add(new_card)
    db.commit()
    db.refresh(new_card)
    return new_card


def db_read_card(db: Session, card_id: uuid.UUID) -> Card | None:
    return db.get(Card, card_id)


def db_read_all_cards(db: Session) -> list[Card]:
    cards = db.exec(select(Card)).all()
    return list(cards)


def db_update_card(db: Session, card: Card, payload: dict[str, Any]) -> Card:
    for key, value in payload.items():
        setattr(card, key, value)
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


def db_delete_card(db: Session, card: Card) -> None:
    db.delete(card)
    db.commit()
