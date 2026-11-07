import uuid

from fastapi import APIRouter, HTTPException

from app.database import SessionDep
from app.database_ops.deck import db_read_deck
from app.database_ops.field_def import (
    db_read_field_def,
    db_read_field_defs,
    db_rename_field_def,
    db_reorder_field_defs,
)
from app.database_ops.subject import db_read_subject
from app.dependencies import CurrentUserDep
from app.mastery.config import get_mastery_strategy
from app.models.field_def import FieldDefCreate, FieldDefRead, FieldDefUpdate
from app.refusals import Refusal
from app.services.activity import touch
from app.services.deletion import delete_field as delete_field_service
from app.services.field_def_create import create_field_def as create_field_def_service

router = APIRouter(tags=["Field Definitions"])


@router.post("/decks/{deck_id}/fields", response_model=FieldDefRead, status_code=201)
def create_field_def(
    db: SessionDep, current_user: CurrentUserDep, deck_id: uuid.UUID, payload: FieldDefCreate
):
    deck = db_read_deck(db, deck_id, current_user.id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    subject = db_read_subject(db, deck.subject_id, current_user.id)
    assert subject is not None, "a deck's subject always exists"
    try:
        return create_field_def_service(db, deck, subject, payload.name, payload.type)
    except Refusal as e:
        raise HTTPException(status_code=400, detail=e.detail) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get(
    "/decks/{deck_id}/fields", response_model=list[FieldDefRead], status_code=200
)
def read_field_defs(db: SessionDep, current_user: CurrentUserDep, deck_id: uuid.UUID):
    if not db_read_deck(db, deck_id, current_user.id):
        raise HTTPException(status_code=404, detail="Deck not found")
    return db_read_field_defs(db, deck_id, current_user.id)


@router.post(
    "/decks/{deck_id}/fields/reorder",
    response_model=list[FieldDefRead],
    status_code=200,
)
def reorder_field_defs(
    db: SessionDep,
    current_user: CurrentUserDep,
    deck_id: uuid.UUID,
    ordered_ids: list[uuid.UUID],
):
    deck = db_read_deck(db, deck_id, current_user.id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    field_defs = db_read_field_defs(db, deck_id, current_user.id)
    if {fd.id for fd in field_defs} != set(ordered_ids) or len(ordered_ids) != len(
        field_defs
    ):
        raise HTTPException(
            status_code=400,
            detail="ordered_ids must contain exactly the deck's field ids",
        )
    subject = db_read_subject(db, deck.subject_id, current_user.id)
    assert subject is not None, "a deck's subject always exists"
    touch(db, deck, subject)
    return db_reorder_field_defs(db, field_defs, ordered_ids)


@router.get("/fields/{field_id}", response_model=FieldDefRead, status_code=200)
def read_field_def(db: SessionDep, current_user: CurrentUserDep, field_id: uuid.UUID):
    field_def = db_read_field_def(db, field_id, current_user.id)
    if not field_def:
        raise HTTPException(status_code=404, detail="Field not found")
    return field_def


@router.patch("/fields/{field_id}", response_model=FieldDefRead, status_code=200)
def update_field_def(
    db: SessionDep, current_user: CurrentUserDep, field_id: uuid.UUID, payload: FieldDefUpdate
):
    field_def = db_read_field_def(db, field_id, current_user.id)
    if not field_def:
        raise HTTPException(status_code=404, detail="Field not found")
    if payload.type is not None and payload.type != field_def.type:
        raise HTTPException(status_code=400, detail="Field type cannot be changed")
    if payload.name is None:
        return field_def
    deck = db_read_deck(db, field_def.deck_id, current_user.id)
    assert deck is not None, "a field's deck always exists"
    subject = db_read_subject(db, deck.subject_id, current_user.id)
    assert subject is not None, "a deck's subject always exists"
    touch(db, deck, subject)
    try:
        return db_rename_field_def(db, field_def, payload.name)
    except Refusal as e:
        raise HTTPException(status_code=400, detail=e.detail) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.delete("/fields/{field_id}", status_code=204)
def delete_field_def(db: SessionDep, current_user: CurrentUserDep, field_id: uuid.UUID) -> None:
    """404 for a field that is not the user's; 422 with code `too_few_fields` when the
    deck would keep fewer than two fields."""
    field_def = db_read_field_def(db, field_id, current_user.id)
    if not field_def:
        raise HTTPException(status_code=404, detail="Field not found")
    try:
        delete_field_service(db, get_mastery_strategy(), current_user.id, field_def)
    except Refusal as e:
        raise HTTPException(status_code=422, detail=e.detail) from e
