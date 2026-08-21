import uuid
from datetime import datetime

from sqlmodel import Column, DateTime, Field, Integer, REAL, func

from app.models.base import AppModel


class CardFieldMastery(AppModel, table=True):
    """Pure storage — a disposable cache fully rebuildable from review_log (invariant 2).
    No arithmetic lives here or in the repository that reads/writes it; that's the
    MasteryStrategy's job (invariant 8)."""

    card_id: uuid.UUID = Field(foreign_key="card.id", ondelete="CASCADE", primary_key=True)
    field_def_id: uuid.UUID = Field(
        foreign_key="field_def.id", ondelete="CASCADE", primary_key=True
    )
    prompt_mastery: float = Field(sa_column=Column(REAL, nullable=False))
    answer_mastery: float = Field(sa_column=Column(REAL, nullable=False))
    prompt_review_count: int = Field(sa_column=Column(Integer, nullable=False))
    answer_review_count: int = Field(sa_column=Column(Integer, nullable=False))
    updated_at: datetime = Field(
        sa_type=DateTime(timezone=True), sa_column_kwargs={"server_default": func.now()}
    )
