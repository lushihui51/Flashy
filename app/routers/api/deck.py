import uuid

from fastapi import APIRouter, HTTPException
from sqlmodel import Session

from app.database import SessionDep
from app.database_ops.card import db_read_cards_for_deck
from app.database_ops.deck import (
    db_read_deck,
    db_read_deck_listings,
)
from app.database_ops.field_def import db_read_field_defs
from app.dependencies import CurrentUserDep
from app.mastery.config import get_mastery_strategy
from app.models.card import CardSummary
from app.models.deck import Deck, DeckSummary
from app.models.deck_payloads import (
    DeckBatchEdit,
    DeckCreate,
    DeckDetail,
    DeckFieldDefRead,
)
from app.refusals import Refusal
from app.services.deck_batch_edit import DeckBatchEditValidationError, apply_deck_batch_edit
from app.services.deck_create import DeckCreateValidationError, create_deck_atomic
from app.services.deletion import delete_deck as delete_deck_service
from app.services.mastery import card_readiness, deck_readiness

router = APIRouter(prefix="/decks", tags=["Decks"])


def _deck_detail(db: Session, deck: Deck, user_id: uuid.UUID) -> DeckDetail:
    field_defs = db_read_field_defs(db, deck.id, user_id)
    active_field_ids = {fd.id for fd in field_defs}
    cards = db_read_cards_for_deck(db, deck.id, user_id)
    strategy = get_mastery_strategy()
    readiness_by_card = card_readiness(db, strategy, [card.id for card in cards])
    return DeckDetail(
        id=deck.id,
        name=deck.name,
        subject_id=deck.subject_id,
        created_at=deck.created_at,
        last_activity_at=deck.last_activity_at,
        readiness=deck_readiness(db, strategy, [deck.id])[deck.id],
        field_defs=[
            DeckFieldDefRead(id=fd.id, name=fd.name, type=fd.type, position=fd.position)
            for fd in field_defs
        ],
        cards=[
            CardSummary(
                id=card.id,
                deck_id=card.deck_id,
                created_at=card.created_at,
                last_activity_at=card.last_activity_at,
                values={
                    v.field_def_id: v.value
                    for v in card.values
                    if v.field_def_id in active_field_ids
                },
                readiness=readiness_by_card[card.id].readiness,
            )
            for card in cards
        ],
    )


@router.post("", response_model=DeckDetail, status_code=201)
def create_deck(db: SessionDep, current_user: CurrentUserDep, payload: DeckCreate):
    try:
        deck = create_deck_atomic(
            db,
            current_user.id,
            payload.name,
            payload.subject_id,
            payload.field_defs,
        )
    except Refusal as e:
        raise HTTPException(status_code=422, detail=e.detail) from e
    except DeckCreateValidationError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    return _deck_detail(db, deck, current_user.id)


@router.get("", response_model=list[DeckSummary], status_code=200)
def read_decks(
    db: SessionDep, current_user: CurrentUserDep, subject_id: uuid.UUID | None = None
):
    listings = db_read_deck_listings(db, current_user.id, subject_id)
    readiness = deck_readiness(db, get_mastery_strategy(), [row.id for row in listings])
    return [DeckSummary(**row.model_dump(), readiness=readiness[row.id]) for row in listings]


@router.get("/{deck_id}", response_model=DeckDetail, status_code=200)
def read_deck(db: SessionDep, current_user: CurrentUserDep, deck_id: uuid.UUID):
    deck = db_read_deck(db, deck_id, current_user.id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    return _deck_detail(db, deck, current_user.id)


@router.patch("/{deck_id}", response_model=DeckDetail, status_code=200)
def update_deck(
    db: SessionDep, current_user: CurrentUserDep, deck_id: uuid.UUID, payload: DeckBatchEdit
):
    deck = db_read_deck(db, deck_id, current_user.id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    try:
        deck = apply_deck_batch_edit(db, current_user.id, deck, payload, get_mastery_strategy())
    except Refusal as e:
        raise HTTPException(status_code=422, detail=e.detail) from e
    except DeckBatchEditValidationError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    return _deck_detail(db, deck, current_user.id)


@router.delete("/{deck_id}", status_code=204)
def delete_deck(db: SessionDep, current_user: CurrentUserDep, deck_id: uuid.UUID):
    deck = db_read_deck(db, deck_id, current_user.id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    delete_deck_service(db, get_mastery_strategy(), current_user.id, deck)
