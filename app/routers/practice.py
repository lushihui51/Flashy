import uuid

from fastapi import APIRouter, HTTPException

from app.database import SessionDep
from app.database_ops.deck_config import db_read_deck_config
from app.database_ops.practice_card import (
    db_create_practice_cards,
    db_read_practice_card,
)
from app.database_ops.practice_session import (
    db_create_practice_session,
    db_read_practice_session,
)
from app.database_ops.practice_session_deck_config import (
    db_create_practice_session_deck_config,
)
from app.models.practice_card import PracticeCardRead
from app.models.practice_session import PracticeSessionCreate, PracticeSessionRead

router = APIRouter(prefix="/practice", tags=["Practice"])


@router.post("/", response_model=PracticeSessionRead, status_code=201)
def create_practice_session(db: SessionDep, payload: PracticeSessionCreate):
    deck_configs = []
    for deck_config_id in payload.deck_config_ids:
        deck_configs.append(db_read_deck_config(db, deck_config_id))

    practice_session = db_create_practice_session(db)
    for deck_config in deck_configs:
        db_create_practice_session_deck_config(db, practice_session.id, deck_config.id)
        db_create_practice_cards(db, deck_config, practice_session.id)

    return PracticeSessionRead.model_validate(practice_session)


@router.get(
    "/{practice_session_id}", response_model=PracticeSessionRead, status_code=200
)
def read_practice_session(db: SessionDep, practice_session_id: uuid.UUID):
    practice_session = db_read_practice_session(db, practice_session_id)
    if not practice_session:
        raise HTTPException(status_code=404, detail="Practice Session not found")
    return PracticeSessionRead.model_validate(practice_session)


@router.get(
    "/{practice_session_id}/practice_card",
    response_model=PracticeCardRead,
    status_code=200,
)
def read_practice_card(db: SessionDep, practice_session_id: uuid.UUID, forward: bool):
    practice_session = db_read_practice_session(db, practice_session_id)
    if not practice_session:
        raise HTTPException(status_code=404, detail="Practice Session not found")
    practice_card = db_read_practice_card(db, practice_session, forward)
    if not practice_card:
        raise HTTPException(status_code=404, detail="Practice Card not found")

    return PracticeCardRead.model_validate(practice_card)
