import uuid

from fastapi import APIRouter, HTTPException

from app.database import SessionDep
from app.database_ops.subject import (
    db_create_subject,
    db_delete_subject,
    db_read_subject,
    db_read_subjects,
    db_update_subject,
)
from app.models.subject import SubjectCreate, SubjectRead, SubjectUpdate

router = APIRouter(prefix="/subjects", tags=["Subjects"])


@router.post("/subject", response_model=SubjectRead, status_code=201)
def create_subject(db: SessionDep, subject: SubjectCreate):
    created_subject = db_create_subject(db, subject.name)
    return SubjectRead(**created_subject.model_dump(), deck_count=0)


@router.get("/subject/{id}", response_model=SubjectRead, status_code=200)
def read_subject(
    db: SessionDep,
    id: uuid.UUID,
):
    row = db_read_subject(db, id)
    if not row:
        raise HTTPException(status_code=404, detail="Subject not found")
    subject, deck_count = row
    return SubjectRead(**subject.model_dump(), deck_count=deck_count)


@router.get("/subjects", response_model=list[SubjectRead], status_code=200)
def read_subjects(db: SessionDep):
    rows = db_read_subjects(db)
    return [
        SubjectRead(**subject.model_dump(), deck_count=deck_count)
        for subject, deck_count in rows
    ]


@router.patch("/subject/{id}", response_model=SubjectRead, status_code=200)
def update_subject(db: SessionDep, id: uuid.UUID, payload: SubjectUpdate):
    row = db_read_subject(db, id)
    if not row:
        raise HTTPException(status_code=404, detail="Subject not found")
    subject, deck_count = row
    updated_subject = db_update_subject(
        db, subject, payload.model_dump(exclude_unset=True)
    )
    return SubjectRead(**updated_subject.model_dump(), deck_count=deck_count)


@router.delete("/subject/{id}", status_code=204)
def delete_subject(db: SessionDep, id: uuid.UUID):
    row = db_read_subject(db, id)
    if not row:
        raise HTTPException(status_code=404, detail="Subject not found")
    subject, deck_count = row
    db_delete_subject(db, subject)
    return None
