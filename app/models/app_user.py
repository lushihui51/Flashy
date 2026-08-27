import uuid

from sqlalchemy import Column, String
from sqlmodel import Field

from app.models.base import AppModel, TimestampMixin

DEFAULT_TIMEZONE = "UTC"


class AppUser(AppModel, TimestampMixin, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    clerk_user_id: str = Field(unique=True)
    # ADR 019: the user's IANA zone name (e.g. "America/Los_Angeles"), supplied by the
    # client on every request via the X-Timezone header. This is a *rendering* input and
    # nothing else — every stored timestamp is a server-stamped UTC instant, so changing
    # this value changes what the user sees and never what is stored or how it orders.
    # Defaults to UTC until a client has told us otherwise.
    timezone: str = Field(
        default=DEFAULT_TIMEZONE,
        sa_column=Column(String, nullable=False, server_default=DEFAULT_TIMEZONE),
    )
