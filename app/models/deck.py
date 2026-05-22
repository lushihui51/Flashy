import uuid

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
    pass


class DeckRead(DeckBase):
    id: uuid.UUID


class DeckUpdate(AppModel):
    subject_id: uuid.UUID | None = None
    name: str | None = None
    # deck_schema: dict[str, str] | None = None
