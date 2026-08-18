import uuid

from fastapi import APIRouter, HTTPException

from app.database import SessionDep
from app.database_ops.deck import (
    db_create_deck,
    db_delete_deck,
    db_read_deck,
    db_read_decks,
    db_update_deck,
)
from app.database_ops.subject import db_read_subject
from app.models.deck import DeckCreate, DeckRead, DeckUpdate

router = APIRouter(prefix="/decks", tags=["Decks"])


@router.post("", response_model=DeckRead, status_code=201)
def create_deck(db: SessionDep, deck: DeckCreate):
    subject = db_read_subject(db, deck.subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    try:
        return db_create_deck(db, deck.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("", response_model=list[DeckRead], status_code=200)
def read_decks(db: SessionDep, subject_id: uuid.UUID | None = None):
    return db_read_decks(db, subject_id)


@router.get("/{deck_id}", response_model=DeckRead, status_code=200)
def read_deck(db: SessionDep, deck_id: uuid.UUID):
    deck = db_read_deck(db, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    return deck


@router.patch("/{deck_id}", response_model=DeckRead, status_code=200)
def update_deck(db: SessionDep, deck_id: uuid.UUID, payload: DeckUpdate):
    deck = db_read_deck(db, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    if payload.subject_id:
        subject = db_read_subject(db, payload.subject_id)
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
    try:
        return db_update_deck(db, deck, payload.model_dump(exclude_unset=True))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.delete("/{deck_id}", status_code=204)
def delete_deck(db: SessionDep, deck_id: uuid.UUID):
    deck = db_read_deck(db, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    db_delete_deck(db, deck)
