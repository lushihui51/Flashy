import uuid
from typing import Annotated

from fastapi import APIRouter, Form, HTTPException, Request
from fastapi.responses import HTMLResponse

from app.database import SessionDep
from app.database_ops.deck import db_create_deck, db_read_all_decks, db_read_deck
from app.models.deck import DeckCreate
from app.templates_config import templates

router = APIRouter(prefix="/decks", default_response_class=HTMLResponse, tags=["Decks"])


@router.get("/", status_code=200)
def read_decks(request: Request, db: SessionDep):
    decks = db_read_all_decks(db)
    return templates.TemplateResponse(
        request=request, name="deck/list.jinja", context={"decks": decks}
    )


@router.get("/deck/new", status_code=200)
def create_deck_form(request: Request):
    return templates.TemplateResponse(request=request, name="deck/create.jinja")


@router.post("/deck/new", status_code=201)
def create_deck(request: Request, db: SessionDep, deck: Annotated[DeckCreate, Form()]):
    created_deck = db_create_deck(db, deck.name, deck.subject_id, deck.deck_schema)
    return templates.TemplateResponse(
        request=request,
        name="deck/read.jinja",
        context={"deck": created_deck},
    )


@router.get("/deck/{id}", status_code=200)
def read_deck(request: Request, db: SessionDep, id: uuid.UUID):
    deck = db_read_deck(db, id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    return templates.TemplateResponse(
        request=request,
        name="deck/read.jinja",
        context={"deck": deck},
    )
