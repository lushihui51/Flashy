import uuid
from typing import Any

from app.database import SessionDep
from app.models.card import Card


def db_create_card(db: SessionDep, deck_id: uuid.UUID, fields: dict[str, Any]) -> Card:
    new_card = Card(deck_id=deck_id, fields=fields)
    db.add(new_card)
    db.commit()
    db.refresh(new_card)
    return new_card


def db_get_card(db: SessionDep, card_id: uuid.UUID) -> Card | None:
    return db.get(Card, card_id)


def db_update_card(db: SessionDep, card: Card, payload: dict[str, Any]) -> Card:
    for key, value in payload.items():
        setattr(card, key, value)
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


def db_delete_card(db: SessionDep, card: Card) -> None:
    db.delete(card)
    db.commit()
