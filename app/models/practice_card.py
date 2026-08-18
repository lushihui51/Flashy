import uuid
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
        UniqueConstraint("practice_session_id", "position"),
        Index(
            "ix_practice_card_session_status_position",
            "practice_session_id",
            "status",
            "position",
        ),
        CheckConstraint("status IN ('pending', 'passed', 'failed')", name="status_valid"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    practice_session_id: uuid.UUID = Field(foreign_key="practice_session.id")
    card_id: uuid.UUID = Field(foreign_key="card.id")
    position: int = Field(sa_column=Column(BigInteger, nullable=False))
    prompts: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    answers: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    status: PracticeCardStatus = Field(
        sa_column=Column(String, nullable=False, default=PracticeCardStatus.pending)
    )
