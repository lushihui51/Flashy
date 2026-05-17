import uuid
from typing import Any

from sqlalchemy.dialects.postgresql import BIGINT, JSONB
from sqlmodel import Column, Field, Index

from app.models.app_model import AppModel


class PracticeCardBase(AppModel):
    card_id: uuid.UUID = Field(foreign_key=("card.id"))
    practice_session_id: uuid.UUID = Field(foreign_key=("practice_session.id"))
    position: int = Field(sa_column=Column(BIGINT, nullable=False))
    static_reveals: dict[str, Any] = Field(sa_column=Column(JSONB, nullable=False))
    static_conceals: dict[str, Any] = Field(sa_column=Column(JSONB, nullable=False))
    dynamic_reveals: dict[str, Any] = Field(sa_column=Column(JSONB, nullable=False))
    dynamic_conceals: dict[str, Any] = Field(sa_column=Column(JSONB, nullable=False))


class PracticeCard(PracticeCardBase, table=True):
    __table_args__ = (
        Index("ix_practice_card_position", "practice_session_id", "position"),
    )
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)


class PracticeCardRead(PracticeCardBase):
    id: uuid.UUID
