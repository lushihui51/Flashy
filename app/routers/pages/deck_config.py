import uuid
from typing import Annotated

from fastapi import APIRouter, Form, HTTPException, Request
from fastapi.responses import HTMLResponse

from app.database import SessionDep
from app.database_ops.deck_config import (
    db_create_deck_config,
    db_read_all_deck_configs,
    db_read_deck_config,
)
from app.models.deck_config import DeckConfigCreate
from app.templates_config import templates

router = APIRouter(
    prefix="/deck_configs",
    default_response_class=HTMLResponse,
    tags=["Deck Configurations"],
)


@router.get("/", response_class=HTMLResponse, status_code=200)
def read_deck_configs(request: Request, db: SessionDep):
    deck_configs = db_read_all_deck_configs(db)
    return templates.TemplateResponse(
        request=request,
        name="deck_config/list.jinja",
        context={"deck_configs": deck_configs},
    )


@router.get("/deck_config/create", response_class=HTMLResponse, status_code=200)
def create_deck_config_form(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="deck_config/create.jinja",
    )


@router.post("/deck_config/create", response_class=HTMLResponse, status_code=201)
def create_deck_config(
    request: Request, db: SessionDep, deck_config: Annotated[DeckConfigCreate, Form()]
):
    created_deck_config = db_create_deck_config(
        db,
        deck_config.deck_id,
        deck_config.static_reveals,
        deck_config.static_conceals,
        deck_config.dynamic_reveals,
        deck_config.dynamic_reveal_quantities,
        deck_config.dynamic_conceals,
        deck_config.dynamic_conceal_quantities,
    )
    return templates.TemplateResponse(
        request=request,
        name="deck_config/read.jinja",
        context={"deck_config": created_deck_config.model_dump(mode="json")},
    )


@router.get("/deck_config/{id}", response_class=HTMLResponse, status_code=200)
def read_deck_config(request: Request, db: SessionDep, id: uuid.UUID):
    deck_config = db_read_deck_config(db, id)
    if not deck_config:
        raise HTTPException(status_code=404, detail="Deck configuration not found")
    return templates.TemplateResponse(
        request=request,
        name="deck_config/read.jinja",
        context={"deck_config": deck_config.model_dump(mode="json")},
    )
