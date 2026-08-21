import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import CheckConstraint, Index, text
from sqlmodel import Column, DateTime, Field, String, UniqueConstraint

from app.models.base import AppModel, TimestampMixin


class FieldType(str, Enum):
    text = "text"
    image = "image"
    audio = "audio"


class FieldDefBase(AppModel):
    deck_id: uuid.UUID = Field(foreign_key="deck.id")
    name: str
    type: FieldType = Field(sa_column=Column(String, nullable=False))
    position: int


class FieldDef(FieldDefBase, TimestampMixin, table=True):
    __table_args__ = (
        Index(
            "uq_field_def_deck_id_name_active",
            "deck_id",
            "name",
            unique=True,
            postgresql_where=text("archived_at IS NULL"),
        ),
        UniqueConstraint("deck_id", "position", deferrable=True, initially="DEFERRED"),
        CheckConstraint("type IN ('text', 'image', 'audio')", name="type_valid"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    archived_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True), nullable=True)
    )


class FieldDefCreate(AppModel):
    name: str
    type: FieldType


class FieldDefRead(FieldDefBase):
    id: uuid.UUID
    archived_at: datetime | None
    created_at: datetime


class FieldDefUpdate(AppModel):
    name: str | None = None
    type: FieldType | None = None
