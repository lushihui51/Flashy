import uuid
from datetime import datetime

from sqlmodel import DateTime, Field, Relationship, func

from app.models.base import AppModel, TimestampMixin
from app.models.card_field_value import CardFieldValue


class CardBase(AppModel):
    deck_id: uuid.UUID = Field(foreign_key="deck.id", ondelete="CASCADE")


class Card(CardBase, TimestampMixin, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # The recency sort key — see Subject's identical field (app/models/subject.py).
    # No `onupdate`; the only writer is `touch()`.
    last_activity_at: datetime = Field(
        sa_type=DateTime(timezone=True), sa_column_kwargs={"server_default": func.now()}
    )

    values: list[CardFieldValue] = Relationship(
        back_populates="card", sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )


class CardCreate(CardBase):
    values: dict[uuid.UUID, str]


class CardRead(CardBase):
    id: uuid.UUID
    created_at: datetime
    last_activity_at: datetime
    values: dict[uuid.UUID, str]


class CardUpdate(AppModel):
    values: dict[uuid.UUID, str]
