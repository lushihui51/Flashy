import uuid
from collections.abc import Collection

from sqlalchemy import delete, func
from sqlalchemy.orm import selectinload
from sqlmodel import Session, col, select

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


def db_read_cards_for_deck(db: Session, deck_id: uuid.UUID, user_id: uuid.UUID) -> list[Card]:
    return list(
        db.exec(
            select(Card)
            .join(Deck, Deck.id == Card.deck_id)
            .join(Subject, Subject.id == Deck.subject_id)
            .where(Card.deck_id == deck_id, Subject.user_id == user_id)
            .options(selectinload(Card.values))
        ).all()
    )


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


def db_read_owned_card_ids(
    db: Session, user_id: uuid.UUID, ids: Collection[uuid.UUID]
) -> set[uuid.UUID]:
    """The subset of `ids` that exist and belong to user_id (via the subject chain) —
    compute_deletion_impact's ownership check (ADR 051 step 1)."""
    if not ids:
        return set()
    return set(
        db.exec(
            select(Card.id)
            .join(Deck, Deck.id == Card.deck_id)
            .join(Subject, Subject.id == Deck.subject_id)
            .where(col(Card.id).in_(ids), Subject.user_id == user_id)
        ).all()
    )


def db_read_card_ids_for_decks(db: Session, deck_ids: Collection[uuid.UUID]) -> set[uuid.UUID]:
    """Every card of these decks — ADR 051 step 5's ∪ cards-of-decks. Plural
    counterpart to db_read_card_ids_for_deck, which single-deck callers keep using."""
    if not deck_ids:
        return set()
    return set(db.exec(select(Card.id).where(col(Card.deck_id).in_(deck_ids))).all())


def db_count_cards_for_decks(
    db: Session, deck_ids: Collection[uuid.UUID], excluding: Collection[uuid.UUID]
) -> int:
    """How many cards on these decks are not already in `excluding` — ADR 051 step 8's
    affected_card_count: cards a field delete shrinks but doesn't remove."""
    if not deck_ids:
        return 0
    query = select(func.count()).select_from(Card).where(col(Card.deck_id).in_(deck_ids))
    if excluding:
        query = query.where(col(Card.id).not_in(excluding))
    return db.exec(query).one()


def db_delete_cards(db: Session, ids: Collection[uuid.UUID]) -> None:
    """Bulk delete by id, no commit — apply_deletion (ADR 051) owns the transaction."""
    if not ids:
        return
    db.execute(delete(Card).where(col(Card.id).in_(ids)))
