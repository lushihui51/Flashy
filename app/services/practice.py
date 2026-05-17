import uuid
from typing import List

from sqlmodel import Session

from app.database_ops.deck_config import db_read_deck_config
from app.database_ops.practice_card import db_create_practice_cards
from app.database_ops.practice_session import db_create_practice_session
from app.database_ops.practice_session_deck_config import (
    db_create_practice_session_deck_config,
)
from app.models.practice_session import PracticeSession


def create_practice_session_from_configs(
    db: Session, deck_config_ids: List[uuid.UUID]
) -> PracticeSession:
    deck_configs = []
    for deck_config_id in deck_config_ids:
        deck_configs.append(db_read_deck_config(db, deck_config_id))

    practice_session = db_create_practice_session(db)
    for deck_config in deck_configs:
        db_create_practice_session_deck_config(db, practice_session.id, deck_config.id)
        db_create_practice_cards(db, deck_config, practice_session.id)

    return practice_session
