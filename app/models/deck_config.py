from __future__ import annotations

import uuid

from pydantic import field_validator
from sqlalchemy import Column, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlmodel import CheckConstraint, Field

from app.models.app_model import AppModel


class DeckConfigBase(AppModel):
    deck_id: uuid.UUID = Field(foreign_key="deck.id")
    prompt_fields: list[str] = Field(sa_column=Column(ARRAY(String), nullable=False))
    answer_fields: list[str] = Field(sa_column=Column(ARRAY(String), nullable=False))
    prompt_pool: list[str] = Field(sa_column=Column(ARRAY(String), nullable=False))
    prompt_pool_counts: list[int] = Field(
        sa_column=Column(ARRAY(Integer), nullable=False)
    )
    answer_pool: list[str] = Field(sa_column=Column(ARRAY(String), nullable=False))
    answer_pool_counts: list[int] = Field(
        sa_column=Column(ARRAY(Integer), nullable=False)
    )

    __table_args__ = (
        CheckConstraint(
            "cardinality(prompt_pool) = cardinality(prompt_pool_counts)",
            name="prompt_pool_len",
        ),
    )


class DeckConfig(DeckConfigBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)


class DeckConfigCreate(DeckConfigBase):
    @field_validator(
        "prompt_fields",
        "answer_fields",
        "prompt_pool",
        "answer_pool",
        "prompt_pool_counts",
        "answer_pool_counts",
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
    prompt_fields: list[str] | None = None
    answer_fields: list[str] | None = None
    prompt_pool: list[str] | None = None
    prompt_pool_counts: list[int] | None = None
    answer_pool: list[str] | None = None
    answer_pool_counts: list[int] | None = None

    __table_args__ = (
        CheckConstraint(
            "cardinality(prompt_pool) = cardinality(prompt_pool_counts)",
            name="prompt_pool_len",
        ),
    )
