import uuid

from sqlmodel import Session

from app.models.practice_session_deck_config import PracticeSessionDeckConfig


def db_create_practice_session_deck_config(
    db: Session, practice_session_id: uuid.UUID, deck_config_id: uuid.UUID
) -> PracticeSessionDeckConfig:
    practice_session_deck_config = PracticeSessionDeckConfig(
        practice_session_id=practice_session_id, deck_config_id=deck_config_id
    )
    db.add(practice_session_deck_config)
    db.commit()
    db.refresh(practice_session_deck_config)
    return practice_session_deck_config
