import uuid
from datetime import datetime

from sqlalchemy import Column, String
from sqlmodel import DateTime, Field, UniqueConstraint, func

from app.models.base import AppModel, TimestampMixin

DEFAULT_SUBJECT_ICON = "book-open"
DEFAULT_SUBJECT_DESCRIPTION = ""


class SubjectBase(AppModel):
    name: str
    icon: str = Field(
        default=DEFAULT_SUBJECT_ICON,
        sa_column=Column(String, nullable=False, server_default=DEFAULT_SUBJECT_ICON),
    )
    description: str = Field(
        default=DEFAULT_SUBJECT_DESCRIPTION,
        sa_column=Column(String, nullable=False, server_default=DEFAULT_SUBJECT_DESCRIPTION),
    )


class Subject(SubjectBase, TimestampMixin, table=True):
    __table_args__ = (UniqueConstraint("user_id", "name"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="app_user.id")
    # D13: recency sort key — every list of subjects is ordered by this, descending.
    # Bumps on own-column edits and on bubbled child activity (a deck created/
    # deleted/moved under this subject). No `onupdate`; the only writer is
    # `touch()` (app/services/activity.py).
    last_activity_at: datetime = Field(
        sa_type=DateTime(timezone=True), sa_column_kwargs={"server_default": func.now()}
    )


class SubjectCreate(SubjectBase):
    pass


class SubjectRead(SubjectBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    last_activity_at: datetime


class SubjectSummary(SubjectRead):
    """SubjectRead plus a deck count for a library list row (Phase 2.6). Only
    `GET /api/subjects` returns this — the subject detail page derives its own deck/
    card counts from the (separately-fetched, already-enriched) deck list instead of
    needing this here too."""

    deck_count: int


class SubjectUpdate(AppModel):
    name: str | None = None
    icon: str | None = None
    description: str | None = None
