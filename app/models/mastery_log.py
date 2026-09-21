import uuid
from datetime import datetime

from sqlalchemy import Index, Integer, REAL
from sqlmodel import Column, DateTime, Field, UniqueConstraint

from app.models.base import AppModel


class MasteryLog(AppModel, table=True):
    """Append-only ledger (ADR 042): one row per (card, field) state change, carrying
    the full post-blend FieldMasteryState. No arithmetic lives here or in the
    repository that reads/writes it; that's the MasteryStrategy's job (invariant 8).

    The ledger's order is `reviewed_at`, not `id` (ADR 050): "latest row" always means
    greatest `reviewed_at` for a (card_id, field_def_id) pair, and every DISTINCT ON /
    ORDER BY in the repository uses that one column. `id` is an app-supplied uuid that
    identifies a row and orders nothing — a rebuild can delete and re-insert one
    deck's rows without disturbing any other deck's order, which an identity id (whose
    values follow insert time, not review time) could not survive. `reviewed_at` is
    assigned under the card's advisory lock by `record_review_group`, strictly
    increasing per card, so `UNIQUE (card_id, field_def_id, reviewed_at)` can never be
    violated by a live write; a violation means some write bypassed the lock.

    `practice_run_id` is nullable attribution, ON DELETE SET NULL — deleting a run
    must not rewind mastery, it only loses which run gets credit for the movement.
    `card_id`/`field_def_id` CASCADE, mirroring the old cache table's semantics: a
    deleted card's practice_cards cascade away with it and it leaves every breakdown
    anyway, so its ledger rows are cache-for-nothing (the raw rating history survives
    in review_log regardless). `review_group_id` is stored as provenance only — which
    appearance produced the row — never as an order key; it carries no foreign key and
    is not indexed."""

    __table_args__ = (
        UniqueConstraint(
            "card_id", "field_def_id", "reviewed_at", name="uq_mastery_log_card_field_reviewed"
        ),
        Index("ix_mastery_log_run", "practice_run_id", "reviewed_at"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    card_id: uuid.UUID = Field(foreign_key="card.id", ondelete="CASCADE", nullable=False)
    field_def_id: uuid.UUID = Field(
        foreign_key="field_def.id", ondelete="CASCADE", nullable=False
    )
    practice_run_id: uuid.UUID | None = Field(
        default=None, foreign_key="practice_run.id", ondelete="SET NULL"
    )
    review_group_id: uuid.UUID
    prompt_mastery: float = Field(sa_column=Column(REAL, nullable=False))
    answer_mastery: float = Field(sa_column=Column(REAL, nullable=False))
    prompt_review_count: int = Field(sa_column=Column(Integer, nullable=False))
    answer_review_count: int = Field(sa_column=Column(Integer, nullable=False))
    reviewed_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
