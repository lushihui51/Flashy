"""IANA timezone validation for ADR 019.

The user's zone arrives from the client on every request and is stored on `app_user`
purely so that read paths can format and bucket dates in it. It is never consulted when
writing, ordering, or comparing instants.
"""

import re
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.models.app_user import DEFAULT_TIMEZONE

__all__ = ["DEFAULT_TIMEZONE", "normalize_timezone"]

# IANA zone keys are slash-separated ASCII components. Matching this before touching
# ZoneInfo keeps an arbitrary client-supplied string from reaching the tz database
# lookup at all — note that disallowing "." also rules out "." and ".." components.
_ZONE_KEY_RE = re.compile(r"\A[A-Za-z0-9+_-]+(?:/[A-Za-z0-9+_-]+)*\Z")
_MAX_ZONE_KEY_LENGTH = 64


def normalize_timezone(value: str | None) -> str | None:
    """Returns `value` if it is a resolvable IANA zone key, otherwise None.

    Returning None (rather than falling back to UTC) lets callers distinguish "the
    client told us nothing usable" from "the client told us UTC", so a garbage header
    leaves an already-known good zone in place instead of overwriting it.
    """
    if not value or len(value) > _MAX_ZONE_KEY_LENGTH or not _ZONE_KEY_RE.match(value):
        return None
    try:
        ZoneInfo(value)
    except (ZoneInfoNotFoundError, ValueError):
        return None
    return value
