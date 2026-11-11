import uuid
from datetime import datetime

from sqlalchemy import ARRAY, Integer, Uuid
from sqlmodel import Column, DateTime, Field, UniqueConstraint, func

from app.models.base import AppModel, TimestampMixin


class DeckPracticeConfigBase(AppModel):
    deck_id: uuid.UUID = Field(foreign_key="deck.id", ondelete="CASCADE")
    name: str
    prompt_field_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    answer_field_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    prompt_pool_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    prompt_pool_counts: list[int] = Field(sa_column=Column(ARRAY(Integer), nullable=False))
    answer_pool_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    answer_pool_counts: list[int] = Field(sa_column=Column(ARRAY(Integer), nullable=False))

    __table_args__ = (UniqueConstraint("deck_id", "name"),)


class DeckPracticeConfig(DeckPracticeConfigBase, TimestampMixin, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # The recency sort key — see Deck's identical field (app/models/deck.py).
    # No `onupdate`; the only writer is `touch()`.
    last_activity_at: datetime = Field(
        sa_type=DateTime(timezone=True), sa_column_kwargs={"server_default": func.now()}
    )


class DeckPracticeConfigCreate(DeckPracticeConfigBase):
    pass


class DeckPracticeConfigRead(DeckPracticeConfigBase):
    id: uuid.UUID
    created_at: datetime
    last_activity_at: datetime


class DeckPracticeConfigSummary(DeckPracticeConfigRead):
    """A list row for the config picker and the config management surface: the config
    plus the name of the deck it lives on."""

    deck_name: str


class DeckPracticeConfigUpdate(AppModel):
    name: str | None = None
    prompt_field_ids: list[uuid.UUID] | None = None
    answer_field_ids: list[uuid.UUID] | None = None
    prompt_pool_ids: list[uuid.UUID] | None = None
    prompt_pool_counts: list[int] | None = None
    answer_pool_ids: list[uuid.UUID] | None = None
    answer_pool_counts: list[int] | None = None
