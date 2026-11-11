import uuid

from sqlalchemy import ARRAY, Integer, Uuid
from sqlmodel import Column, Field, UniqueConstraint

from app.models.base import AppModel


class PracticeConfiguration(AppModel, table=True):
    """How a practice asks one of its decks: the practice's next run copies it into a
    `run_configuration`. Every writer leaves it passing `validate_configuration`, so it
    names only live fields of its deck."""

    __table_args__ = (UniqueConstraint("practice_id", "deck_id"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    practice_id: uuid.UUID = Field(foreign_key="practice.id", ondelete="CASCADE")
    deck_id: uuid.UUID = Field(foreign_key="deck.id", ondelete="CASCADE")
    # The prompt fields every card shows.
    prompt_field_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    # The answer fields every card asks.
    answer_field_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    # The prompt fields drawn at random, and the counts one draw picks from.
    prompt_pool_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    prompt_pool_counts: list[int] = Field(sa_column=Column(ARRAY(Integer), nullable=False))
    # The answer fields drawn at random, and the counts one draw picks from.
    answer_pool_ids: list[uuid.UUID] = Field(sa_column=Column(ARRAY(Uuid), nullable=False))
    answer_pool_counts: list[int] = Field(sa_column=Column(ARRAY(Integer), nullable=False))
