import logging
from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import select

from app.config import settings
from app.database import SessionDep
from app.models.app_user import DEFAULT_TIMEZONE, AppUser
from app.services.timezone import normalize_timezone
from app.verify_clerk_session import verify_clerk_session

logger = logging.getLogger(__name__)

# TODO(defer:dev-auth-bypass) — remove this bypass once local testing no longer needs
# it (tracked as cleanup, not part of any creation-flow phase). Skips Clerk JWT
# verification entirely when both DEV_AUTH_USER_ID and ENV=development are set, so a
# request with no Authorization header at all is treated as that clerk_user_id. Double
# gated (var + ENV) so it can never activate by accident from a stray env var landing
# on a deployed environment (e.g. Railway) — never set either of these there.
_DEV_AUTH_USER_ID = settings.dev_auth_user_id
_DEV_AUTH_BYPASS_ENABLED = bool(_DEV_AUTH_USER_ID) and settings.env == "development"

if _DEV_AUTH_BYPASS_ENABLED:
    logger.warning(
        "DEV_AUTH_USER_ID is set: Clerk verification is BYPASSED for every request, "
        "operating as clerk_user_id=%s. This must never be set outside local dev.",
        _DEV_AUTH_USER_ID,
    )


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    return authorization.removeprefix("Bearer ").strip()


def _sync_timezone(db: SessionDep, user: AppUser, header_value: str | None) -> AppUser:
    """ADR 019: the client is the sole source of the user's IANA zone, and it rides
    every request rather than a one-off sign-in call, so a user who travels or changes
    their machine's zone starts rendering in the new one with no manual step. A missing
    or unresolvable header leaves the stored zone alone — it is never a reason to
    downgrade a known-good value back to UTC."""
    zone = normalize_timezone(header_value)
    if zone is None or zone == user.timezone:
        return user
    user.timezone = zone
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_current_app_user(
    db: SessionDep,
    authorization: Annotated[str | None, Header()] = None,
    x_timezone: Annotated[str | None, Header()] = None,
) -> AppUser:
    """Verifies the Clerk session token on every request and returns the app_user row,
    creating it on first sight of a clerk_user_id (lazy, same idea as mastery rows).
    Also keeps `app_user.timezone` in step with the client's X-Timezone header."""
    if _DEV_AUTH_BYPASS_ENABLED:
        clerk_user_id = _DEV_AUTH_USER_ID
    else:
        token = _extract_bearer_token(authorization)
        try:
            payload = verify_clerk_session(token)
        except jwt.PyJWTError as e:
            raise HTTPException(status_code=401, detail="Invalid session token") from e
        clerk_user_id = payload["sub"]

    user = db.exec(select(AppUser).where(AppUser.clerk_user_id == clerk_user_id)).first()
    if user is not None:
        return _sync_timezone(db, user, x_timezone)

    user = AppUser(
        clerk_user_id=clerk_user_id, timezone=normalize_timezone(x_timezone) or DEFAULT_TIMEZONE
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # Concurrent first-sight request already created it — fall back to reading it.
        db.rollback()
        user = db.exec(select(AppUser).where(AppUser.clerk_user_id == clerk_user_id)).first()
        assert user is not None, "IntegrityError on clerk_user_id implies a row exists"
        return _sync_timezone(db, user, x_timezone)
    else:
        db.refresh(user)
    return user


CurrentUserDep = Annotated[AppUser, Depends(get_current_app_user)]
