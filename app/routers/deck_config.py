import uuid

from fastapi import APIRouter, HTTPException
from sqlmodel import Session

from app.crud.deck import db_read_deck
from app.crud.deck_config import (
    db_create_deck_config,
    db_delete_deck_config,
    db_read_deck_config,
    db_update_deck_config,
)
from app.database import SessionDep
from app.models.deck_config import DeckConfigCreate, DeckConfigRead, DeckConfigUpdate

router = APIRouter(prefix="/deck_configs")


def _validate_deck_config_payload(
    db: Session, payload: DeckConfigCreate | DeckConfigUpdate
):
    if payload.deck_id:
        deck = db_read_deck(db, payload.deck_id)
        if not deck:
            raise HTTPException(status_code=404, detail="Deck not found")
    static_reveals = payload.static_reveals if payload.static_reveals else []
    static_conceals = payload.static_conceals if payload.static_conceals else []
    dynamic_reveals = payload.dynamic_reveals if payload.dynamic_reveals else []
    dynamic_reveal_quantity = (
        payload.dynamic_reveal_quantity if payload.dynamic_reveal_quantity else []
    )
    dynamic_conceal_quantity = (
        payload.dynamic_conceal_quantity if payload.dynamic_conceal_quantity else []
    )
    dynamic_conceals = payload.dynamic_conceals if payload.dynamic_conceals else []
    if (
        set(static_reveals)
        & set(static_conceals)
        & set(dynamic_reveals)
        & set(dynamic_conceals)
    ):
        raise HTTPException(status_code=400, detail="Duplicated deck fields")

    if (
        set(static_reveals)
        | set(static_conceals)
        | set(dynamic_reveals)
        | set(dynamic_conceals)
    ) - deck.deck_schema.keys():
        raise HTTPException(status_code=400, detail="Unknown deck fields")

    if min(dynamic_reveal_quantity, default=0) < 0 or max(
        dynamic_reveal_quantity, default=0
    ) > len(dynamic_reveals):
        raise HTTPException(status_code=400, detail="Invalid dynamic reveal quantity")

    if min(dynamic_conceal_quantity, default=0) < 0 or max(
        dynamic_reveal_quantity, default=0
    ) > len(dynamic_conceals):
        raise HTTPException(status_code=400, detail="Invalid dynamic conceal quantity")


@router.post("/deck_config", response_model=DeckConfigRead, status_code=201)
def create_deck_config(db: SessionDep, deck_config: DeckConfigCreate):
    _validate_deck_config_payload(db, deck_config)

    created_deck_config = db_create_deck_config(
        db,
        deck_config.deck_id,
        deck_config.static_reveals,
        deck_config.static_conceals,
        deck_config.dynamic_reveals,
        deck_config.dynamic_reveal_quantity,
        deck_config.dynamic_conceals,
        deck_config.dynamic_conceal_quantity,
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
