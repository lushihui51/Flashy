import uuid

from fastapi import APIRouter, HTTPException

from app.database import SessionDep
from app.database_ops.practice_session import (
    db_delete_practice_session,
    db_read_practice_session,
    db_read_practice_session_with_decks,
    db_read_practice_sessions_with_decks,
)
from app.dependencies import CurrentUserDep
from app.mastery.config import get_mastery_strategy
from app.models.practice_card import (
    PracticeRunState,
    PracticeSessionBreakdown,
    RatingSubmission,
    RatingSubmissionResult,
)
from app.models.practice_session import (
    PracticeSessionCreate,
    PracticeSessionRead,
    PracticeSessionSummary,
)
from app.services.practice_session import (
    RerunError,
    SessionActiveError,
    SessionStartError,
    get_practice_run_state,
    get_practice_session_breakdown,
    rerun_practice_session,
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
    response_model=PracticeSessionSummary,
    status_code=200,
)
def read_practice_session(
    db: SessionDep, current_user: CurrentUserDep, practice_session_id: uuid.UUID
):
    """MD-3: the detail page needs the same deck chips the list already renders, so this
    answers with PracticeSessionSummary rather than the bare PracticeSessionRead — API-
    first beats a client-side join of the list endpoint."""
    session = db_read_practice_session_with_decks(db, practice_session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Practice session not found")
    return session


@router.delete("/practice_sessions/{practice_session_id}", status_code=204)
def delete_practice_session(
    db: SessionDep, current_user: CurrentUserDep, practice_session_id: uuid.UUID
):
    """User delete is the only way a session leaves the list — there is no `abandoned`
    status for one to fall out of view into (ADR 015 as amended)."""
    session = db_read_practice_session(db, practice_session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Practice session not found")
    db_delete_practice_session(db, session)


@router.get(
    "/practice_sessions/{practice_session_id}/run",
    response_model=PracticeRunState,
    status_code=200,
)
def read_practice_run_state(
    db: SessionDep, current_user: CurrentUserDep, practice_session_id: uuid.UUID
):
    """ADR 031: one server-composed payload, replacing the old bare-id `current_card`
    endpoint. 404 for an unknown or foreign session; `current_card: null` once nothing
    is pending, at which point `session_status` already reads "completed"."""
    state = get_practice_run_state(db, practice_session_id, current_user.id)
    if not state:
        raise HTTPException(status_code=404, detail="Practice session not found")
    return state


@router.get(
    "/practice_sessions/{practice_session_id}/breakdown",
    response_model=PracticeSessionBreakdown,
    status_code=200,
)
def read_practice_session_breakdown(
    db: SessionDep, current_user: CurrentUserDep, practice_session_id: uuid.UUID
):
    """ADR 029/031: the completion dataset behind the retrospective view. 409 while the
    session is still active — the bucket refinement only makes sense once nothing is
    pending; 404 for an unknown or foreign session."""
    try:
        breakdown = get_practice_session_breakdown(db, practice_session_id, current_user.id)
    except SessionActiveError as e:
        raise HTTPException(status_code=409, detail=e.detail) from e
    if not breakdown:
        raise HTTPException(status_code=404, detail="Practice session not found")
    return breakdown


@router.post(
    "/practice_sessions/{practice_session_id}/rerun",
    response_model=PracticeSessionRead,
    status_code=201,
)
def rerun_session(db: SessionDep, current_user: CurrentUserDep, practice_session_id: uuid.UUID):
    """ADR 030: recreates a completed session from its own frozen practice_deck
    snapshots and deletes the original, in one transaction. 404 for an unknown or
    foreign session; 400 `session_active` if it hasn't completed; 400
    `nothing_to_rerun` if every snapshot has since gone stale or lost its deck."""
    strategy = get_mastery_strategy()
    try:
        return rerun_practice_session(db, strategy, current_user.id, practice_session_id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except RerunError as e:
        raise HTTPException(status_code=400, detail=e.detail) from e


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
