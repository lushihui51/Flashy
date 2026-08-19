import uuid

from fastapi import APIRouter, HTTPException

from app.database import SessionDep
from app.database_ops.card import (
    db_create_card,
    db_delete_card,
    db_read_card,
    db_read_cards_for_deck,
    db_update_card_values,
)
from app.database_ops.deck import db_read_deck
from app.database_ops.field_def import db_read_field_defs
from app.dependencies import CurrentUserDep
from app.mastery.config import get_mastery_strategy
from app.models.card import CardCreate, CardMasteryRead, CardRead, CardUpdate
from app.services.mastery import card_mastery

router = APIRouter(prefix="/cards", tags=["Cards"])


def _card_read(card) -> CardRead:
    return CardRead(
        id=card.id,
        deck_id=card.deck_id,
        created_at=card.created_at,
        values={v.field_def_id: v.value for v in card.values},
    )


@router.post("", response_model=CardRead, status_code=201)
def create_card(db: SessionDep, current_user: CurrentUserDep, card: CardCreate):
    if not db_read_deck(db, card.deck_id, current_user.id):
        raise HTTPException(status_code=404, detail="Deck not found")

    active_field_ids = {fd.id for fd in db_read_field_defs(db, card.deck_id, current_user.id)}
    if set(card.values.keys()) != active_field_ids:
        raise HTTPException(
            status_code=400,
            detail="Card values must contain exactly the deck's active fields",
        )

    new_card = db_create_card(db, card.deck_id, card.values)
    return _card_read(new_card)


@router.get("", response_model=list[CardRead], status_code=200)
def read_cards(db: SessionDep, current_user: CurrentUserDep, deck_id: uuid.UUID):
    if not db_read_deck(db, deck_id, current_user.id):
        raise HTTPException(status_code=404, detail="Deck not found")
    return [_card_read(card) for card in db_read_cards_for_deck(db, deck_id, current_user.id)]


@router.get("/{card_id}", response_model=CardRead, status_code=200)
def read_card(db: SessionDep, current_user: CurrentUserDep, card_id: uuid.UUID):
    card = db_read_card(db, card_id, current_user.id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return _card_read(card)


@router.patch("/{card_id}", response_model=CardRead, status_code=200)
def update_card(
    db: SessionDep, current_user: CurrentUserDep, card_id: uuid.UUID, payload: CardUpdate
):
    card = db_read_card(db, card_id, current_user.id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    active_field_ids = {fd.id for fd in db_read_field_defs(db, card.deck_id, current_user.id)}
    if not set(payload.values.keys()) <= active_field_ids:
        raise HTTPException(
            status_code=400,
            detail="Card values may only reference the deck's active fields",
        )

    updated_card = db_update_card_values(db, card, payload.values)
    return _card_read(updated_card)


@router.get("/{card_id}/mastery", response_model=CardMasteryRead, status_code=200)
def read_card_mastery(db: SessionDep, current_user: CurrentUserDep, card_id: uuid.UUID):
    if not db_read_card(db, card_id, current_user.id):
        raise HTTPException(status_code=404, detail="Card not found")
    strategy = get_mastery_strategy()
    score = card_mastery(db, strategy, [card_id])[card_id]
    return CardMasteryRead(mastery=score.mastery, reviewed_field_count=score.reviewed_field_count)


@router.delete("/{card_id}", status_code=204)
def delete_card(db: SessionDep, current_user: CurrentUserDep, card_id: uuid.UUID):
    card = db_read_card(db, card_id, current_user.id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    db_delete_card(db, card)
