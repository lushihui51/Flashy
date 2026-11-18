import uuid
from datetime import datetime

from sqlalchemy import Column, Index, String, text
from sqlmodel import DateTime, Field

from app.models.base import AppModel, TimestampMixin

DEFAULT_TIMEZONE = "UTC"


class AppUser(AppModel, TimestampMixin, table=True):
    __table_args__ = (
        Index(
            "uq_app_user_example",
            text("(clerk_user_id IS NULL)"),
            unique=True,
            postgresql_where=text("clerk_user_id IS NULL"),
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # The `sub` of the user's verified Clerk token. Null on one row at most: the example
    # user, whose library every guest is shown and whom no session signs in as.
    clerk_user_id: str | None = Field(unique=True)
    # The user's IANA zone name (e.g. "America/Los_Angeles"), supplied by the client via
    # the X-Timezone header of every request signed in as the user. The example user's
    # comes from no request: it stays the zone its library was made in, whatever a guest's
    # request sends. This is a *rendering* input and
    # nothing else — every stored timestamp is a server-stamped UTC instant, so changing
    # this value changes what the user sees and never what is stored or how it orders.
    # Defaults to UTC until a client has told us otherwise.
    timezone: str = Field(
        default=DEFAULT_TIMEZONE,
        sa_column=Column(String, nullable=False, server_default=DEFAULT_TIMEZONE),
    )
    # The server's instant of the user's first run, cut on any path; null until they
    # start one. It records that event, so it stays set whatever the user later deletes.
    first_run_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
