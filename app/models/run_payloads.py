"""Composite request/response shapes for the run router — models that nest another
entity's shape or describe a flow or page rather than one row of a table; entity modules
under `app/models/` hold only a table and its own single-row shapes."""

import uuid
from datetime import date
from enum import Enum

from app.mastery.readiness import ChangeKind
from app.models.base import AppModel
from app.models.field_def import FieldType
from app.models.practice_payloads import ConfigurationArrays, DeckNameRead
from app.models.run import RunRead, RunStatus
from app.models.run_card import RunCardRead


class ResolvedFieldValue(AppModel):
    """One prompt/answer field id from a run_card's `prompts`/`answers` array,
    joined against its field_def (name, type) and this card's current value — the
    server-side resolution every run payload uses instead of bare ids. `value` is `""`
    when no card_field_value row exists for this (card, field) pair; it is passed
    through as-is even if blank, since a value can go blank *after* the run_card was
    generated (the blank filter governs generation-time candidacy, not later edits)."""

    field_def_id: uuid.UUID
    name: str
    type: FieldType
    value: str


class RunConfigurationRead(ConfigurationArrays):
    """How a run asked one deck, as it stood when the run was cut."""

    deck_id: uuid.UUID


class RunDetail(RunRead):
    practice_name: str
    # Every deck the run asked, most recently changed deck first.
    decks: list[DeckNameRead]
    # One per deck the run asked, as it asked it, in the order of `decks`.
    configurations: list[RunConfigurationRead]


class RunProgress(AppModel):
    """The live-progress counts: `total_cards` is fixed when the run is cut (distinct
    card_ids that received a run_card row then) and never changes, so the other four
    counts — a partition of it by chain-fold bucket — only ever redistribute, never grow
    the denominator mid-run."""

    total_cards: int
    unseen: int
    retry_pending: int
    passed: int
    still_failed: int


class CurrentRunCard(AppModel):
    run_card_id: uuid.UUID
    card_id: uuid.UUID
    attempt: int  # 1-based index of this row in its card_id's chain
    prompts: list[ResolvedFieldValue]  # field_def.position ascending
    answers: list[ResolvedFieldValue]  # field_def.position ascending


class RunState(AppModel):
    """The whole `GET /api/runs/{id}/state` payload — everything the run page needs to
    render one screen, in one round trip. `current_card` is None once nothing is
    pending, which is also exactly when `status` reads `completed`."""

    practice_id: uuid.UUID
    practice_name: str
    # The run's day and its place among its practice's runs of that day, as RunRead.
    day: date
    day_index: int
    status: RunStatus
    progress: RunProgress
    current_card: CurrentRunCard | None


class RunChosenCards(AppModel):
    # Each a card of the completed run the next run starts from.
    card_ids: list[uuid.UUID]


class RatedFieldValue(ResolvedFieldValue):
    """A resolved answer field plus the rating it was given, joined from `review_log`
    on `review_group_id == run_card.id` and `field_def_id`."""

    rating: int


class FieldSide(str, Enum):
    """Where a card opened from the summary lists a field: `prompt` when any attempt showed
    it, `answer` when attempts only asked it."""

    prompt = "prompt"
    answer = "answer"


class BreakdownAttempt(AppModel):
    """One go at a card, by what it showed and what it asked."""

    run_card_id: uuid.UUID
    prompts: list[ResolvedFieldValue]
    answers: list[RatedFieldValue]


class FieldReadinessDelta(AppModel):
    """One field an attempt of the run showed or asked: `readiness` is the field's readiness
    after the run, from 0 to 1, and `delta` that readiness minus its readiness before the
    run, exact."""

    field_def_id: uuid.UUID
    name: str
    type: FieldType
    side: FieldSide
    readiness: float
    delta: float
    change: ChangeKind


class BreakdownCard(AppModel):
    """One card on the summary. `readiness` is the card's readiness after the run, from 0 to
    1, over every live field of its deck, and `delta` that figure minus the same fold before
    the run, so a field the run never showed or asked counts here though `fields` omits it.
    `fields` is in field_def.position order; `attempts` is oldest first."""

    card_id: uuid.UUID
    primary_field: ResolvedFieldValue  # deck's active field_def at position 0
    readiness: float
    delta: float
    change: ChangeKind
    fields: list[FieldReadinessDelta]
    attempts: list[BreakdownAttempt]


class RunBreakdownRead(AppModel):
    """The whole `GET /api/runs/{id}/breakdown` payload: every card and what the run did to
    it, so the summary needs no second request. Only ever built for a completed run; the
    router 409s an active one before this is composed."""

    total_cards: int
    cards: list[BreakdownCard]  # ordered by first attempt's position ascending


class RatingSubmission(AppModel):
    ratings: dict[uuid.UUID, int]


class RatingSubmissionResult(AppModel):
    rated_run_card: RunCardRead
    requeued_run_card: RunCardRead | None
