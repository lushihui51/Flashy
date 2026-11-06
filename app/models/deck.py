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
    # The recency sort key — see Subject's identical field (app/models/subject.py).
    # No `onupdate`; the only writer is `touch()`.
    last_activity_at: datetime = Field(
        sa_type=DateTime(timezone=True), sa_column_kwargs={"server_default": func.now()}
    )


class DeckRead(DeckBase):
    id: uuid.UUID
    created_at: datetime
    last_activity_at: datetime


class DeckListing(DeckRead):
    """DeckRead plus what the tables give for a list row: its subject's name, card_count,
    and field_names in position order, active fields only."""

    subject_name: str
    card_count: int
    field_names: list[str]


class DeckSummary(DeckListing):
    """A deck as a list row shows it. Only `GET /api/decks` returns this; the single-deck
    reads (`GET`/`POST`/`PATCH /api/decks/{id}`) return the richer `DeckDetail` instead,
    which already includes everything here except the subject's name, card_count and
    field_names."""

    # 0 to 1, over the deck's cards; None with no card.
    readiness: float | None
