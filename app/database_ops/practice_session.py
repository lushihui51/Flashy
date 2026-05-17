import uuid

from sqlmodel import Session

from app.models.practice_session import PracticeSession


def db_create_practice_session(db: Session) -> PracticeSession:
    practice_session = PracticeSession()
    db.add(practice_session)
    db.commit()
    db.refresh(practice_session)
    return practice_session


def db_read_practice_session(
    db: Session, practice_session_id: uuid.UUID
) -> PracticeSession | None:
    return db.get(PracticeSession, practice_session_id)
