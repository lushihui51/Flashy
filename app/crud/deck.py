import uuid

from sqlmodel import Session

from app.models.deck import Deck


def db_create_deck(db: Session, name: str, subject_id: uuid.UUID) -> Deck:
    new_deck = Deck(name=name, subject_id=subject_id)
    db.add(new_deck)
    db.commit()
    db.refresh(new_deck)
    return new_deck


def db_read_deck(db: Session, deck_id: uuid.UUID) -> Deck | None:
    return db.get(Deck, deck_id)


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
