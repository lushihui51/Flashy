from __future__ import annotations

import uuid
from typing import List

from pydantic import field_validator
from sqlalchemy import Column, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlmodel import Field

from app.models.app_model import AppModel


class DeckConfigBase(AppModel):
    deck_id: uuid.UUID = Field(foreign_key="deck.id")
    static_reveals: List[str] = Field(sa_column=Column(ARRAY(String), nullable=False))
    static_conceals: List[str] = Field(sa_column=Column(ARRAY(String), nullable=False))
    dynamic_reveals: List[str] = Field(sa_column=Column(ARRAY(String), nullable=False))
    dynamic_reveal_quantities: list[int] = Field(
        sa_column=Column(ARRAY(Integer), nullable=False)
    )
    dynamic_conceals: List[str] = Field(sa_column=Column(ARRAY(String), nullable=False))
    dynamic_conceal_quantities: list[int] = Field(
        sa_column=Column(ARRAY(Integer), nullable=False)
    )


class DeckConfig(DeckConfigBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)


class DeckConfigCreate(DeckConfigBase):
    @field_validator(
        "static_reveals",
        "static_conceals",
        "dynamic_reveals",
        "dynamic_conceals",
        "dynamic_reveal_quantities",
        "dynamic_conceal_quantities",
        mode="before",
    )
    @classmethod
    def parse_empty_form_field(cls, v):
        if v == [""]:
            return []
        if isinstance(v, list) and len(v) == 1 and "," in v[0]:
            return [part.strip() for part in v[0].split(",") if part.strip()]
        return v


class DeckConfigRead(DeckConfigBase):
    id: uuid.UUID


class DeckConfigUpdate(AppModel):
    deck_id: uuid.UUID | None = None
    static_reveals: List[str] | None = None
    static_conceals: List[str] | None = None
    dynamic_reveals: List[str] | None = None
    dynamic_reveal_quantities: list[int] | None = None
    dynamic_conceals: List[str] | None = None
    dynamic_conceal_quantities: list[int] | None = None
