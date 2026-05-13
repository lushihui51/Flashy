import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import ValidationError, create_model
from sqlmodel import Session

from app.crud.card import db_create_card, db_delete_card, db_get_card, db_update_card
from app.crud.deck import db_read_deck
from app.database import SessionDep
from app.models.card import CardCreate, CardRead, CardUpdate

router = APIRouter(prefix="/cards", tags=["Cards"])

TYPES = {"str": str, "int": int, "float": float, "bool": bool}


def _validate_card_fields(db: Session, deck_id: uuid.UUID, card_fields: dict[str, Any]):
    deck = db_read_deck(db, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    fields: dict[str, Any] = {
        name: (TYPES[typ], ...) for name, typ in deck.deck_schema.items()
    }
    deck_schema_model = create_model("DeckSchemaModel", **fields)
    try:
        deck_schema_model.model_validate(card_fields)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/card", response_model=CardRead, status_code=201)
def create_card(db: SessionDep, card: CardCreate):
    _validate_card_fields(db, card.deck_id, card.fields)

    new_card = db_create_card(db, card.deck_id, card.fields)
    return new_card


@router.get("/card/{card_id}", response_model=CardRead, status_code=200)
def read_card(db: SessionDep, card_id: uuid.UUID):
    card = db_get_card(db, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


@router.put("/card/{card_id}", response_model=CardRead, status_code=200)
def update_card(db: SessionDep, card_id: uuid.UUID, payload: CardUpdate):
    card = db_get_card(db, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    if payload.fields:
        _validate_card_fields(db, card.deck_id, payload.fields)
    updated_card = db_update_card(db, card, payload.model_dump(exclude_unset=True))
    return updated_card


@router.delete("/card/{card_id}", status_code=204)
def delete_card(db: SessionDep, card_id: uuid.UUID):
    card = db_get_card(db, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    db_delete_card(db, card)
