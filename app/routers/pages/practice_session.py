import uuid
from typing import Annotated

from fastapi import APIRouter, Form, HTTPException, Request
from fastapi.responses import HTMLResponse

from app.database import SessionDep
from app.database_ops.practice_card import db_read_practice_card
from app.database_ops.practice_session import (
    db_read_all_practice_sessions,
    db_read_practice_session,
)
from app.models.practice_session import PracticeSessionCreate
from app.services.practice import create_practice_session_from_configs
from app.templates_config import templates

router = APIRouter(prefix="/practice_sessions", tags=["Practices"])


@router.get("/", response_class=HTMLResponse, status_code=200)
def read_practice_sessions(request: Request, db: SessionDep):
    practices = db_read_all_practice_sessions(db)
    return templates.TemplateResponse(
        request=request,
        name="practice_session/list.jinja",
        context={"practices": practices},
    )


@router.get("/practice_session/create", response_class=HTMLResponse, status_code=200)
def create_practice_session_form(request: Request):
    return templates.TemplateResponse(
        request=request, name="practice_session/create.jinja"
    )


@router.post("/practice_session/create", response_class=HTMLResponse, status_code=201)
def create_practice_session(
    request: Request,
    db: SessionDep,
    practice_session: Annotated[PracticeSessionCreate, Form()],
):
    created_practice_session = create_practice_session_from_configs(
        db, practice_session.deck_config_ids
    )
    return templates.TemplateResponse(
        request=request,
        name="practice_session/read.jinja",
        context={"practice_session": created_practice_session},
    )


@router.get(
    "/practice_session/{practice_session_id}",
    response_class=HTMLResponse,
    status_code=200,
)
def read_practice(db: SessionDep, request: Request, practice_session_id: uuid.UUID):
    practice_session = db_read_practice_session(db, practice_session_id)
    if not practice_session:
        raise HTTPException(status_code=404, detail="Practice Session not found")
    return templates.TemplateResponse(
        request=request,
        name="practice_session/read.jinja",
        context={"practice_session": practice_session},
    )


@router.get(
    "/practice_session/{practice_session_id}/practice_card",
    response_class=HTMLResponse,
    status_code=200,
)
def read_practice_card(
    db: SessionDep, request: Request, practice_session_id: uuid.UUID, forward: bool
):
    practice_session = db_read_practice_session(db, practice_session_id)
    if not practice_session:
        raise HTTPException(status_code=404, detail="Practice Session not found")
    practice_card = db_read_practice_card(db, practice_session, forward)
    if not practice_card:
        raise HTTPException(status_code=404, detail="Practice Card not found")

    return templates.TemplateResponse(
        request=request,
        name="practice_session/read_practice_card.jinja",
        context={"practice_card": practice_card},
    )
