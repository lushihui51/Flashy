from __future__ import annotations

import uuid

from pydantic import field_validator
from sqlalchemy import Column, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlmodel import CheckConstraint, Field

from app.models.app_model import AppModel


class DeckConfigBase(AppModel):
    deck_id: uuid.UUID = Field(foreign_key="deck.id")
    static_reveals: list[str] = Field(sa_column=Column(ARRAY(String), nullable=False))
    static_conceals: list[str] = Field(sa_column=Column(ARRAY(String), nullable=False))
    dynamic_reveals: list[str] = Field(sa_column=Column(ARRAY(String), nullable=False))
    dynamic_reveal_quantities: list[int] = Field(
        sa_column=Column(ARRAY(Integer), nullable=False)
    )
    dynamic_conceals: list[str] = Field(sa_column=Column(ARRAY(String), nullable=False))
    dynamic_conceal_quantities: list[int] = Field(
        sa_column=Column(ARRAY(Integer), nullable=False)
    )

    __table_args__ = (
        CheckConstraint(
            "cardinality(dynamic_reveals) = cardinality(dynamic_reveal_quantities)",
            name="dynamic_reveals_len",
        ),
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
        if (
            isinstance(v, list)
            and len(v) == 1
            and isinstance(v[0], str)
            and "," in v[0]
        ):
            return [part.strip() for part in v[0].split(",") if part.strip()]
        return v


class DeckConfigRead(DeckConfigBase):
    id: uuid.UUID


class DeckConfigUpdate(AppModel):
    deck_id: uuid.UUID | None = None
    static_reveals: list[str] | None = None
    static_conceals: list[str] | None = None
    dynamic_reveals: list[str] | None = None
    dynamic_reveal_quantities: list[int] | None = None
    dynamic_conceals: list[str] | None = None
    dynamic_conceal_quantities: list[int] | None = None

    __table_args__ = (
        CheckConstraint(
            "cardinality(dynamic_reveals) = cardinality(dynamic_reveal_quantities)",
            name="dynamic_reveals_len",
        ),
    )
