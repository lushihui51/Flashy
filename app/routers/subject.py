import uuid

from fastapi import APIRouter, HTTPException

from app.database import SessionDep
from app.database_ops.subject import (
    db_create_subject,
    db_delete_subject,
    db_read_subject,
    db_update_subject,
)
from app.models.subject import SubjectCreate, SubjectRead, SubjectUpdate

router = APIRouter(prefix="/flashcards", tags=["Flashcards"])


@router.post("/subject", response_model=SubjectRead, status_code=201)
def create_subject(db: SessionDep, subject: SubjectCreate):
    created_subject = db_create_subject(db, subject.name)
    return created_subject


@router.get("/subject/{id}", response_model=SubjectRead, status_code=200)
def read_subject(
    db: SessionDep,
    id: uuid.UUID,
):
    subject = db_read_subject(db, id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject


@router.patch("/subject/{id}", response_model=SubjectRead, status_code=200)
def update_subject(db: SessionDep, id: uuid.UUID, payload: SubjectUpdate):
    subject = db_read_subject(db, id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    updated_subject = db_update_subject(
        db, subject, payload.model_dump(exclude_unset=True)
    )
    return updated_subject


@router.delete("/subject/{id}", status_code=204)
def delete_subject(db: SessionDep, id: uuid.UUID):
    subject = db_read_subject(db, id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    db_delete_subject(db, subject)
    return None
