import uuid

from sqlalchemy import ARRAY, Integer, Uuid
from sqlmodel import Column, Field, UniqueConstraint

from app.models.base import AppModel, TimestampMixin


class PracticeDeck(AppModel, TimestampMixin, table=True):
    """A self-contained snapshot of a deck_practice_config taken at session start:
    generation, validation, and rerun logic all read the array fields copied onto
    *this* row, never the live config — editing or deleting the source config must
    never affect a session. `source_config_id` is the one exception, and it is
    attribution-only: it records which config this snapshot was cut from so per-config
    progress can be asked about later, but nothing in this codebase reads it back for
    generation, validation, or rerun. A material edit to the source config nulls it
    (an edit via app/services/deck_practice_config.py; the snapshot's own array fields
    are never touched). Deleting the source config also nulls it (this column's own
    ON DELETE SET NULL). Deleting the source *deck* is different: `deck_id` is
    `NOT NULL ON DELETE CASCADE` — this snapshot goes with it, and a run left owning no
    `PracticeDeck` at all is deleted alongside its last one (`compute_deletion_impact`'s
    run closure). `source_config_name` is the fallback for the configuration label once
    the link is gone, read only by the practice summary query."""

    __table_args__ = (UniqueConstraint("practice_run_id", "deck_id"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # ON DELETE CASCADE — a snapshot is owned by its run outright and goes with it; it
    # does not outlive its deck either (see deck_id below).
    practice_run_id: uuid.UUID = Field(
        foreign_key="practice_run.id", ondelete="CASCADE"
    )
    # NOT NULL, ON DELETE CASCADE — see the class docstring: a snapshot is owned by its
    # session, but it does not outlive its deck.
    deck_id: uuid.UUID = Field(foreign_key="deck.id", ondelete="CASCADE", nullable=False)
    # Attribution-only (see the class docstring) — never read by generation,
    # validation, or rerun. Written at run start with the config's id; rerun copies the
    # old snapshot's value (possibly already null) rather than looking anything up.
    source_config_id: uuid.UUID | None = Field(
        default=None, foreign_key="deck_practice_config.id", ondelete="SET NULL"
    )
    # The configuration's name as of the last moment the link existed.
    # 1. Written at run start with the config's name.
    # 2. Set to the new name on every linked snapshot by a non-material update that
    #    carries a name (`update_deck_practice_config`).
    # 3. Copied verbatim by rerun and by a practice of chosen cards, possibly null.
    # 4. Touched by nothing else: a material edit and a delete only null the link.
    source_config_name: str | None = Field(default=None)
    prompt_field_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    answer_field_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    prompt_pool_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    prompt_pool_counts: list[int] = Field(sa_column=Column(ARRAY(Integer), nullable=False))
    answer_pool_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    answer_pool_counts: list[int] = Field(sa_column=Column(ARRAY(Integer), nullable=False))
    # The cards this snapshot covers. Null means every card of the deck; a list means only
    # those of the deck's cards it names. Frozen like the arrays above, so an id outlives
    # its card and then selects nothing.
    card_ids: list[uuid.UUID] | None = Field(sa_column=Column(ARRAY(Uuid), nullable=True))
