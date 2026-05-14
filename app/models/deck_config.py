from __future__ import annotations

import uuid
from typing import List

from sqlalchemy import Column, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlmodel import Field, SQLModel


class DeckConfigBase(SQLModel):
    deck_id: uuid.UUID = Field(foreign_key="deck.id")
    static_reveals: List[str] = Field(sa_column=Column(ARRAY(String), nullable=False))
    static_conceals: List[str] = Field(sa_column=Column(ARRAY(String), nullable=False))
    dynamic_reveals: List[str] = Field(sa_column=Column(ARRAY(String), nullable=False))
    dynamic_reveal_quantity: list[int] = Field(
        sa_column=Column(ARRAY(Integer), nullable=False)
    )
    dynamic_conceals: List[str] = Field(sa_column=Column(ARRAY(String), nullable=False))
    dynamic_conceal_quantity: list[int] = Field(
        sa_column=Column(ARRAY(Integer), nullable=False)
    )


class DeckConfig(DeckConfigBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)


class DeckConfigCreate(DeckConfigBase):
    pass


class DeckConfigRead(DeckConfigBase):
    id: uuid.UUID


class DeckConfigUpdate(SQLModel):
    deck_id: uuid.UUID | None = None
    static_reveals: List[str] | None = None
    static_conceals: List[str] | None = None
    dynamic_reveals: List[str] | None = None
    dynamic_reveal_quantity: list[int] | None = None
    dynamic_conceals: List[str] | None = None
    dynamic_conceal_quantity: list[int] | None = None
