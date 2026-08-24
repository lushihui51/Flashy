import uuid

from sqlmodel import Session, select

from app.models.practice_session import PracticeSession, SessionStatus


def db_create_practice_session(db: Session, user_id: uuid.UUID) -> PracticeSession:
    """Does not commit — the caller owns the transaction (session start is one
    explicit transaction: the session, its practice_decks, and its practice_cards)."""
    session = PracticeSession(user_id=user_id)
    db.add(session)
    db.flush()
    return session


def db_read_practice_session(
    db: Session, practice_session_id: uuid.UUID, user_id: uuid.UUID
) -> PracticeSession | None:
    return db.exec(
        select(PracticeSession).where(
            PracticeSession.id == practice_session_id, PracticeSession.user_id == user_id
        )
    ).first()


def db_update_practice_session_status(
    db: Session, session: PracticeSession, status: SessionStatus
) -> PracticeSession:
    session.status = status
    db.add(session)
    db.commit()
    db.refresh(session)
    return session
