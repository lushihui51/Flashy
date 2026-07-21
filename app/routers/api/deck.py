import uuid

from fastapi import APIRouter, HTTPException

from app.database import SessionDep
from app.database_ops.deck import (
    db_create_deck,
    db_delete_deck,
    db_read_deck,
    db_read_deck_card_count,
    db_read_decks,
    db_update_deck,
)
from app.database_ops.subject import db_read_subject
from app.models.deck import DeckCreate, DeckRead, DeckUpdate

router = APIRouter(prefix="/decks", tags=["Decks"])


@router.post("/deck", response_model=DeckRead, status_code=201)
def create_deck(db: SessionDep, deck: DeckCreate):
    subject = db_read_subject(db, deck.subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    created_deck = db_create_deck(db, deck.name, deck.subject_id, deck.deck_schema)
    return DeckRead(**created_deck.model_dump(), card_count=0)


@router.get("/deck/{deck_id}", response_model=DeckRead, status_code=200)
def read_deck(db: SessionDep, deck_id: uuid.UUID):
    deck = db_read_deck(db, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    card_count = db_read_deck_card_count(db, deck_id)
    return DeckRead(**deck.model_dump(), card_count=card_count)


@router.get("/decks", response_model=list[DeckRead], status_code=200)
def read_decks(db: SessionDep, subject_id: uuid.UUID | None = None):
    rows = db_read_decks(db, subject_id)
    return [DeckRead(**deck.model_dump(), card_count=card_count) for deck, card_count in rows]


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
    card_count = db_read_deck_card_count(db, deck_id)
    return DeckRead(**updated_deck.model_dump(), card_count=card_count)


@router.delete("/deck/{deck_id}", status_code=204)
def delete_deck(db: SessionDep, deck_id: uuid.UUID):
    deck = db_read_deck(db, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    db_delete_deck(db, deck)
