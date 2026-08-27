import uuid
from datetime import datetime

from sqlalchemy import ARRAY, Integer, Uuid
from sqlmodel import Column, Field, UniqueConstraint

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


class DeckPracticeConfigCreate(DeckPracticeConfigBase):
    pass


class DeckPracticeConfigRead(DeckPracticeConfigBase):
    id: uuid.UUID
    created_at: datetime


class DeckPracticeConfigSummary(DeckPracticeConfigRead):
    """A list row for the config picker and the config management surface: the config
    plus where it lives. Two decks in different subjects may share a name, so a row is
    only unambiguous with its subject alongside its deck."""

    deck_name: str
    subject_id: uuid.UUID
    subject_name: str


class DeckPracticeConfigUpdate(AppModel):
    name: str | None = None
    prompt_field_ids: list[uuid.UUID] | None = None
    answer_field_ids: list[uuid.UUID] | None = None
    prompt_pool_ids: list[uuid.UUID] | None = None
    prompt_pool_counts: list[int] | None = None
    answer_pool_ids: list[uuid.UUID] | None = None
    answer_pool_counts: list[int] | None = None
