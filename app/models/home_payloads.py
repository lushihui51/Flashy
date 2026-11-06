"""The composed response of the home router: a page's payload, nesting other entities'
shapes, so it lives here rather than in any entity module."""

from app.models.base import AppModel
from app.models.deck import DeckSummary
from app.models.practice_run_payloads import PracticeRunSummary, RunProgress


class HomeSteps(AppModel):
    """Whether each of the first four things exists; the fifth, a practice, never does
    while the steps show."""

    has_subject: bool
    has_deck: bool
    has_card: bool
    has_configuration: bool


class HomeActivePractice(PracticeRunSummary):
    progress: RunProgress


class HomeRead(AppModel):
    # None once the user has made a practice.
    steps: HomeSteps | None
    # Up to three, most recently created first.
    active_practices: list[HomeActivePractice]
    # Up to three, the deck of the most recently rated completed practice first, each once.
    recent_decks: list[DeckSummary]
