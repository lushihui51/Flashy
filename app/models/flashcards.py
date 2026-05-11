import datetime
import uuid
from typing import Any

from sqlalchemy import Column, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class Subject(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str


class Deck(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    subject_id: uuid.UUID = Field(foreign_key="subject.id")
    name: str


class Card(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    deck_id: uuid.UUID = Field(foreign_key="deck.id")
    fields: dict[str, Any] = Field(sa_column=Column(JSONB, nullable=False))
    created_at: datetime.datetime = Field(
        sa_column=Column(
            DateTime(timezone=True), server_default=func.now(), nullable=False
        )
    )
