import uuid
from datetime import datetime

from sqlalchemy import ARRAY, CheckConstraint, Index, SmallInteger, Uuid
from sqlmodel import Column, DateTime, Field, UniqueConstraint, func

from app.models.base import AppModel


class ReviewLog(AppModel, table=True):
    """The append-only ledger of every rated field review (AGENTS.md's mastery
    model) — the source of truth mastery_log is rebuilt from. `card_id` and
    `field_def_id` are `NOT NULL ON DELETE CASCADE` (ADR 047, ADR 048): a persistent
    entity's deletion deletes every record that references its id, and a review of a
    card or field that no longer exists answers no question about anything, so there
    is nothing here for history to preserve past the delete. `review_group_id` is the
    durable appearance identifier `practice_card_id` used to be (that column is
    dropped) — grouping never depended on it even before."""

    __table_args__ = (
        CheckConstraint("rating BETWEEN 1 AND 4", name="rating_range"),
        UniqueConstraint("review_group_id", "field_def_id"),
        Index("ix_review_log_card_id_reviewed_at", "card_id", "reviewed_at"),
        Index("ix_review_log_review_group_id", "review_group_id"),
        Index("ix_review_log_card_id_field_def_id", "card_id", "field_def_id"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="app_user.id")
    card_id: uuid.UUID = Field(foreign_key="card.id", ondelete="CASCADE", nullable=False)
    field_def_id: uuid.UUID = Field(
        foreign_key="field_def.id", ondelete="CASCADE", nullable=False
    )
    review_group_id: uuid.UUID
    rating: int = Field(sa_column=Column(SmallInteger, nullable=False))
    shown_prompt_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    reviewed_at: datetime = Field(
        sa_type=DateTime(timezone=True), sa_column_kwargs={"server_default": func.now()}
    )
