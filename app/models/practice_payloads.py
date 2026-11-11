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


class PracticeSummary(AppModel):
    id: uuid.UUID
    name: str
    created_at: datetime
    # Most recently changed deck first.
    decks: list[DeckNameRead]
    # The practice's active run, or None.
    active_run_id: uuid.UUID | None


class PracticeDetail(PracticeSummary):
    # Newest last_activity_at first, then id.
    runs: list[RunRead]


class SuggestedPracticeName(AppModel):
    name: str
