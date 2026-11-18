from fastapi import APIRouter, HTTPException

from app.clerk_users import ClerkUnavailable
from app.database import SessionDep
from app.dependencies import CurrentUserDep
from app.mastery.config import get_mastery_strategy
from app.services.account import delete_account as delete_account_service

router = APIRouter(prefix="/account", tags=["Account"])


@router.delete("", status_code=204)
def delete_account(db: SessionDep, current_user: CurrentUserDep):
    """Deletes the requesting user's account, at Clerk and in Flashy, with everything in
    it. 502 `clerk_unavailable`, deleting nothing, when Clerk does not confirm."""
    assert current_user.clerk_user_id is not None, "a session's user always has a Clerk id"
    try:
        delete_account_service(
            db, get_mastery_strategy(), current_user.id, current_user.clerk_user_id
        )
    except ClerkUnavailable as e:
        raise HTTPException(
            status_code=502,
            detail={
                "code": "clerk_unavailable",
                "message": f"Clerk did not delete the user, so nothing was deleted: {e}",
            },
        ) from e
