import uuid

from fastapi import APIRouter, HTTPException

from app.database import SessionDep
from app.database_ops.deck import db_read_deck
from app.database_ops.deck_practice_config import (
    db_create_deck_practice_config,
    db_delete_deck_practice_config,
    db_read_deck_practice_config,
    db_read_deck_practice_configs,
    db_update_deck_practice_config,
)
from app.models.deck_practice_config import (
    DeckPracticeConfigCreate,
    DeckPracticeConfigRead,
    DeckPracticeConfigUpdate,
)
from app.services.deck_practice_config import validate_deck_practice_config

router = APIRouter(prefix="/deck_practice_configs", tags=["Practice Config"])

_ARRAY_FIELDS = (
    "prompt_field_ids",
    "answer_field_ids",
    "prompt_pool_ids",
    "prompt_pool_counts",
    "answer_pool_ids",
    "answer_pool_counts",
)


@router.post("", response_model=DeckPracticeConfigRead, status_code=201)
def create_deck_practice_config(db: SessionDep, payload: DeckPracticeConfigCreate):
    if not db_read_deck(db, payload.deck_id):
        raise HTTPException(status_code=404, detail="Deck not found")
    try:
        validate_deck_practice_config(
            db,
            payload.deck_id,
            payload.prompt_field_ids,
            payload.answer_field_ids,
            payload.prompt_pool_ids,
            payload.prompt_pool_counts,
            payload.answer_pool_ids,
            payload.answer_pool_counts,
        )
        return db_create_deck_practice_config(db, payload.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("", response_model=list[DeckPracticeConfigRead], status_code=200)
def read_deck_practice_configs(db: SessionDep, deck_id: uuid.UUID):
    return db_read_deck_practice_configs(db, deck_id)


@router.get("/{config_id}", response_model=DeckPracticeConfigRead, status_code=200)
def read_deck_practice_config(db: SessionDep, config_id: uuid.UUID):
    config = db_read_deck_practice_config(db, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Practice config not found")
    return config


@router.patch("/{config_id}", response_model=DeckPracticeConfigRead, status_code=200)
def update_deck_practice_config(
    db: SessionDep, config_id: uuid.UUID, payload: DeckPracticeConfigUpdate
):
    config = db_read_deck_practice_config(db, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Practice config not found")

    data = payload.model_dump(exclude_unset=True)
    # Validation always runs against the full resulting config, not just the patched
    # fields — pairwise-disjointness and the other rules only mean something across
    # the complete set of six arrays.
    merged = {field: data.get(field, getattr(config, field)) for field in _ARRAY_FIELDS}
    try:
        validate_deck_practice_config(db, config.deck_id, **merged)
        return db_update_deck_practice_config(db, config, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.delete("/{config_id}", status_code=204)
def delete_deck_practice_config(db: SessionDep, config_id: uuid.UUID):
    config = db_read_deck_practice_config(db, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Practice config not found")
    db_delete_deck_practice_config(db, config)
