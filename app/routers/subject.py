import uuid

from fastapi import APIRouter, HTTPException

from app.crud.subject import (
    db_create_subject,
    db_delete_subject,
    db_read_subject,
    db_update_subject,
)
from app.database import SessionDep
from app.models.subject import SubjectCreate, SubjectRead, SubjectUpdate

router = APIRouter(prefix="/flashcards", tags=["Flashcards"])


@router.post("/subject", response_model=SubjectRead, status_code=201)
def create_subject(db: SessionDep, subject: SubjectCreate):
    created_subject = db_create_subject(db, subject.name)
    if not created_subject:
        raise HTTPException(status_code=500, detail="Failed to create subject")
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
    if not updated_subject:
        raise HTTPException(status_code=500, detail="Failed to update subject")
    return updated_subject


@router.delete("/subject/{id}", status_code=204)
def delete_subject(db: SessionDep, id: uuid.UUID):
    subject = db_read_subject(db, id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if not db_delete_subject(db, subject):
        raise HTTPException(status_code=500, detail="Failed to delete subject")
    return None
