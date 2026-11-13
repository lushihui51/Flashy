import uuid
from datetime import datetime

from sqlmodel import DateTime, Field, UniqueConstraint, func

from app.models.base import AppModel, TimestampMixin


class DeckBase(AppModel):
    name: str


class Deck(DeckBase, TimestampMixin, table=True):
    __table_args__ = (UniqueConstraint("user_id", "name"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="app_user.id", ondelete="CASCADE")
    # The recency sort key: every list of decks is ordered by it, descending. No
    # `onupdate`; the only writer is `touch()` (app/services/activity.py).
    last_activity_at: datetime = Field(
        sa_type=DateTime(timezone=True), sa_column_kwargs={"server_default": func.now()}
    )


class DeckRead(DeckBase):
    id: uuid.UUID
    created_at: datetime
    last_activity_at: datetime


class DeckListing(DeckRead):
    """DeckRead plus what the tables give for a list row: card_count, and field_names
    in position order, active fields only."""

    card_count: int
    field_names: list[str]


class DeckSummary(DeckListing):
    """A deck as a list row shows it. The single-deck reads
    (`GET`/`POST`/`PATCH /api/decks/{id}`) return the richer `DeckDetail` instead, which
    already includes everything here except card_count and field_names."""

    # 0 to 1, over the deck's cards; None with no card.
    readiness: float | None
