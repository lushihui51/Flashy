import json
import uuid
from datetime import datetime
from typing import Any

from pydantic import field_validator
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Column, DateTime, Field, func

from app.models.app_model import AppModel


class CardBase(AppModel):
    deck_id: uuid.UUID = Field(foreign_key="deck.id")
    fields: dict[str, Any] = Field(sa_column=Column(JSONB, nullable=False))


class Card(CardBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    last_modified: datetime = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
            nullable=False,
        ),
    )


class CardCreate(CardBase):
    @field_validator("fields", mode="before")
    @classmethod
    def parse_deck_schema(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                raise ValueError("fields must be valid JSON")
        return v


class CardRead(CardBase):
    id: uuid.UUID
    last_modified: datetime


class CardUpdate(AppModel):
    deck_id: uuid.UUID | None = None
    fields: dict[str, Any] | None = None
