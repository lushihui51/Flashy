import uuid
from datetime import datetime

from sqlalchemy import BigInteger, Identity, Index, Integer, REAL
from sqlmodel import Column, DateTime, Field

from app.models.base import AppModel


class MasteryLog(AppModel, table=True):
    """Append-only ledger (ADR 042): one row per (card, field) state change, carrying
    the full post-blend FieldMasteryState. No arithmetic lives here or in the
    repository that reads/writes it; that's the MasteryStrategy's job (invariant 8).

    The ledger's total order is `id`, not `reviewed_at` — "latest row" always means
    max(id) for a (card_id, field_def_id) pair. `reviewed_at` is display data (the
    group's reviewed_at), never an ordering key: two appearances can share a
    timestamp, or even be replayed out of wall-clock order during a rebuild.

    `practice_run_id` is nullable attribution, ON DELETE SET NULL — deleting a run
    must not rewind mastery, it only loses which run gets credit for the movement.
    `card_id`/`field_def_id` CASCADE, mirroring the old cache table's semantics: a
    deleted card's practice_cards cascade away with it and it leaves every breakdown
    anyway, so its ledger rows are cache-for-nothing (the raw rating history survives
    in review_log regardless)."""

    __table_args__ = (
        Index("ix_mastery_log_card_field", "card_id", "field_def_id", "id"),
        Index("ix_mastery_log_run", "practice_run_id", "id"),
    )

    id: int = Field(sa_column=Column(BigInteger, Identity(), primary_key=True))
    card_id: uuid.UUID = Field(foreign_key="card.id", ondelete="CASCADE", nullable=False)
    field_def_id: uuid.UUID = Field(
        foreign_key="field_def.id", ondelete="CASCADE", nullable=False
    )
    practice_run_id: uuid.UUID | None = Field(
        default=None, foreign_key="practice_run.id", ondelete="SET NULL"
    )
    prompt_mastery: float = Field(sa_column=Column(REAL, nullable=False))
    answer_mastery: float = Field(sa_column=Column(REAL, nullable=False))
    prompt_review_count: int = Field(sa_column=Column(Integer, nullable=False))
    answer_review_count: int = Field(sa_column=Column(Integer, nullable=False))
    reviewed_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
