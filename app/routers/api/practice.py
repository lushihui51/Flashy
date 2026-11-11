import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from app.database import SessionDep
from app.database_ops.practice import db_read_practice_summaries
from app.database_ops.run import db_read_run_reads_for_practice
from app.dependencies import CurrentUserDep
from app.mastery.config import get_mastery_strategy
from app.models.practice_payloads import (
    PracticeCreate,
    PracticeDetail,
    PracticeSummary,
    SuggestedPracticeName,
)
from app.models.run import RunRead
from app.refusals import Refusal
from app.services.practice import create_practice, suggest_practice_name
from app.services.run import start_run

router = APIRouter(prefix="/practices", tags=["Practice"])


@router.post("", response_model=PracticeSummary, status_code=201)
def post_practices(db: SessionDep, current_user: CurrentUserDep, payload: PracticeCreate):
    """404 naming a deck that is missing or not the user's; 400 `practice_name_taken` for a
    name the user's other practice has; a plain 400 for no deck or a deck picked twice."""
    try:
        return create_practice(db, current_user.id, payload.name, payload.deck_ids)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Refusal as e:
        raise HTTPException(status_code=400, detail=e.detail) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("", response_model=list[PracticeSummary], status_code=200)
def get_practices(db: SessionDep, current_user: CurrentUserDep):
    """Most recently run first; a practice never run by when it was made."""
    return db_read_practice_summaries(db, current_user.id)


@router.get("/suggested-name", response_model=SuggestedPracticeName, status_code=200)
def get_suggested_practice_name(
    db: SessionDep,
    current_user: CurrentUserDep,
    deck_ids: Annotated[list[uuid.UUID], Query()],
):
    """The name a practice of these decks, in this order, takes when created with none.
    404 naming a deck that is missing or not the user's."""
    try:
        return SuggestedPracticeName(name=suggest_practice_name(db, current_user.id, deck_ids))
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/{practice_id}", response_model=PracticeDetail, status_code=200)
def get_practice(db: SessionDep, current_user: CurrentUserDep, practice_id: uuid.UUID):
    summaries = db_read_practice_summaries(db, current_user.id, practice_id)
    if not summaries:
        raise HTTPException(status_code=404, detail="Practice not found")
    return PracticeDetail(
        **summaries[0].model_dump(), runs=db_read_run_reads_for_practice(db, practice_id)
    )


@router.post("/{practice_id}/runs", response_model=RunRead, status_code=200)
def post_runs(db: SessionDep, current_user: CurrentUserDep, practice_id: uuid.UUID):
    """The practice's active run, or a new one when it has none. 404 for an unknown or
    foreign practice; 400 `no_cards` when a new run would have no card."""
    try:
        return start_run(db, get_mastery_strategy(), current_user.id, practice_id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Refusal as e:
        raise HTTPException(status_code=400, detail=e.detail) from e
