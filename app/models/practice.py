import uuid

from sqlmodel import Field, UniqueConstraint

from app.models.base import AppModel, TimestampMixin


class Practice(AppModel, TimestampMixin, table=True):
    """A named set of decks the user keeps and runs as many times as they like. Its decks
    are its `practice_configuration` rows, and its runs hang from it."""

    __table_args__ = (UniqueConstraint("user_id", "name"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="app_user.id", ondelete="CASCADE")
    # Unique among the user's practices, compared as stored.
    name: str
