import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import CheckConstraint
from sqlmodel import Column, Field, String

from app.models.base import AppModel, TimestampMixin


class RunStatus(str, Enum):
    """Two states, not three. `abandoned` was dropped: nothing could distinguish it from
    `completed` without tracking why a session ran out of pending cards, which ADR 015
    had already declined to invent state for. A session is either still practisable or it
    isn't (ADR 015, amended)."""

    active = "active"
    completed = "completed"


class PracticeRun(AppModel, TimestampMixin, table=True):
    """No deck_id and no curr — a session spans one practice_deck per deck (Phase 4.2),
    and the current card is derived (WHERE status='pending' ORDER BY position LIMIT 1),
    never stored."""

    __table_args__ = (
        CheckConstraint("status IN ('active', 'completed')", name="status_valid"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="app_user.id")
    # Always client-supplied and stored verbatim: the creation page pre-fills it with a
    # local date-time string it formatted itself. The server derives nothing and does no
    # timezone arithmetic here (ADR 019 — the zone is a rendering input, and this string
    # is already rendered). Not unique.
    name: str
    status: RunStatus = Field(
        sa_column=Column(String, nullable=False, default=RunStatus.active)
    )


class PracticeRunCreate(AppModel):
    name: str
    deck_practice_config_ids: list[uuid.UUID]


class PracticeRunRerun(AppModel):
    """Body of POST .../rerun (ADR 039): the client-formatted name for the new run,
    the same way PracticeRunCreate.name is — the server derives nothing."""

    name: str


class PracticeRunRead(AppModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    status: RunStatus
    created_at: datetime
