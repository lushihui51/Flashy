import jwt
from config import settings


def verify_clerk_session(token: str, public_key: str) -> dict:
    """
    Verify the Clerk session token using the provided public key.
    """
    payload = jwt.decode(
        token,
        public_key,
        algorithms=["RS256"],
        options={"require": ["azp"]},
        # issuer=settings.clerk_issuer, TODO Once Clerk is setup
    )

    # Verify azp claim against permitted origins
    if payload.get("azp") not in settings.permitted_origins:
        raise jwt.InvalidTokenError("Invalid 'azp' claim in token.")

    return payload
