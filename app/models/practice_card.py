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
            "practice_session_id", "position", deferrable=True, initially="DEFERRED"
        ),
        Index(
            "ix_practice_card_session_status_position",
            "practice_session_id",
            "status",
            "position",
        ),
        CheckConstraint("status IN ('pending', 'passed', 'failed')", name="status_valid"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # ON DELETE CASCADE — a practice_card belongs to its session outright (ADR 015 as amended).
    # ADR 015 made the *card* side cascade; this is the session side, which deleting a
    # session needs. review_log is unaffected: its practice_card_id already goes SET
    # NULL, and card_id/field_def_id stay populated, so mastery replays identically.
    practice_session_id: uuid.UUID = Field(
        foreign_key="practice_session.id", ondelete="CASCADE"
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
    practice_session_id: uuid.UUID
    card_id: uuid.UUID
    position: int
    prompts: list[uuid.UUID]
    answers: list[uuid.UUID]
    status: PracticeCardStatus
    created_at: datetime


class RatingSubmission(AppModel):
    ratings: dict[uuid.UUID, int]


class RatingSubmissionResult(AppModel):
    rated_practice_card: PracticeCardRead
    requeued_practice_card: PracticeCardRead | None
