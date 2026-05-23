import json
import uuid

from pydantic import field_validator
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Column, Field

from app.models.app_model import AppModel


class DeckBase(AppModel):
    subject_id: uuid.UUID = Field(foreign_key="subject.id")
    name: str = Field(unique=True, nullable=False)
    deck_schema: dict[str, str] = Field(sa_column=Column(JSONB, nullable=False))


class Deck(DeckBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)


class DeckCreate(DeckBase):
    @field_validator("deck_schema", mode="before")
    @classmethod
    def parse_deck_schema(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                raise ValueError("deck_schema must be valid JSON")
        return v


class DeckRead(DeckBase):
    id: uuid.UUID


class DeckUpdate(AppModel):
    subject_id: uuid.UUID | None = None
    name: str | None = None
    # deck_schema: dict[str, str] | None = None
