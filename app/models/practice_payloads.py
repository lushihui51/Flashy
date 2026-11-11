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


class PracticeUpdate(AppModel):
    # Stripped before it is stored; blank after stripping is refused.
    name: str


class DeckNameRead(AppModel):
    deck_id: uuid.UUID
    deck_name: str


class ConfigurationArrays(AppModel):
    """How a deck is asked: the fields every card shows or asks on each side, and the
    fields drawn at random on each side with the counts one draw picks from."""

    prompt_field_ids: list[uuid.UUID]
    answer_field_ids: list[uuid.UUID]
    prompt_pool_ids: list[uuid.UUID]
    prompt_pool_counts: list[int]
    answer_pool_ids: list[uuid.UUID]
    answer_pool_counts: list[int]


class PracticeConfigurationRead(ConfigurationArrays):
    """How the practice's next run asks one of its decks."""

    deck_id: uuid.UUID


class RunListing(RunRead):
    """A run as a practice's page lists it, with how many of its cards it reached."""

    # Distinct cards among the run's run_card rows that are no longer pending.
    reached_cards: int
    # The run's run_counted_card rows: the cards it could ask when cut, less any deleted since.
    counted_cards: int


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
    runs: list[RunListing]
    # One per deck of the practice, in the order of `decks`.
    configurations: list[PracticeConfigurationRead]


class SuggestedPracticeName(AppModel):
    name: str
