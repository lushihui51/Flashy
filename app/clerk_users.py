"""Calls to Clerk's server API, which administers the users of the Clerk instance whose
secret key `settings.clerk_secret_key` holds."""

import httpx

from app.config import settings

CLERK_API_URL = "https://api.clerk.com/v1"
CLERK_TIMEOUT_SECONDS = 10.0


class ClerkUnavailable(Exception):
    """Clerk answered a request with anything but success, or did not answer in time."""


def delete_clerk_user(clerk_user_id: str) -> None:
    """Deletes the user `clerk_user_id` at Clerk, by `DELETE {CLERK_API_URL}/users/{clerk_user_id}`
    with `settings.clerk_secret_key` as a Bearer token and a timeout of CLERK_TIMEOUT_SECONDS.
    Raises ClerkUnavailable on any answer but a 2xx, its message naming the status, and on
    any `httpx.HTTPError`, its message naming the error."""
    try:
        response = httpx.delete(
            f"{CLERK_API_URL}/users/{clerk_user_id}",
            headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
            timeout=CLERK_TIMEOUT_SECONDS,
        )
    except httpx.HTTPError as error:
        raise ClerkUnavailable(f"Clerk's DELETE /users raised {error!r}") from error
    if not response.is_success:
        raise ClerkUnavailable(f"Clerk's DELETE /users answered {response.status_code}")
