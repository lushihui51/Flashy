import uuid

from fastapi import APIRouter, HTTPException

from app.crud.card import db_create_card, db_delete_card, db_get_card, db_update_card
from app.database import SessionDep
from app.models.card import CardCreate, CardRead, CardUpdate

router = APIRouter(prefix="/cards", tags=["Cards"])


@router.post("/card", response_model=CardRead, status_code=201)
def create_card(db: SessionDep, card: CardCreate):
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
    updated_card = db_update_card(db, card, payload.model_dump(exclude_unset=True))
    return updated_card


@router.delete("/card/{card_id}", status_code=204)
def delete_card(db: SessionDep, card_id: uuid.UUID):
    card = db_get_card(db, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    db_delete_card(db, card)
