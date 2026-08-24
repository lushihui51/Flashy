import uuid

from sqlalchemy import ARRAY, Integer, Uuid
from sqlmodel import Column, Field, UniqueConstraint

from app.models.base import AppModel, TimestampMixin


class PracticeDeck(AppModel, TimestampMixin, table=True):
    """No source_config_id — a self-contained snapshot of a deck_practice_config taken
    at session start (Phase 4.2). Editing or deleting the source config must never
    affect a session, so nothing here points back to it."""

    __table_args__ = (UniqueConstraint("practice_session_id", "deck_id"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    practice_session_id: uuid.UUID = Field(foreign_key="practice_session.id")
    # Nullable with ON DELETE SET NULL — a snapshot is immutable, self-contained
    # session history (see class docstring); deleting the source deck must not erase
    # it, same reasoning as review_log.card_id.
    deck_id: uuid.UUID | None = Field(default=None, foreign_key="deck.id", ondelete="SET NULL")
    prompt_field_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    answer_field_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    prompt_pool_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    prompt_pool_counts: list[int] = Field(sa_column=Column(ARRAY(Integer), nullable=False))
    answer_pool_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    answer_pool_counts: list[int] = Field(sa_column=Column(ARRAY(Integer), nullable=False))
