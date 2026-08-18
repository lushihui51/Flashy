import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import CheckConstraint
from sqlmodel import Column, Field, String

from app.models.base import AppModel, TimestampMixin


class SessionStatus(str, Enum):
    active = "active"
    completed = "completed"
    abandoned = "abandoned"


class PracticeSession(AppModel, TimestampMixin, table=True):
    """No deck_id and no curr — a session spans one practice_deck per deck (Phase 4.2),
    and the current card is derived (WHERE status='pending' ORDER BY position LIMIT 1),
    never stored."""

    __table_args__ = (
        CheckConstraint("status IN ('active', 'completed', 'abandoned')", name="status_valid"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="app_user.id")
    status: SessionStatus = Field(
        sa_column=Column(String, nullable=False, default=SessionStatus.active)
    )


class PracticeSessionCreate(AppModel):
    user_id: uuid.UUID
    deck_practice_config_ids: list[uuid.UUID]


class PracticeSessionRead(AppModel):
    id: uuid.UUID
    user_id: uuid.UUID
    status: SessionStatus
    created_at: datetime
