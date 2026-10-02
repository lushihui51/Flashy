from fastapi import APIRouter, HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.database import SessionDep
from app.database_ops.health import db_ping

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", response_model=dict[str, str], status_code=200)
def read_health(db: SessionDep) -> dict[str, str]:
    """The one route without `CurrentUserDep`: the frontend's health probe must answer
    signed-out visitors and must not depend on Clerk (ADR 064). 503
    `database_unavailable` when the database does not answer."""
    try:
        db_ping(db)
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "database_unavailable",
                "message": "Flashy is temporarily unavailable.",
            },
        ) from exc
    return {"status": "ok"}
