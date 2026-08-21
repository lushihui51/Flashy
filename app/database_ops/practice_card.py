import uuid

from sqlmodel import Session, func, select

from app.models.practice_card import PracticeCard, PracticeCardStatus
from app.models.practice_session import PracticeSession


def db_create_practice_card(db: Session, data: dict) -> PracticeCard:
    """Does not commit — see db_create_practice_session."""
    card = PracticeCard(**data)
    db.add(card)
    db.flush()
    return card


def db_read_practice_card(
    db: Session, practice_card_id: uuid.UUID, user_id: uuid.UUID
) -> PracticeCard | None:
    return db.exec(
        select(PracticeCard)
        .join(PracticeSession, PracticeSession.id == PracticeCard.practice_session_id)
        .where(PracticeCard.id == practice_card_id, PracticeSession.user_id == user_id)
    ).first()


def db_read_current_practice_card(
    db: Session, practice_session_id: uuid.UUID, user_id: uuid.UUID
) -> PracticeCard | None:
    """The derived current card — invariant: never stored, always this query."""
    return db.exec(
        select(PracticeCard)
        .join(PracticeSession, PracticeSession.id == PracticeCard.practice_session_id)
        .where(
            PracticeCard.practice_session_id == practice_session_id,
            PracticeSession.user_id == user_id,
            PracticeCard.status == PracticeCardStatus.pending,
        )
        .order_by(PracticeCard.position)
        .limit(1)
    ).first()


def db_read_pending_practice_cards(
    db: Session, practice_session_id: uuid.UUID
) -> list[PracticeCard]:
    return list(
        db.exec(
            select(PracticeCard)
            .where(
                PracticeCard.practice_session_id == practice_session_id,
                PracticeCard.status == PracticeCardStatus.pending,
            )
            .order_by(PracticeCard.position)
        ).all()
    )


def db_renumber_pending_practice_cards(
    db: Session, practice_session_id: uuid.UUID
) -> list[PracticeCard]:
    """Fresh 1000-spaced positions for a session's pending cards, preserving their
    relative order — the position-collision fallback. Starts strictly above the
    session's current max position (across *every* status, not just pending) rather
    than restarting at 0: passed/failed rows keep their old position forever, so
    renumbering from 0 would routinely collide with one of them."""
    cards = db_read_pending_practice_cards(db, practice_session_id)
    max_position = db.exec(
        select(func.max(PracticeCard.position)).where(
            PracticeCard.practice_session_id == practice_session_id
        )
    ).one()
    base = (max_position or 0) + 1000
    for i, card in enumerate(cards):
        card.position = base + i * 1000
        db.add(card)
    db.flush()
    return cards


def db_update_practice_card_status(
    db: Session, card: PracticeCard, status: PracticeCardStatus
) -> PracticeCard:
    card.status = status
    db.add(card)
    db.flush()
    return card
