import uuid
from typing import Annotated

from fastapi import APIRouter, Form, HTTPException, Request
from fastapi.responses import HTMLResponse

from app.database import SessionDep
from app.database_ops.card import db_create_card, db_read_all_cards, db_read_card
from app.models.card import CardCreate
from app.templates_config import templates

router = APIRouter(prefix="/cards", default_response_class=HTMLResponse, tags=["Cards"])


@router.get("/", response_class=HTMLResponse, status_code=200)
def read_cards(request: Request, db: SessionDep):
    cards = db_read_all_cards(db)
    return templates.TemplateResponse(
        request=request, name="card/list.jinja", context={"cards": cards}
    )


@router.get("/card/new", response_class=HTMLResponse, status_code=200)
def create_card_form(request: Request):
    return templates.TemplateResponse(request=request, name="card/create.jinja")


@router.post("/card/new", response_class=HTMLResponse)
def create_card(request: Request, db: SessionDep, card: Annotated[CardCreate, Form()]):
    created_card = db_create_card(db, card.deck_id, card.fields)
    return templates.TemplateResponse(
        request=request,
        name="card/read.jinja",
        context={"card": created_card},
    )


@router.get("/card/{id}", response_class=HTMLResponse, status_code=200)
def read_card(request: Request, db: SessionDep, id: uuid.UUID):
    card = db_read_card(db, id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return templates.TemplateResponse(
        request=request,
        name="card/read.jinja",
        context={"card": card},
    )
