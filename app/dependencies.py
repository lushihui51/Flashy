from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import select

from app.database import SessionDep
from app.models.app_user import AppUser
from app.verify_clerk_session import verify_clerk_session


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    return authorization.removeprefix("Bearer ").strip()


def get_current_app_user(
    db: SessionDep, authorization: Annotated[str | None, Header()] = None
) -> AppUser:
    """Verifies the Clerk session token on every request and returns the app_user row,
    creating it on first sight of a clerk_user_id (lazy, same idea as mastery rows)."""
    token = _extract_bearer_token(authorization)
    try:
        payload = verify_clerk_session(token)
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail="Invalid session token") from e

    clerk_user_id = payload["sub"]
    user = db.exec(select(AppUser).where(AppUser.clerk_user_id == clerk_user_id)).first()
    if user is not None:
        return user

    user = AppUser(clerk_user_id=clerk_user_id)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # Concurrent first-sight request already created it — fall back to reading it.
        db.rollback()
        user = db.exec(select(AppUser).where(AppUser.clerk_user_id == clerk_user_id)).first()
        assert user is not None, "IntegrityError on clerk_user_id implies a row exists"
    else:
        db.refresh(user)
    return user


CurrentUserDep = Annotated[AppUser, Depends(get_current_app_user)]
