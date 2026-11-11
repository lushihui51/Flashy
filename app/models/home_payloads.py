"""The composed response of the home router: a page's payload, nesting other entities'
shapes, so it lives here rather than in any entity module."""

from app.models.base import AppModel
from app.models.deck import DeckSummary
from app.models.practice_run_payloads import PracticeRunSummary, RunProgress


class HomeSteps(AppModel):
    """Whether the user has a deck and a card, the first two steps; the third, a
    practice, never exists while the steps show."""

    has_deck: bool
    has_card: bool


class HomeActivePractice(PracticeRunSummary):
    progress: RunProgress


class HomeRead(AppModel):
    # None once the user has made a practice.
    steps: HomeSteps | None
    # Up to three, most recently created first.
    active_practices: list[HomeActivePractice]
    # Up to three, the deck of the most recently rated completed practice first, each once.
    recent_decks: list[DeckSummary]
