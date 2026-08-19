import uuid

from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from app.models.card import Card
from app.models.card_field_value import CardFieldValue
from app.models.deck import Deck
from app.models.subject import Subject


def _read_card_with_values(db: Session, card_id: uuid.UUID) -> Card | None:
    return db.exec(
        select(Card).where(Card.id == card_id).options(selectinload(Card.values))
    ).first()


def db_create_card(db: Session, deck_id: uuid.UUID, values: dict[uuid.UUID, str]) -> Card:
    card = Card(deck_id=deck_id)
    db.add(card)
    db.flush()
    for field_def_id, value in values.items():
        db.add(CardFieldValue(card_id=card.id, field_def_id=field_def_id, value=value))
    db.commit()
    return _read_card_with_values(db, card.id)


def db_read_card(db: Session, card_id: uuid.UUID, user_id: uuid.UUID) -> Card | None:
    return db.exec(
        select(Card)
        .join(Deck, Deck.id == Card.deck_id)
        .join(Subject, Subject.id == Deck.subject_id)
        .where(Card.id == card_id, Subject.user_id == user_id)
        .options(selectinload(Card.values))
    ).first()


def db_read_card_ids_for_deck(db: Session, deck_id: uuid.UUID) -> list[uuid.UUID]:
    return list(db.exec(select(Card.id).where(Card.deck_id == deck_id)).all())


def db_read_cards_with_values_for_deck(db: Session, deck_id: uuid.UUID) -> list[Card]:
    """Deliberately unscoped — see db_read_deck_for_copy; deck_id is already
    established as valid copy source material by the caller."""
    return list(
        db.exec(
            select(Card)
            .where(Card.deck_id == deck_id)
            .options(selectinload(Card.values))
        ).all()
    )


def db_update_card_values(db: Session, card: Card, values: dict[uuid.UUID, str]) -> Card:
    existing = {v.field_def_id: v for v in card.values}
    for field_def_id, value in values.items():
        if field_def_id in existing:
            existing[field_def_id].value = value
            db.add(existing[field_def_id])
        else:
            db.add(CardFieldValue(card_id=card.id, field_def_id=field_def_id, value=value))
    db.commit()
    return _read_card_with_values(db, card.id)


def db_delete_card(db: Session, card: Card) -> None:
    db.delete(card)
    db.commit()
