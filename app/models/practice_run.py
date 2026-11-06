import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import CheckConstraint
from sqlmodel import Column, Field, String

from app.models.base import AppModel, TimestampMixin


class RunStatus(str, Enum):
    """Two states, not three: nothing could distinguish an "abandoned" session from a
    `completed` one without tracking why it ran out of pending cards, and no state is
    kept for that. A session is either still practisable or it isn't."""

    active = "active"
    completed = "completed"


class PracticeRun(AppModel, TimestampMixin, table=True):
    """No deck_id and no curr — a session spans one practice_deck per deck,
    and the current card is derived (WHERE status='pending' ORDER BY position LIMIT 1),
    never stored."""

    __table_args__ = (
        CheckConstraint("status IN ('active', 'completed')", name="status_valid"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="app_user.id")
    # Always client-supplied and stored verbatim: the creation page pre-fills it with a
    # local date-time string it formatted itself. The server derives nothing and does no
    # timezone arithmetic here (the zone is a rendering input, and this string is
    # already rendered). Not unique.
    name: str
    status: RunStatus = Field(
        sa_column=Column(String, nullable=False, default=RunStatus.active)
    )


class PracticeRunCreate(AppModel):
    name: str
    deck_practice_config_ids: list[uuid.UUID]


class PracticeRunRerun(AppModel):
    """Body of POST .../rerun: the client-formatted name for the new run,
    the same way PracticeRunCreate.name is — the server derives nothing."""

    name: str


class PracticeRunChosenCards(AppModel):
    """Body of POST .../chosen_cards: the client-formatted name for the new run, stored
    verbatim, and the cards to practice, each one a card of the completed practice."""

    name: str
    card_ids: list[uuid.UUID]


class PracticeRunRead(AppModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    status: RunStatus
    created_at: datetime
