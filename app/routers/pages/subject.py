from typing import Annotated

from fastapi import APIRouter, Form, Request
from fastapi.responses import HTMLResponse

from app.database import SessionDep
from app.database_ops.subject import (
    db_create_subject,
    db_read_all_subjects,
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


@router.post("/subject/new", status_code=200)
def create_subject(
    request: Request, db: SessionDep, subject: Annotated[SubjectCreate, Form()]
):
    created_subject = db_create_subject(db, subject.name)
    return templates.TemplateResponse(
        request=request,
        name="subject/read.jinja",
        context={"subject": created_subject},
    )
