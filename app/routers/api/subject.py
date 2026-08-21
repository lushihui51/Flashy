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
from app.dependencies import CurrentUserDep
from app.models.subject import SubjectCreate, SubjectRead, SubjectUpdate

router = APIRouter(prefix="/subjects", tags=["Subjects"])


@router.post("", response_model=SubjectRead, status_code=201)
def create_subject(db: SessionDep, current_user: CurrentUserDep, subject: SubjectCreate):
    try:
        return db_create_subject(db, {**subject.model_dump(), "user_id": current_user.id})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("", response_model=list[SubjectRead], status_code=200)
def read_subjects(db: SessionDep, current_user: CurrentUserDep):
    return db_read_subjects(db, current_user.id)


@router.get("/{subject_id}", response_model=SubjectRead, status_code=200)
def read_subject(db: SessionDep, current_user: CurrentUserDep, subject_id: uuid.UUID):
    subject = db_read_subject(db, subject_id, current_user.id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject


@router.patch("/{subject_id}", response_model=SubjectRead, status_code=200)
def update_subject(
    db: SessionDep, current_user: CurrentUserDep, subject_id: uuid.UUID, payload: SubjectUpdate
):
    subject = db_read_subject(db, subject_id, current_user.id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    try:
        return db_update_subject(db, subject, payload.model_dump(exclude_unset=True))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.delete("/{subject_id}", status_code=204)
def delete_subject(db: SessionDep, current_user: CurrentUserDep, subject_id: uuid.UUID):
    subject = db_read_subject(db, subject_id, current_user.id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    db_delete_subject(db, subject)
