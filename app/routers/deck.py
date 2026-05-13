import uuid

from fastapi import APIRouter, HTTPException

from app.crud.deck import db_create_deck, db_delete_deck, db_read_deck, db_update_deck
from app.crud.subject import db_read_subject
from app.database import SessionDep
from app.models.deck import DeckCreate, DeckRead, DeckUpdate

router = APIRouter(prefix="/decks", tags=["Decks"])


@router.post("/deck", response_model=DeckRead, status_code=201)
def create_deck(db: SessionDep, deck: DeckCreate):
    subject = db_read_subject(db, deck.subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    created_deck = db_create_deck(db, deck.name, deck.subject_id, deck.deck_schema)
    return created_deck


@router.get("/deck/{deck_id}", response_model=DeckRead, status_code=200)
def read_deck(db: SessionDep, deck_id: uuid.UUID):
    deck = db_read_deck(db, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    return deck


@router.put("/deck/{deck_id}", response_model=DeckRead, status_code=200)
def update_deck(db: SessionDep, deck_id: uuid.UUID, payload: DeckUpdate):
    deck = db_read_deck(db, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    if payload.subject_id:
        subject = db_read_subject(db, payload.subject_id)
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")

    updated_deck = db_update_deck(db, deck, payload.model_dump(exclude_unset=True))
    return updated_deck


@router.delete("/deck/{deck_id}", status_code=204)
def delete_deck(db: SessionDep, deck_id: uuid.UUID):
    deck = db_read_deck(db, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    db_delete_deck(db, deck)
