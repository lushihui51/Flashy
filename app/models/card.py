import uuid
from datetime import datetime
from typing import Any

from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Column, DateTime, Field, SQLModel, func


class CardBase(SQLModel):
    deck_id: uuid.UUID = Field(foreign_key="deck.id")
    fields: dict[str, Any] = Field(sa_column=Column(JSONB, nullable=False))


class Card(CardBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    last_modified: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
            nullable=False,
        )
    )


class CardCreate(CardBase):
    pass


class CardRead(CardBase):
    id: uuid.UUID
    last_modified: datetime


class CardUpdate(SQLModel):
    deck_id: uuid.UUID | None = None
    fields: dict[str, Any] | None = None
