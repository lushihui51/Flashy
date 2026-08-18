import uuid
from datetime import datetime

from sqlmodel import Field, Relationship

from app.models.base import AppModel, TimestampMixin
from app.models.card_field_value import CardFieldValue


class CardBase(AppModel):
    deck_id: uuid.UUID = Field(foreign_key="deck.id")


class Card(CardBase, TimestampMixin, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    values: list[CardFieldValue] = Relationship(
        back_populates="card", sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )


class CardCreate(CardBase):
    values: dict[uuid.UUID, str]


class CardRead(CardBase):
    id: uuid.UUID
    created_at: datetime
    values: dict[uuid.UUID, str]


class CardUpdate(AppModel):
    values: dict[uuid.UUID, str]
