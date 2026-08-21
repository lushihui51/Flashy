from functools import lru_cache

import jwt
from jwt import PyJWKClient

from app.config import settings


@lru_cache
def _jwks_client() -> PyJWKClient:
    return PyJWKClient(f"{settings.clerk_fapi_url}/.well-known/jwks.json")


def verify_clerk_session(token: str) -> dict:
    """Verifies a Clerk session JWT: signature against Clerk's JWKS (cached, refetched
    on unknown kid), issuer, and the azp claim against permitted_origins. Raises a
    jwt.PyJWTError subclass on any failure — callers map that to 401."""
    signing_key = _jwks_client().get_signing_key_from_jwt(token)
    payload = jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        issuer=settings.clerk_fapi_url,
        options={"require": ["azp", "sub", "iss"]},
    )

    if payload.get("azp") not in settings.permitted_origins:
        raise jwt.InvalidTokenError("Invalid 'azp' claim in token.")

    return payload
