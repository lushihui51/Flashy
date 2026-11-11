import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from app.database import SessionDep
from app.dependencies import CurrentUserDep
from app.models.deletion_payloads import DeletionImpactRead
from app.services.deletion import compute_deletion_impact

router = APIRouter(prefix="/deletion-impact", tags=["Deletion"])

# FastAPI reads a bare `list[...]` parameter as a request body, not a query
# parameter, so on a GET that body is absent and the default wins regardless of
# what's on the query string. Query() is what binds repeated `?x=a&x=b` keys.
_IdListQuery = Annotated[list[uuid.UUID], Query()]


@router.get("", response_model=DeletionImpactRead)
def get_deletion_impact(
    db: SessionDep,
    current_user: CurrentUserDep,
    deck_ids: _IdListQuery = [],  # noqa: B006 — FastAPI query params, not shared state
    field_ids: _IdListQuery = [],  # noqa: B006
    card_ids: _IdListQuery = [],  # noqa: B006
):
    """The advisory preview behind every delete confirm: the same closure a deletion
    transaction computes for itself, reported as counts. 404 for the first id that's
    foreign or doesn't exist; 422 when all three lists are empty — there's nothing to
    preview."""
    if not (deck_ids or field_ids or card_ids):
        raise HTTPException(status_code=422, detail="at least one id is required")
    try:
        impact = compute_deletion_impact(
            db,
            current_user.id,
            deck_ids=deck_ids,
            field_ids=field_ids,
            card_ids=card_ids,
        )
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    return DeletionImpactRead(
        decks_deleted=len(impact.deck_ids),
        fields_deleted=len(impact.field_ids),
        cards_deleted=len(impact.card_ids),
        cards_affected=impact.affected_card_count,
        runs_deleted=len(impact.run_ids),
        practices_affected=len(impact.practice_ids),
    )
