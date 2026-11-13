import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import ARRAY, BigInteger, CheckConstraint, Index, Uuid
from sqlmodel import Column, Field, String, UniqueConstraint

from app.models.base import AppModel, TimestampMixin


class RunCardStatus(str, Enum):
    pending = "pending"
    passed = "passed"
    failed = "failed"


class RunCard(AppModel, TimestampMixin, table=True):
    """One attempt of a run at a card: a card rated Again comes back as a new row. Its id
    is the `review_group_id` of the ratings given to it."""

    __table_args__ = (
        # Deferrable — db_stage_renumber_pending_run_cards reassigns a whole run's
        # pending positions in one transaction, which needs to freely pass through
        # intermediate states that collide with not-yet-updated rows. Checked only at
        # COMMIT, same reasoning as field_def's position constraint.
        UniqueConstraint("run_id", "position", deferrable=True, initially="DEFERRED"),
        Index("ix_run_card_run_status_position", "run_id", "status", "position"),
        CheckConstraint("status IN ('pending', 'passed', 'failed')", name="status_valid"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # review_log does not reference run_card, so a run's or a card's rows cascade away
    # without touching review_log or the mastery replayed from it.
    run_id: uuid.UUID = Field(foreign_key="run.id", ondelete="CASCADE")
    card_id: uuid.UUID = Field(foreign_key="card.id", ondelete="CASCADE")
    position: int = Field(sa_column=Column(BigInteger, nullable=False))
    # Live field ids of the card's deck: a deleted field's id is removed from both.
    prompts: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    answers: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    status: RunCardStatus = Field(
        sa_column=Column(String, nullable=False, default=RunCardStatus.pending)
    )


class RunCardRead(AppModel):
    id: uuid.UUID
    run_id: uuid.UUID
    card_id: uuid.UUID
    position: int
    prompts: list[uuid.UUID]
    answers: list[uuid.UUID]
    status: RunCardStatus
    created_at: datetime
