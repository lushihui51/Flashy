import uuid
from datetime import datetime

from sqlalchemy import ARRAY, CheckConstraint, Index, SmallInteger, Uuid
from sqlmodel import Column, DateTime, Field, UniqueConstraint, func

from app.models.base import AppModel


class ReviewLog(AppModel, table=True):
    __table_args__ = (
        CheckConstraint("rating BETWEEN 1 AND 4", name="rating_range"),
        UniqueConstraint("review_group_id", "field_def_id"),
        Index("ix_review_log_card_id_reviewed_at", "card_id", "reviewed_at"),
        Index("ix_review_log_review_group_id", "review_group_id"),
        Index("ix_review_log_card_id_field_def_id", "card_id", "field_def_id"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="app_user.id")
    card_id: uuid.UUID = Field(foreign_key="card.id")
    # Nullable, no FK yet — practice_card doesn't exist until Phase 4, which adds the
    # constraint. review_group_id (not this) is the durable appearance identifier.
    practice_card_id: uuid.UUID | None = Field(default=None)
    field_def_id: uuid.UUID = Field(foreign_key="field_def.id")
    review_group_id: uuid.UUID
    rating: int = Field(sa_column=Column(SmallInteger, nullable=False))
    shown_prompt_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    reviewed_at: datetime = Field(
        sa_type=DateTime(timezone=True), sa_column_kwargs={"server_default": func.now()}
    )
