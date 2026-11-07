import uuid

from fastapi import APIRouter, HTTPException
from sqlmodel import Session

from app.database import SessionDep
from app.database_ops.subject import (
    db_create_subject,
    db_read_subject,
    db_read_subject_listing,
    db_read_subject_listings,
    db_update_subject,
)
from app.dependencies import CurrentUserDep
from app.mastery.config import get_mastery_strategy
from app.models.subject import (
    SubjectCreate,
    SubjectListing,
    SubjectRead,
    SubjectSummary,
    SubjectUpdate,
)
from app.refusals import Refusal
from app.services.activity import touch
from app.services.deletion import delete_subject as delete_subject_service
from app.services.mastery import subject_readiness

router = APIRouter(prefix="/subjects", tags=["Subjects"])


def _subject_summaries(db: Session, listings: list[SubjectListing]) -> list[SubjectSummary]:
    readiness = subject_readiness(db, get_mastery_strategy(), [row.id for row in listings])
    return [SubjectSummary(**row.model_dump(), readiness=readiness[row.id]) for row in listings]


@router.post("", response_model=SubjectRead, status_code=201)
def create_subject(db: SessionDep, current_user: CurrentUserDep, subject: SubjectCreate):
    try:
        return db_create_subject(db, {**subject.model_dump(), "user_id": current_user.id})
    except Refusal as e:
        raise HTTPException(status_code=400, detail=e.detail) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("", response_model=list[SubjectSummary], status_code=200)
def read_subjects(db: SessionDep, current_user: CurrentUserDep):
    return _subject_summaries(db, db_read_subject_listings(db, current_user.id))


@router.get("/{subject_id}", response_model=SubjectSummary, status_code=200)
def read_subject(db: SessionDep, current_user: CurrentUserDep, subject_id: uuid.UUID):
    listing = db_read_subject_listing(db, subject_id, current_user.id)
    if not listing:
        raise HTTPException(status_code=404, detail="Subject not found")
    return _subject_summaries(db, [listing])[0]


@router.patch("/{subject_id}", response_model=SubjectRead, status_code=200)
def update_subject(
    db: SessionDep, current_user: CurrentUserDep, subject_id: uuid.UUID, payload: SubjectUpdate
):
    subject = db_read_subject(db, subject_id, current_user.id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    data = payload.model_dump(exclude_unset=True)
    if data:
        # An own-column edit bumps the recency sort key; an empty PATCH does not.
        touch(db, subject)
    try:
        return db_update_subject(db, subject, data)
    except Refusal as e:
        raise HTTPException(status_code=400, detail=e.detail) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.delete("/{subject_id}", status_code=204)
def delete_subject(db: SessionDep, current_user: CurrentUserDep, subject_id: uuid.UUID):
    subject = db_read_subject(db, subject_id, current_user.id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    delete_subject_service(db, get_mastery_strategy(), subject)
