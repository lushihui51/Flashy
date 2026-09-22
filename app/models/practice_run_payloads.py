"""Composite request/response shapes for the practice_run router — models that nest
another entity's shape or describe a flow or page rather than one row of a table
(ADR 046); entity modules under `app/models/` hold only a table and its own
single-row shapes."""

import uuid
from datetime import datetime
from enum import Enum

from app.models.base import AppModel
from app.models.field_def import FieldType
from app.models.practice_card import PracticeCardRead, PracticeCardStatus
from app.models.practice_run import PracticeRunRead, RunStatus


class PracticeRunDeckSummary(AppModel):
    """One deck a session touches, resolved through `practice_deck → deck → subject`.

    This chain is the only link this payload exposes between a session and a
    subject/deck. `practice_deck.source_config_id` (ADR 040) does exist, but it is
    attribution-only, unread by any query in this cycle, and not surfaced on any API
    payload — so "which sessions relate to this deck" is still only askable this way."""

    deck_id: uuid.UUID
    deck_name: str
    subject_id: uuid.UUID
    subject_name: str


class PracticeRunSummary(PracticeRunRead):
    """A list row for the practice overview: the session plus the decks it snapshotted,
    so the client can render and filter by subject/deck without a second round trip or a
    client-side join.

    `decks` lists every snapshot of the run — a `practice_deck` no longer outlives its
    deck (ADR 047, ADR 048): deleting a deck deletes its snapshots with it, and a run
    left owning no snapshot at all is deleted alongside its last one. There is no
    "deleted deck" state left for a summary to represent."""

    decks: list[PracticeRunDeckSummary]


class ResolvedFieldValue(AppModel):
    """One prompt/answer field id from a practice_card's `prompts`/`answers` array,
    joined against its field_def (name, type) and this card's current value — the
    server-side resolution ADR 031 replaces bare-id responses with. `value` is `""`
    when no card_field_value row exists for this (card, field) pair; it is passed
    through as-is even if blank, since a value can go blank *after* the practice_card
    was generated (ADR 026 only governs generation-time candidacy, not later edits).
    `removed` is True only for a placeholder the breakdown emits for a stored id whose
    field_def row no longer exists (ADR 052); every other resolution, including the
    live run's current card, leaves it False."""

    field_def_id: uuid.UUID
    name: str
    type: FieldType
    value: str
    removed: bool = False


class RunProgress(AppModel):
    """The ADR 028 live-progress counts: `total_cards` is fixed at session start
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
    attempt: int  # 1-based index of this row in its card_id's chain (MD-3)
    prompts: list[ResolvedFieldValue]  # field_def.position ascending
    answers: list[ResolvedFieldValue]  # field_def.position ascending


class PracticeRunState(AppModel):
    """The whole `GET .../state` payload (ADR 031) — everything the run page needs to
    render one screen, in one round trip. `current_card` is None once nothing is
    pending, which is also exactly when `session_status` reads `completed`."""

    session_name: str
    session_status: RunStatus
    progress: RunProgress
    current_card: CurrentRunCard | None


class BreakdownBucket(str, Enum):
    """The completion-time refinement of the ADR 028 chain fold (ADR 029): `passed`
    splits by chain length so the breakdown can distinguish a card that took retries
    from one that didn't; `still_failed` — a chain whose last row is `failed` with no
    successor, the ADR 013 stale-snapshot case — is unaffected by length and stays one
    bucket, displayed to the user as "Abandoned"."""

    passed_first_try = "passed_first_try"
    passed_after_one_fail = "passed_after_one_fail"
    passed_after_many_fails = "passed_after_many_fails"
    still_failed = "still_failed"


class RatedFieldValue(ResolvedFieldValue):
    """A resolved answer field plus the rating it was given, joined from `review_log`
    on `review_group_id == practice_card.id` and `field_def_id`. `rating` is `None`
    exactly for a removed field's placeholder, because its review rows cascaded with
    the field (ADR 048)."""

    rating: int | None


class BreakdownAttempt(AppModel):
    practice_card_id: uuid.UUID
    status: PracticeCardStatus  # passed | failed, never pending (breakdown is completed-only)
    created_at: datetime
    prompts: list[ResolvedFieldValue]
    answers: list[RatedFieldValue]


class FieldMasteryDelta(AppModel):
    """One active field's session-delta entry (ADR 042, ADR 044, task 010 T3):
    `mastery` is the after-state field score (`strategy.field_score`, the existing
    (prompt+answer)/2), None if the field has never been reviewed by anyone. `delta`
    is always a float, never None — 0.0 for a field this run's card left untouched."""

    field_def_id: uuid.UUID
    name: str
    type: FieldType
    mastery: float | None
    delta: float


class BreakdownCard(AppModel):
    """One card's whole outcome chain for the completion breakdown (ADR 029):
    `attempts` is chronological, so `attempts[-1]` is the determining attempt that
    decided `bucket`. `mastery`/`delta`/`fields` are the session-delta addition (ADR
    042, ADR 043, ADR 044, task 010 T3): `mastery` is ADR 043's card fold over every
    active field's after-state score; `delta` is that same fold's after-state minus
    its before-state, exact (the client rounds per 010 MD-2); `fields` lists every
    currently active field_def of the card's deck, field_def.position ascending —
    not just the ones this run's attempts happened to touch."""

    card_id: uuid.UUID
    bucket: BreakdownBucket
    attempt_count: int
    primary_field: ResolvedFieldValue  # deck's active field_def at position 0 (ADR 032)
    attempts: list[BreakdownAttempt]
    mastery: float
    delta: float
    fields: list[FieldMasteryDelta]


class PracticeRunBreakdown(AppModel):
    """The whole `GET .../breakdown` payload (ADR 031): bucket counts for the tabs, and
    every card's full resolved history, so the completion screen's row-tap detail needs
    no second request. Only ever built for a completed session (ADR 029) — the router
    409s an active one before this is composed."""

    total_cards: int
    passed_first_try: int
    passed_after_one_fail: int
    passed_after_many_fails: int
    still_failed: int
    cards: list[BreakdownCard]  # ordered by first attempt's position ascending


class RatingSubmission(AppModel):
    ratings: dict[uuid.UUID, int]


class RatingSubmissionResult(AppModel):
    rated_practice_card: PracticeCardRead
    requeued_practice_card: PracticeCardRead | None
