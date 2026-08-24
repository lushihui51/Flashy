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
from app.models.deck import Deck
from app.services.activity import touch
from app.services.mastery import card_mastery

router = APIRouter(prefix="/cards", tags=["Cards"])


def _is_blank(value: str) -> bool:
    return value.strip() == ""


def _card_read(card, active_field_ids: set[uuid.UUID]) -> CardRead:
    """Dense over active_field_ids (D10) regardless of what rows actually exist —
    every active field gets a key, "" if there's no row for it. An archived field's
    row is kept in the database as inert history (AGENTS.md) but never surfaced on a
    read."""
    existing = {v.field_def_id: v.value for v in card.values if v.field_def_id in active_field_ids}
    return CardRead(
        id=card.id,
        deck_id=card.deck_id,
        created_at=card.created_at,
        values={field_id: existing.get(field_id, "") for field_id in active_field_ids},
    )


def _reject_unknown_keys(values: dict[uuid.UUID, str], active_field_ids: set[uuid.UUID]) -> None:
    unknown = set(values.keys()) - active_field_ids
    if unknown:
        raise HTTPException(
            status_code=422,
            detail=f"values references field id(s) not active on this deck: "
            f"{sorted(str(f) for f in unknown)}",
        )


@router.post("", response_model=CardRead, status_code=201)
def create_card(db: SessionDep, current_user: CurrentUserDep, card: CardCreate):
    deck = db_read_deck(db, card.deck_id, current_user.id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    active_field_ids = {fd.id for fd in db_read_field_defs(db, card.deck_id, current_user.id)}
    _reject_unknown_keys(card.values, active_field_ids)

    # Dense write (§2.6): any active field the client omitted is written as "" rather
    # than rejected — the persisted row set never depends on what the client happened
    # to send.
    dense_values = {field_id: card.values.get(field_id, "") for field_id in active_field_ids}
    if all(_is_blank(v) for v in dense_values.values()):
        raise HTTPException(status_code=422, detail="card has no values")

    touch(db, deck)  # D13: card create bubbles to the deck.
    new_card = db_create_card(db, card.deck_id, dense_values)
    return _card_read(new_card, active_field_ids)


@router.get("", response_model=list[CardRead], status_code=200)
def read_cards(db: SessionDep, current_user: CurrentUserDep, deck_id: uuid.UUID):
    if not db_read_deck(db, deck_id, current_user.id):
        raise HTTPException(status_code=404, detail="Deck not found")
    active_field_ids = {fd.id for fd in db_read_field_defs(db, deck_id, current_user.id)}
    return [
        _card_read(card, active_field_ids)
        for card in db_read_cards_for_deck(db, deck_id, current_user.id)
    ]


@router.get("/{card_id}", response_model=CardRead, status_code=200)
def read_card(db: SessionDep, current_user: CurrentUserDep, card_id: uuid.UUID):
    card = db_read_card(db, card_id, current_user.id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    active_field_ids = {fd.id for fd in db_read_field_defs(db, card.deck_id, current_user.id)}
    return _card_read(card, active_field_ids)


@router.patch("/{card_id}", response_model=CardRead, status_code=200)
def update_card(
    db: SessionDep, current_user: CurrentUserDep, card_id: uuid.UUID, payload: CardUpdate
):
    card = db_read_card(db, card_id, current_user.id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    active_field_ids = {fd.id for fd in db_read_field_defs(db, card.deck_id, current_user.id)}
    _reject_unknown_keys(payload.values, active_field_ids)

    # Merge semantics: only the keys present in the payload change (§2.6). Computed
    # here, before writing, so an update that would leave the card all-blank can be
    # rejected instead of applied — delete it instead.
    existing = {v.field_def_id: v.value for v in card.values if v.field_def_id in active_field_ids}
    merged = {**existing, **payload.values}
    if all(_is_blank(merged.get(field_id, "")) for field_id in active_field_ids):
        raise HTTPException(status_code=422, detail="card has no values")

    deck = db.get(Deck, card.deck_id)
    if deck:
        touch(db, deck)  # D13: card edit bubbles to the deck (not the subject).
    updated_card = db_update_card_values(db, card, payload.values)
    return _card_read(updated_card, active_field_ids)


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
    deck = db.get(Deck, card.deck_id)
    if deck:
        touch(db, deck)  # D13: card delete bubbles to the deck.
    db_delete_card(db, card)
