import uuid

from sqlmodel import Session, select

from app.models.practice_deck import PracticeDeck


def db_create_practice_deck(db: Session, data: dict) -> PracticeDeck:
    """Does not commit — see db_create_practice_session."""
    practice_deck = PracticeDeck(**data)
    db.add(practice_deck)
    db.flush()
    return practice_deck


def db_read_practice_deck_for_deck(
    db: Session, practice_session_id: uuid.UUID, deck_id: uuid.UUID
) -> PracticeDeck | None:
    return db.exec(
        select(PracticeDeck).where(
            PracticeDeck.practice_session_id == practice_session_id,
            PracticeDeck.deck_id == deck_id,
        )
    ).first()
