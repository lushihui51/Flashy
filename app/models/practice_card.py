import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import ARRAY, BigInteger, CheckConstraint, Index, Uuid
from sqlmodel import Column, Field, String, UniqueConstraint

from app.models.base import AppModel, TimestampMixin


class PracticeCardStatus(str, Enum):
    pending = "pending"
    passed = "passed"
    failed = "failed"


class PracticeCard(AppModel, TimestampMixin, table=True):
    __table_args__ = (
        # Deferrable — db_renumber_pending_practice_cards reassigns a whole session's
        # pending positions in one transaction, which needs to freely pass through
        # intermediate states that collide with not-yet-updated rows. Checked only at
        # COMMIT, same reasoning as field_def's position constraint.
        UniqueConstraint(
            "practice_run_id", "position", deferrable=True, initially="DEFERRED"
        ),
        Index(
            "ix_practice_card_run_status_position",
            "practice_run_id",
            "status",
            "position",
        ),
        CheckConstraint("status IN ('pending', 'passed', 'failed')", name="status_valid"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # ON DELETE CASCADE — a practice_card belongs to its session outright (ADR 015 as amended).
    # ADR 015 made the *card* side cascade; this is the session side, which deleting a
    # session needs. review_log is unaffected either way: it no longer references
    # practice_card at all (ADR 048 drops that column), so a run's or a card's
    # practice_card rows cascade away without touching review_log or the mastery
    # replayed from it.
    practice_run_id: uuid.UUID = Field(
        foreign_key="practice_run.id", ondelete="CASCADE"
    )
    # NOT NULL, ON DELETE CASCADE — a practice_card without a card is meaningless, so
    # it can't exist. review_log (not this) is the durable historical record that
    # outlives a deleted card; this row is operational session state, not history.
    card_id: uuid.UUID = Field(foreign_key="card.id", ondelete="CASCADE")
    position: int = Field(sa_column=Column(BigInteger, nullable=False))
    prompts: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    answers: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    status: PracticeCardStatus = Field(
        sa_column=Column(String, nullable=False, default=PracticeCardStatus.pending)
    )


class PracticeCardRead(AppModel):
    id: uuid.UUID
    practice_run_id: uuid.UUID
    card_id: uuid.UUID
    position: int
    prompts: list[uuid.UUID]
    answers: list[uuid.UUID]
    status: PracticeCardStatus
    created_at: datetime
