import uuid
from typing import Annotated

from fastapi import APIRouter, Form, HTTPException, Request
from fastapi.responses import HTMLResponse

from app.database import SessionDep
from app.database_ops.subject import (
    db_create_subject,
    db_read_all_subjects,
    db_read_subject,
)
from app.models.subject import SubjectCreate
from app.templates_config import templates

router = APIRouter(
    prefix="/subjects", default_response_class=HTMLResponse, tags=["Subjects"]
)


@router.get("/", status_code=200)
def read_subjects(request: Request, db: SessionDep):
    subjects = db_read_all_subjects(db)
    return templates.TemplateResponse(
        request=request, name="subject/list.jinja", context={"subjects": subjects}
    )


@router.get("/subject/new", status_code=200)
def create_subject_form(request: Request):
    return templates.TemplateResponse(request=request, name="subject/create.jinja")


@router.post("/subject/new", status_code=201)
def create_subject(
    request: Request, db: SessionDep, subject: Annotated[SubjectCreate, Form()]
):
    created_subject = db_create_subject(db, subject.model_dump())
    return templates.TemplateResponse(
        request=request,
        name="subject/read.jinja",
        context={"subject": created_subject},
    )


@router.get("/subject/{id}", status_code=200)
def read_subject(request: Request, db: SessionDep, id: uuid.UUID):
    subject = db_read_subject(db, id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return templates.TemplateResponse(
        request=request,
        name="subject/read.jinja",
        context={"subject": subject},
    )
