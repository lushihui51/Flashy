import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import ARRAY, BigInteger, CheckConstraint, Index, Uuid
from sqlmodel import Column, Field, String, UniqueConstraint

from app.models.base import AppModel, TimestampMixin
from app.models.field_def import FieldType
from app.models.practice_session import SessionStatus


class PracticeCardStatus(str, Enum):
    pending = "pending"
    passed = "passed"
    failed = "failed"


class PracticeCard(AppModel, TimestampMixin, table=True):
    __table_args__ = (
        # Deferrable — db_renumber_pending_practice_cards reassigns a whole session's
        # pending positions in one transaction, which needs to freely pass through
        # intermediate states that collide with not-yet-updated rows. Checked only at
        # COMMIT, same reasoning as field_def's position constraint.
        UniqueConstraint(
            "practice_session_id", "position", deferrable=True, initially="DEFERRED"
        ),
        Index(
            "ix_practice_card_session_status_position",
            "practice_session_id",
            "status",
            "position",
        ),
        CheckConstraint("status IN ('pending', 'passed', 'failed')", name="status_valid"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # ON DELETE CASCADE — a practice_card belongs to its session outright (ADR 015 as amended).
    # ADR 015 made the *card* side cascade; this is the session side, which deleting a
    # session needs. review_log is unaffected: its practice_card_id already goes SET
    # NULL, and card_id/field_def_id stay populated, so mastery replays identically.
    practice_session_id: uuid.UUID = Field(
        foreign_key="practice_session.id", ondelete="CASCADE"
    )
    # NOT NULL, ON DELETE CASCADE — a practice_card without a card is meaningless, so
    # it can't exist. review_log (not this) is the durable historical record that
    # outlives a deleted card; this row is operational session state, not history.
    card_id: uuid.UUID = Field(foreign_key="card.id", ondelete="CASCADE")
    position: int = Field(sa_column=Column(BigInteger, nullable=False))
    prompts: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    answers: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    status: PracticeCardStatus = Field(
        sa_column=Column(String, nullable=False, default=PracticeCardStatus.pending)
    )


class PracticeCardRead(AppModel):
    id: uuid.UUID
    practice_session_id: uuid.UUID
    card_id: uuid.UUID
    position: int
    prompts: list[uuid.UUID]
    answers: list[uuid.UUID]
    status: PracticeCardStatus
    created_at: datetime


class RatingSubmission(AppModel):
    ratings: dict[uuid.UUID, int]


class RatingSubmissionResult(AppModel):
    rated_practice_card: PracticeCardRead
    requeued_practice_card: PracticeCardRead | None


class ResolvedFieldValue(AppModel):
    """One prompt/answer field id from a practice_card's `prompts`/`answers` array,
    joined against its field_def (name, type) and this card's current value — the
    server-side resolution ADR 031 replaces bare-id responses with. `value` is `""`
    when no card_field_value row exists for this (card, field) pair; it is passed
    through as-is even if blank, since a value can go blank *after* the practice_card
    was generated (ADR 026 only governs generation-time candidacy, not later edits)."""

    field_def_id: uuid.UUID
    name: str
    type: FieldType
    value: str


class SessionProgress(AppModel):
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
    """The whole `GET .../run` payload (ADR 031) — everything the run page needs to
    render one screen, in one round trip. `current_card` is None once nothing is
    pending, which is also exactly when `session_status` reads `completed`."""

    session_name: str
    session_status: SessionStatus
    progress: SessionProgress
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
    on `review_group_id == practice_card.id` and `field_def_id`. `None` only if that
    `review_log` row exists but was orphaned (its `field_def_id` went `SET NULL` on a
    hard delete) — never for a row that simply hasn't been rated, since a `passed`/
    `failed` practice_card was rated on every one of its answer fields by construction
    (`submit_rating`)."""

    rating: int | None


class BreakdownAttempt(AppModel):
    practice_card_id: uuid.UUID
    status: PracticeCardStatus  # passed | failed, never pending (breakdown is completed-only)
    created_at: datetime
    prompts: list[ResolvedFieldValue]
    answers: list[RatedFieldValue]


class BreakdownCard(AppModel):
    """One card's whole outcome chain for the completion breakdown (ADR 029):
    `attempts` is chronological, so `attempts[-1]` is the determining attempt that
    decided `bucket`."""

    card_id: uuid.UUID
    bucket: BreakdownBucket
    attempt_count: int
    primary_field: ResolvedFieldValue  # deck's active field_def at position 0 (ADR 032)
    attempts: list[BreakdownAttempt]


class PracticeSessionBreakdown(AppModel):
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
