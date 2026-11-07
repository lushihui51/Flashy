"""Composite request/response shapes for the practice_run router — models that nest
another entity's shape or describe a flow or page rather than one row of a table;
entity modules under `app/models/` hold only a table and its own single-row shapes."""

import uuid
from enum import Enum

from app.mastery.readiness import ChangeKind
from app.models.base import AppModel
from app.models.field_def import FieldType
from app.models.practice_card import PracticeCardRead
from app.models.practice_run import PracticeRunRead, RunStatus


class PracticeRunDeckSummary(AppModel):
    """One deck a session touches, resolved through `practice_deck → deck → subject`.

    This chain is the only link between a session and a subject/deck, and the only thing
    the filters use. `practice_deck.source_config_id` is read here for the label
    only: `configuration_name` is the live configuration's name while
    the link resolves, else the snapshot's stored `source_config_name`, else None. The
    link is never read for filtering, generation, validation or rerun."""

    deck_id: uuid.UUID
    deck_name: str
    subject_id: uuid.UUID
    subject_name: str
    configuration_name: str | None


class PracticeRunSummary(PracticeRunRead):
    """A list row for the practice overview: the session plus the decks it snapshotted,
    so the client can render and filter by subject/deck without a second round trip or a
    client-side join.

    `decks` lists every snapshot of the run — a `practice_deck` never outlives its
    deck: deleting a deck deletes its snapshots with it, and a run
    left owning no snapshot at all is deleted alongside its last one. There is no
    "deleted deck" state for a summary to represent."""

    decks: list[PracticeRunDeckSummary]


class ResolvedFieldValue(AppModel):
    """One prompt/answer field id from a practice_card's `prompts`/`answers` array,
    joined against its field_def (name, type) and this card's current value — the
    server-side resolution every run payload uses instead of bare ids. `value` is `""`
    when no card_field_value row exists for this (card, field) pair; it is passed
    through as-is even if blank, since a value can go blank *after* the practice_card
    was generated (the blank filter governs generation-time candidacy, not later edits)."""

    field_def_id: uuid.UUID
    name: str
    type: FieldType
    value: str


class RunProgress(AppModel):
    """The live-progress counts: `total_cards` is fixed at session start
    (distinct card_ids that received a practice_card row then) and never changes, so
    the other four counts — a partition of it by chain-fold bucket — only ever
    redistribute, never grow the denominator mid-session."""

    total_cards: int
    unseen: int
    retry_pending: int
    passed: int
    still_failed: int


class CurrentRunCard(AppModel):
    practice_card_id: uuid.UUID
    card_id: uuid.UUID
    attempt: int  # 1-based index of this row in its card_id's chain
    prompts: list[ResolvedFieldValue]  # field_def.position ascending
    answers: list[ResolvedFieldValue]  # field_def.position ascending


class PracticeRunState(AppModel):
    """The whole `GET .../state` payload — everything the run page needs to
    render one screen, in one round trip. `current_card` is None once nothing is
    pending, which is also exactly when `session_status` reads `completed`."""

    session_name: str
    session_status: RunStatus
    progress: RunProgress
    current_card: CurrentRunCard | None


class RatedFieldValue(ResolvedFieldValue):
    """A resolved answer field plus the rating it was given, joined from `review_log`
    on `review_group_id == practice_card.id` and `field_def_id`."""

    rating: int


class FieldSide(str, Enum):
    """Where a card opened from the summary lists a field: `prompt` when any attempt showed
    it, `answer` when attempts only asked it."""

    prompt = "prompt"
    answer = "answer"


class BreakdownAttempt(AppModel):
    """One go at a card, by what it showed and what it asked."""

    practice_card_id: uuid.UUID
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


class PracticeRunBreakdown(AppModel):
    """The whole `GET .../breakdown` payload: every card and what the run did to it, so the
    summary needs no second request. Only ever built for a completed session; the router
    409s an active one before this is composed."""

    total_cards: int
    cards: list[BreakdownCard]  # ordered by first attempt's position ascending


class RatingSubmission(AppModel):
    ratings: dict[uuid.UUID, int]


class RatingSubmissionResult(AppModel):
    rated_practice_card: PracticeCardRead
    requeued_practice_card: PracticeCardRead | None
