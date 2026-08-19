import uuid

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.models.deck import Deck
from app.models.subject import Subject


def db_create_deck(db: Session, data: dict) -> Deck:
    deck = Deck(**data)
    db.add(deck)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError("Deck with this name already exists in this subject") from None
    db.refresh(deck)
    return deck


def db_read_deck(db: Session, deck_id: uuid.UUID, user_id: uuid.UUID) -> Deck | None:
    return db.exec(
        select(Deck)
        .join(Subject, Subject.id == Deck.subject_id)
        .where(Deck.id == deck_id, Subject.user_id == user_id)
    ).first()


def db_read_deck_for_copy(db: Session, deck_id: uuid.UUID) -> Deck | None:
    """Deliberately unscoped — Phase 6's copy_deck reads the source deck as raw copy
    material, not as the caller's own data (invariant 7 protects the latter). Whether
    the caller may copy from this particular source is a question for whatever
    authorizes the call (a future share-link check), not this fetch."""
    return db.get(Deck, deck_id)


def db_read_decks(
    db: Session, user_id: uuid.UUID, subject_id: uuid.UUID | None = None
) -> list[Deck]:
    query = (
        select(Deck)
        .join(Subject, Subject.id == Deck.subject_id)
        .where(Subject.user_id == user_id)
    )
    if subject_id is not None:
        query = query.where(Deck.subject_id == subject_id)
    return list(db.exec(query).all())


def db_update_deck(db: Session, deck: Deck, data: dict) -> Deck:
    for key, value in data.items():
        setattr(deck, key, value)
    db.add(deck)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError("Deck with this name already exists in this subject") from None
    db.refresh(deck)
    return deck


def db_delete_deck(db: Session, deck: Deck) -> None:
    db.delete(deck)
    db.commit()
