import uuid

from sqlmodel import Field, UniqueConstraint

from app.models.app_model import AppModel


class PracticeSessionDeckConfigBase(AppModel):
    practice_session_id: uuid.UUID = Field(foreign_key="practice_session.id")
    deck_config_id: uuid.UUID = Field(foreign_key="deck_config.id")
    __table_args__ = (UniqueConstraint("practice_session_id", "deck_config_id"),)


class PracticeSessionDeckConfig(PracticeSessionDeckConfigBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
