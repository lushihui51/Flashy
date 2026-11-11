import uuid
from datetime import date, datetime
from enum import Enum

from sqlalchemy import CheckConstraint, Index, text
from sqlmodel import Column, DateTime, Field, String, func

from app.models.base import AppModel, TimestampMixin


class RunStatus(str, Enum):
    """Nothing records why a run stopped being active: finished and stranded by a
    deletion both read as completed."""

    active = "active"
    completed = "completed"


class Run(AppModel, TimestampMixin, table=True):
    """One go through a practice, owned through its practice. It spans one
    `run_configuration` per deck, and its current card is its lowest-positioned pending
    `run_card`, never stored."""

    __table_args__ = (
        CheckConstraint("status IN ('active', 'completed')", name="status_valid"),
        Index(None, "practice_id", "last_activity_at"),
        Index(
            "uq_run_practice_id_active",
            "practice_id",
            unique=True,
            postgresql_where=text("status = 'active'"),
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    practice_id: uuid.UUID = Field(foreign_key="practice.id", ondelete="CASCADE")
    # At most one active run per practice.
    status: RunStatus = Field(
        sa_column=Column(String, nullable=False, default=RunStatus.active)
    )
    # The recency sort key of runs, and through them of practices. No `onupdate`; the only
    # writer is `touch()` (app/services/activity.py).
    last_activity_at: datetime = Field(
        sa_type=DateTime(timezone=True), sa_column_kwargs={"server_default": func.now()}
    )


class RunRead(AppModel):
    id: uuid.UUID
    practice_id: uuid.UUID
    status: RunStatus
    # The date of created_at in the user's stored zone.
    day: date
    # 0 for the practice's first run of that day, by created_at then id.
    day_index: int
    created_at: datetime
    last_activity_at: datetime
