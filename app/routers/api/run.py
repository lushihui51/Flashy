import uuid

from fastapi import APIRouter, HTTPException

from app.database import SessionDep
from app.database_ops.run import db_read_run_read
from app.dependencies import CurrentUserDep
from app.mastery.config import get_mastery_strategy
from app.models.run import RunRead
from app.models.run_payloads import (
    RatingSubmission,
    RatingSubmissionResult,
    RunBreakdownRead,
    RunChosenCards,
    RunState,
)
from app.refusals import Refusal
from app.services.run import (
    read_run_breakdown,
    read_run_state,
    rerun,
    start_chosen_cards,
    submit_rating,
)

router = APIRouter(tags=["Run"])


@router.get("/runs/{run_id}", response_model=RunRead, status_code=200)
def get_run(db: SessionDep, current_user: CurrentUserDep, run_id: uuid.UUID):
    run = db_read_run_read(db, run_id, current_user.id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.get("/runs/{run_id}/state", response_model=RunState, status_code=200)
def get_run_state(db: SessionDep, current_user: CurrentUserDep, run_id: uuid.UUID):
    """One server-composed payload. 404 for an unknown or foreign run; `current_card: null`
    once nothing is pending, at which point `status` already reads "completed"."""
    state = read_run_state(db, run_id, current_user.id)
    if not state:
        raise HTTPException(status_code=404, detail="Run not found")
    return state


@router.get("/runs/{run_id}/breakdown", response_model=RunBreakdownRead, status_code=200)
def get_run_breakdown(db: SessionDep, current_user: CurrentUserDep, run_id: uuid.UUID):
    """Everything the summary shows. 409 `run_active` while the run is active; 404 for an
    unknown or foreign run."""
    try:
        breakdown = read_run_breakdown(db, get_mastery_strategy(), run_id, current_user.id)
    except Refusal as e:
        raise HTTPException(status_code=409, detail=e.detail) from e
    if not breakdown:
        raise HTTPException(status_code=404, detail="Run not found")
    return breakdown


@router.post("/runs/{run_id}/rerun", response_model=RunRead, status_code=201)
def post_run_rerun(db: SessionDep, current_user: CurrentUserDep, run_id: uuid.UUID):
    """A new run of the whole practice of the completed run. 404 for an unknown or foreign
    run; 400 `run_active`, `practice_has_active_run` or `no_cards`."""
    try:
        return rerun(db, get_mastery_strategy(), current_user.id, run_id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Refusal as e:
        raise HTTPException(status_code=400, detail=e.detail) from e


@router.post("/runs/{run_id}/chosen_cards", response_model=RunRead, status_code=201)
def post_run_chosen_cards(
    db: SessionDep, current_user: CurrentUserDep, run_id: uuid.UUID, payload: RunChosenCards
):
    """A new run of exactly the chosen cards of the completed run. 404 for an unknown or
    foreign run; 400 `run_active`, `practice_has_active_run` or `no_cards`; a plain 400
    for an empty list or a card the run did not hold."""
    try:
        return start_chosen_cards(
            db, get_mastery_strategy(), current_user.id, run_id, payload.card_ids
        )
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Refusal as e:
        raise HTTPException(status_code=400, detail=e.detail) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post(
    "/run_cards/{run_card_id}/rate", response_model=RatingSubmissionResult, status_code=200
)
def post_run_card_rating(
    db: SessionDep, current_user: CurrentUserDep, run_card_id: uuid.UUID, payload: RatingSubmission
):
    strategy = get_mastery_strategy()
    try:
        rated, requeued = submit_rating(
            db, strategy, current_user.id, run_card_id, payload.ratings
        )
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Refusal as e:
        raise HTTPException(status_code=400, detail=e.detail) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return RatingSubmissionResult(rated_run_card=rated, requeued_run_card=requeued)
