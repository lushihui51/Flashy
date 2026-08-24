import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import CheckConstraint
from sqlmodel import Column, Field, String

from app.models.base import AppModel, TimestampMixin


class SessionStatus(str, Enum):
    """Two states, not three. `abandoned` was dropped: nothing could distinguish it from
    `completed` without tracking why a session ran out of pending cards, which ADR 015
    had already declined to invent state for. A session is either still practisable or it
    isn't (ADR 015, amended)."""

    active = "active"
    completed = "completed"


class PracticeSession(AppModel, TimestampMixin, table=True):
    """No deck_id and no curr — a session spans one practice_deck per deck (Phase 4.2),
    and the current card is derived (WHERE status='pending' ORDER BY position LIMIT 1),
    never stored."""

    __table_args__ = (
        CheckConstraint("status IN ('active', 'completed')", name="status_valid"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="app_user.id")
    # Always client-supplied and stored verbatim: the creation page pre-fills it with a
    # local date-time string it formatted itself. The server derives nothing and does no
    # timezone arithmetic here (ADR 019 — the zone is a rendering input, and this string
    # is already rendered). Not unique.
    name: str
    status: SessionStatus = Field(
        sa_column=Column(String, nullable=False, default=SessionStatus.active)
    )


class PracticeSessionCreate(AppModel):
    name: str
    deck_practice_config_ids: list[uuid.UUID]


class PracticeSessionRead(AppModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    status: SessionStatus
    created_at: datetime


class PracticeSessionDeckSummary(AppModel):
    """One deck a session touches, resolved through `practice_deck → deck → subject`.

    This chain is the *only* link between a session and a subject/deck — `practice_deck`
    has no `source_config_id` and never will (schema invariant 5), so "which sessions
    relate to this deck" can only be asked this way."""

    deck_id: uuid.UUID
    deck_name: str
    subject_id: uuid.UUID
    subject_name: str


class PracticeSessionSummary(PracticeSessionRead):
    """A list row for the practice overview: the session plus the decks it snapshotted,
    so the client can render and filter by subject/deck without a second round trip or a
    client-side join.

    `decks` omits any `practice_deck` whose source deck has since been deleted
    (`deck_id` is nullable with ON DELETE SET NULL, ADR 015) — the snapshot survives and
    the session still lists, but a deleted deck has no name or subject left to show and
    can never match a filter. Those snapshots are counted in `deleted_deck_count`
    instead, so the client can render them as "deleted deck" chips: with `abandoned`
    gone, a session stranded by a deck deletion reads as Completed, and the chip is the
    only thing that tells the two apart (ADR 015 as amended)."""

    decks: list[PracticeSessionDeckSummary]
    deleted_deck_count: int
