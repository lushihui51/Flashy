"""The composed response of the home router: a page's payload, nesting other entities'
shapes, so it lives here rather than in any entity module."""

from app.models.base import AppModel
from app.models.deck import DeckSummary
from app.models.practice_payloads import DeckNameRead
from app.models.run import RunRead
from app.models.run_payloads import RunProgress


class HomeSteps(AppModel):
    """Whether the user has a deck and a card, the first two steps; the third, a
    practice, never exists while the steps show."""

    has_deck: bool
    has_card: bool


class HomeRun(RunRead):
    practice_name: str
    # The decks the run asks, most recently changed first.
    decks: list[DeckNameRead]
    progress: RunProgress


class HomeRead(AppModel):
    # None once the user has made a practice.
    steps: HomeSteps | None
    # Up to three, newest last_activity_at first.
    active_runs: list[HomeRun]
    # Up to three, the deck of the most recently rated completed run first, each once.
    recent_decks: list[DeckSummary]
