import uuid
from datetime import datetime

from sqlmodel import DateTime, Field, UniqueConstraint, func

from app.models.base import AppModel, TimestampMixin


class DeckBase(AppModel):
    subject_id: uuid.UUID = Field(foreign_key="subject.id", ondelete="CASCADE")
    name: str

    __table_args__ = (UniqueConstraint("subject_id", "name"),)


class Deck(DeckBase, TimestampMixin, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # D13 — see Subject's identical field (app/models/subject.py) for the full
    # rationale. No `onupdate`; the only writer is `touch()`.
    last_activity_at: datetime = Field(
        sa_type=DateTime(timezone=True), sa_column_kwargs={"server_default": func.now()}
    )


class DeckRead(DeckBase):
    id: uuid.UUID
    created_at: datetime
    last_activity_at: datetime


class DeckSummary(DeckRead):
    """DeckRead plus preview data for a list row (Phase 2.6) — card_count and
    field_names (position order, active fields only). Only `GET /api/decks` returns
    this; the single-deck reads (`GET`/`POST`/`PATCH /api/decks/{id}`) return the
    richer `DeckDetail` instead, which already includes everything here except these
    two list-row-only fields."""

    card_count: int
    field_names: list[str]
