import uuid

from fastapi import APIRouter, HTTPException

from app.database import SessionDep
from app.database_ops.deck import db_read_deck
from app.database_ops.field_def import (
    db_archive_field_def,
    db_count_card_field_values,
    db_create_field_def,
    db_hard_delete_field_def,
    db_read_field_def,
    db_read_field_defs,
    db_rename_field_def,
    db_reorder_field_defs,
)
from app.dependencies import CurrentUserDep
from app.models.deck import Deck
from app.models.field_def import FieldDefCreate, FieldDefRead, FieldDefUpdate
from app.services.activity import touch

router = APIRouter(tags=["Field Definitions"])


@router.post("/decks/{deck_id}/fields", response_model=FieldDefRead, status_code=201)
def create_field_def(
    db: SessionDep, current_user: CurrentUserDep, deck_id: uuid.UUID, payload: FieldDefCreate
):
    deck = db_read_deck(db, deck_id, current_user.id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    touch(db, deck)
    try:
        return db_create_field_def(db, deck_id, payload.name, payload.type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get(
    "/decks/{deck_id}/fields", response_model=list[FieldDefRead], status_code=200
)
def read_field_defs(
    db: SessionDep,
    current_user: CurrentUserDep,
    deck_id: uuid.UUID,
    include_archived: bool = False,
):
    if not db_read_deck(db, deck_id, current_user.id):
        raise HTTPException(status_code=404, detail="Deck not found")
    return db_read_field_defs(db, deck_id, current_user.id, include_archived)


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
    field_defs = db_read_field_defs(db, deck_id, current_user.id, include_archived=True)
    if {fd.id for fd in field_defs} != set(ordered_ids) or len(ordered_ids) != len(
        field_defs
    ):
        raise HTTPException(
            status_code=400,
            detail="ordered_ids must contain exactly the deck's field ids",
        )
    touch(db, deck)
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
    deck = db.get(Deck, field_def.deck_id)
    if deck:
        touch(db, deck)
    try:
        return db_rename_field_def(db, field_def, payload.name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.delete("/fields/{field_id}", response_model=FieldDefRead, status_code=200)
def archive_field_def(db: SessionDep, current_user: CurrentUserDep, field_id: uuid.UUID):
    field_def = db_read_field_def(db, field_id, current_user.id)
    if not field_def:
        raise HTTPException(status_code=404, detail="Field not found")
    if field_def.archived_at is None:
        # D3: archiving counts as removing — a deck can't archive down to fewer than
        # two active fields, same floor as create and the batch-edit endpoint.
        active_count = len(db_read_field_defs(db, field_def.deck_id, current_user.id))
        if active_count <= 2:
            raise HTTPException(status_code=422, detail="a deck needs at least two fields")
        deck = db.get(Deck, field_def.deck_id)
        if deck:
            touch(db, deck)
    return db_archive_field_def(db, field_def)


@router.delete("/fields/{field_id}/hard", status_code=204)
def hard_delete_field_def(db: SessionDep, current_user: CurrentUserDep, field_id: uuid.UUID):
    field_def = db_read_field_def(db, field_id, current_user.id)
    if not field_def:
        raise HTTPException(status_code=404, detail="Field not found")
    if field_def.archived_at is None:
        raise HTTPException(
            status_code=400, detail="Field must be archived before hard delete"
        )
    if db_count_card_field_values(db, field_id) > 0:
        raise HTTPException(
            status_code=400, detail="Field still has card values, cannot hard delete"
        )
    deck = db.get(Deck, field_def.deck_id)
    if deck:
        touch(db, deck)
    db_hard_delete_field_def(db, field_def)
