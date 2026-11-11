"""The practice router's request and response shapes; `app/models/practice.py` holds
only the table."""

import uuid
from datetime import datetime

from app.models.base import AppModel
from app.models.run import RunRead


class PracticeCreate(AppModel):
    # None or blank after stripping: the practice takes suggest_practice_name's name.
    name: str | None = None
    # In the order the user picked them; at least one.
    deck_ids: list[uuid.UUID]


class DeckNameRead(AppModel):
    deck_id: uuid.UUID
    deck_name: str


class PracticeListing(AppModel):
    """A practice as its tables give it, before its readiness is folded in."""

    id: uuid.UUID
    name: str
    created_at: datetime
    # Most recently changed deck first.
    decks: list[DeckNameRead]
    # The practice's active run, or None.
    active_run_id: uuid.UUID | None


class PracticeSummary(PracticeListing):
    # 0 to 1, over every card of the practice's decks; None when they hold no card.
    readiness: float | None


class PracticeDetail(PracticeSummary):
    # Newest last_activity_at first, then id.
    runs: list[RunRead]


class SuggestedPracticeName(AppModel):
    name: str
