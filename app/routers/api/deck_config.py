import uuid

from fastapi import APIRouter, HTTPException
from sqlmodel import Session

from app.database import SessionDep
from app.database_ops.deck import db_read_deck
from app.database_ops.deck_config import (
    db_create_deck_config,
    db_delete_deck_config,
    db_read_deck_config,
    db_update_deck_config,
)
from app.models.deck_config import DeckConfigCreate, DeckConfigRead, DeckConfigUpdate

router = APIRouter(prefix="/deck_configs", tags=["Deck Configuration"])


def _validate_deck_config_payload(
    db: Session, payload: DeckConfigCreate | DeckConfigUpdate
):
    deck = None
    if payload.deck_id:
        deck = db_read_deck(db, payload.deck_id)
        if not deck:
            raise HTTPException(status_code=404, detail="Deck not found")
    prompt_fields = payload.prompt_fields if payload.prompt_fields else []
    answer_fields = payload.answer_fields if payload.answer_fields else []
    prompt_pool = payload.prompt_pool if payload.prompt_pool else []
    prompt_pool_counts = (
        payload.prompt_pool_counts if payload.prompt_pool_counts else []
    )
    answer_pool_counts = (
        payload.answer_pool_counts if payload.answer_pool_counts else []
    )
    answer_pool = payload.answer_pool if payload.answer_pool else []
    if set(prompt_fields) & set(answer_fields) & set(prompt_pool) & set(answer_pool):
        raise HTTPException(status_code=400, detail="Duplicated deck fields")

    if (
        deck
        and (
            set(prompt_fields)
            | set(answer_fields)
            | set(prompt_pool)
            | set(answer_pool)
        )
        - deck.deck_schema.keys()
    ):
        raise HTTPException(status_code=400, detail="Unknown deck fields")

    if min(prompt_pool_counts, default=0) < 0 or max(
        prompt_pool_counts, default=0
    ) > len(prompt_pool):
        raise HTTPException(status_code=400, detail="Invalid dynamic reveal quantity")

    if min(answer_pool_counts, default=0) < 0 or max(
        answer_pool_counts, default=0
    ) > len(answer_pool):
        raise HTTPException(status_code=400, detail="Invalid dynamic conceal quantity")


@router.post("/deck_config", response_model=DeckConfigRead, status_code=201)
def create_deck_config(db: SessionDep, deck_config: DeckConfigCreate):
    _validate_deck_config_payload(db, deck_config)

    created_deck_config = db_create_deck_config(
        db,
        deck_config.deck_id,
        deck_config.prompt_fields,
        deck_config.answer_fields,
        deck_config.prompt_pool,
        deck_config.prompt_pool_counts,
        deck_config.answer_pool,
        deck_config.answer_pool_counts,
    )
    return created_deck_config


@router.get(
    "/deck_config/{deck_config_id}", response_model=DeckConfigRead, status_code=200
)
def read_deck_config(db: SessionDep, deck_config_id: uuid.UUID):
    deck_config = db_read_deck_config(db, deck_config_id)
    if not deck_config:
        raise HTTPException(status_code=404, detail="Deck Configuration not found")
    return deck_config


@router.patch(
    "/deck_config/{deck_config_id}", response_model=DeckConfigRead, status_code=200
)
def update_deck_config(
    db: SessionDep, deck_config_id: uuid.UUID, payload: DeckConfigUpdate
):
    deck_config = db_read_deck_config(db, deck_config_id)
    if not deck_config:
        raise HTTPException(status_code=404, detail="Deck Configuration not found")

    _validate_deck_config_payload(db, payload)

    updated_deck_config = db_update_deck_config(
        db, deck_config, payload.model_dump(exclude_none=True)
    )
    return updated_deck_config


@router.delete("/deck_config/{deck_config_id}", status_code=204)
def delete_deck_config(db: SessionDep, deck_config_id: uuid.UUID):
    deck_config = db_read_deck_config(db, deck_config_id)
    if not deck_config:
        raise HTTPException(404, "Deck Configuration not found")
    db_delete_deck_config(db, deck_config)
