import uuid
from datetime import datetime

from sqlmodel import Field, UniqueConstraint

from app.models.base import AppModel, TimestampMixin


class DeckBase(AppModel):
    subject_id: uuid.UUID = Field(foreign_key="subject.id")
    name: str

    __table_args__ = (UniqueConstraint("subject_id", "name"),)


class Deck(DeckBase, TimestampMixin, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)


class DeckCreate(DeckBase):
    pass


class DeckRead(DeckBase):
    id: uuid.UUID
    created_at: datetime


class DeckUpdate(AppModel):
    subject_id: uuid.UUID | None = None
    name: str | None = None
