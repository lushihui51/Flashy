from __future__ import annotations

import uuid

from sqlalchemy import Column, Integer
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlmodel import Field, SQLModel


class PracticeConfigBase(SQLModel):
    deck_id: uuid.UUID = Field(foreign_key="deck.id")
    static_reveals: dict[str, str] = Field(sa_column=Column(JSONB, nullable=False))
    static_conceals: dict[str, str] = Field(sa_column=Column(JSONB, nullable=False))
    dynamic_reveals: dict[str, str] = Field(sa_column=Column(JSONB, nullable=False))
    dynamic_reveal_quantity: list[int] = Field(
        sa_column=Column(ARRAY(Integer), nullable=False)
    )
    dynamic_conceals: dict[str, str] = Field(sa_column=Column(JSONB, nullable=False))
    dynamic_conceal_quantity: list[int] = Field(
        sa_column=Column(ARRAY(Integer), nullable=False)
    )


class PracticeConfig(PracticeConfigBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)


class PracticeConfigCreate(PracticeConfigBase):
    pass


class PracticeConfigRead(PracticeConfigBase):
    id: uuid.UUID


class PracticeConfigUpdate(SQLModel):
    deck_id: uuid.UUID | None = None
    static_reveals: dict[str, str] | None = None
    static_conceals: dict[str, str] | None = None
    dynamic_reveals: dict[str, str] | None = None
    dynamic_reveal_quantity: list[int] | None = None
    dynamic_conceals: dict[str, str] | None = None
    dynamic_conceal_quantity: list[int] | None = None
