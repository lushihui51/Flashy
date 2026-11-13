import uuid

from sqlalchemy import ARRAY, Integer, Uuid
from sqlmodel import Column, Field, UniqueConstraint

from app.models.base import AppModel, TimestampMixin


class RunConfiguration(AppModel, TimestampMixin, table=True):
    """How a run asks one deck, copied from its practice's configuration when the run is
    cut. Generation reads only this row for the run's lifetime, the first batch and
    every requeue; nothing changes it but the removal of a deleted field, so a side can
    end up naming no field."""

    __table_args__ = (UniqueConstraint("run_id", "deck_id"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    run_id: uuid.UUID = Field(foreign_key="run.id", ondelete="CASCADE")
    deck_id: uuid.UUID = Field(foreign_key="deck.id", ondelete="CASCADE", nullable=False)
    prompt_field_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    answer_field_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    prompt_pool_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    prompt_pool_counts: list[int] = Field(sa_column=Column(ARRAY(Integer), nullable=False))
    answer_pool_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    answer_pool_counts: list[int] = Field(sa_column=Column(ARRAY(Integer), nullable=False))
    # The cards this copy covers. Null means every card of the deck; a list means only
    # those of the deck's cards it names. Frozen like the arrays above, so an id outlives
    # its card and then selects nothing.
    card_ids: list[uuid.UUID] | None = Field(sa_column=Column(ARRAY(Uuid), nullable=True))
