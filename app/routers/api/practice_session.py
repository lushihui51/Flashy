import uuid

from fastapi import APIRouter, HTTPException

from app.database import SessionDep
from app.database_ops.practice_session import (
    db_read_practice_session,
    db_read_practice_sessions_with_decks,
)
from app.dependencies import CurrentUserDep
from app.mastery.config import get_mastery_strategy
from app.models.practice_card import PracticeCardRead, RatingSubmission, RatingSubmissionResult
from app.models.practice_session import (
    PracticeSessionCreate,
    PracticeSessionRead,
    PracticeSessionSummary,
)
from app.services.practice_session import (
    SessionStartError,
    get_current_practice_card,
    start_practice_session,
    submit_rating,
)

router = APIRouter(tags=["Practice"])


@router.post("/practice_sessions", response_model=PracticeSessionRead, status_code=201)
def create_practice_session(
    db: SessionDep, current_user: CurrentUserDep, payload: PracticeSessionCreate
):
    """Create *is* start: the session, its snapshots, and every practice_card are
    written in one transaction. There is no draft session and no deferred generation."""
    strategy = get_mastery_strategy()
    try:
        return start_practice_session(
            db,
            strategy,
            current_user.id,
            payload.name,
            payload.deck_practice_config_ids,
        )
    except SessionStartError as e:
        # detail is an object, not a string — the creation page selects several configs
        # at once and needs to render the failure against the offending one.
        status = 404 if e.code == "config_not_found" else 400
        raise HTTPException(status_code=status, detail=e.detail) from e


@router.get("/practice_sessions", response_model=list[PracticeSessionSummary], status_code=200)
def read_practice_sessions(
    db: SessionDep,
    current_user: CurrentUserDep,
    subject_id: uuid.UUID | None = None,
    deck_id: uuid.UUID | None = None,
):
    """Newest first, each row carrying the decks (and their subjects) it snapshotted.
    Filters are the same relation, asked as a question: a session matches a subject or
    deck if any of its practice_deck rows points at a matching deck (schema invariant 5
    — there is no config lineage to filter on)."""
    return db_read_practice_sessions_with_decks(db, current_user.id, subject_id, deck_id)


@router.get(
    "/practice_sessions/{practice_session_id}",
    response_model=PracticeSessionRead,
    status_code=200,
)
def read_practice_session(
    db: SessionDep, current_user: CurrentUserDep, practice_session_id: uuid.UUID
):
    session = db_read_practice_session(db, practice_session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Practice session not found")
    return session


@router.get(
    "/practice_sessions/{practice_session_id}/current_card",
    response_model=PracticeCardRead,
    status_code=200,
)
def read_current_practice_card(
    db: SessionDep, current_user: CurrentUserDep, practice_session_id: uuid.UUID
):
    if not db_read_practice_session(db, practice_session_id, current_user.id):
        raise HTTPException(status_code=404, detail="Practice session not found")
    card = get_current_practice_card(db, practice_session_id, current_user.id)
    if not card:
        raise HTTPException(status_code=404, detail="No pending practice card")
    return card


@router.post(
    "/practice_cards/{practice_card_id}/rate",
    response_model=RatingSubmissionResult,
    status_code=200,
)
def rate_practice_card(
    db: SessionDep,
    current_user: CurrentUserDep,
    practice_card_id: uuid.UUID,
    payload: RatingSubmission,
):
    strategy = get_mastery_strategy()
    try:
        rated, requeued = submit_rating(
            db, strategy, current_user.id, practice_card_id, payload.ratings
        )
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return RatingSubmissionResult(rated_practice_card=rated, requeued_practice_card=requeued)
