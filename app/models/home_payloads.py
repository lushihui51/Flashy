"""The composed response of the home router: a page's payload, nesting other entities'
shapes, so it lives here rather than in any entity module."""

from app.models.base import AppModel
from app.models.practice_payloads import DeckNameRead, RunListing
from app.models.run_payloads import RunProgress


class HomeSteps(AppModel):
    """Whether the user has a deck and a card, the first two steps; the third, a
    practice, never exists while the steps show."""

    has_deck: bool
    has_card: bool


class HomeRun(RunListing):
    practice_name: str
    # The decks the run asks, most recently changed first.
    decks: list[DeckNameRead]
    # The live counts of an active run; None for a completed one.
    progress: RunProgress | None


class HomeRead(AppModel):
    # None once the user has made a practice.
    steps: HomeSteps | None
    # Up to three, newest last_activity_at first.
    active_runs: list[HomeRun]
    # Up to three completed runs, the latest of each practice by last_activity_at, none of a
    # practice that has an active run, newest first.
    recent_runs: list[HomeRun]
