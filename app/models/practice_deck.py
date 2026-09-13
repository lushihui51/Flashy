import uuid

from sqlalchemy import ARRAY, Integer, Uuid
from sqlmodel import Column, Field, UniqueConstraint

from app.models.base import AppModel, TimestampMixin


class PracticeDeck(AppModel, TimestampMixin, table=True):
    """A self-contained snapshot of a deck_practice_config taken at session start
    (Phase 4.2): generation, validation, and rerun logic all read the array fields
    copied onto *this* row, never the live config — editing or deleting the source
    config must never affect a session (ADR 013). `source_config_id` (ADR 040) is the
    one exception, and it is attribution-only: it records which config this snapshot
    was cut from so per-config progress can be asked about later, but nothing in this
    codebase reads it back for generation, validation, or rerun. A material edit to
    the source config, or deleting it outright, nulls it (deletion via this column's
    own ON DELETE SET NULL; an edit via app/services/deck_practice_config.py) — the
    snapshot itself is never touched either way."""

    __table_args__ = (UniqueConstraint("practice_run_id", "deck_id"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # ON DELETE CASCADE — a snapshot outlives its *deck* (see deck_id below) but not
    # its session, which owns it outright (ADR 015 as amended).
    practice_run_id: uuid.UUID = Field(
        foreign_key="practice_run.id", ondelete="CASCADE"
    )
    # Nullable with ON DELETE SET NULL — a snapshot is immutable, self-contained
    # session history (see class docstring); deleting the source deck must not erase
    # it, same reasoning as review_log.card_id.
    deck_id: uuid.UUID | None = Field(default=None, foreign_key="deck.id", ondelete="SET NULL")
    # Attribution-only (ADR 040, see class docstring) — never read by generation,
    # validation, or rerun. Written at run start with the config's id; rerun copies the
    # old snapshot's value (possibly already null) rather than looking anything up.
    source_config_id: uuid.UUID | None = Field(
        default=None, foreign_key="deck_practice_config.id", ondelete="SET NULL"
    )
    prompt_field_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    answer_field_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    prompt_pool_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    prompt_pool_counts: list[int] = Field(sa_column=Column(ARRAY(Integer), nullable=False))
    answer_pool_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    answer_pool_counts: list[int] = Field(sa_column=Column(ARRAY(Integer), nullable=False))
