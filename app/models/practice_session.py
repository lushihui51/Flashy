import uuid
from typing import List

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import BIGINT
from sqlmodel import Field

from app.models.app_model import AppModel


class PracticeSessionBase(AppModel):
    pass


class PracticeSession(PracticeSessionBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    curr: int = Field(default=-1, sa_column=Column(BIGINT, nullable=False))


class PracticeSessionCreate(PracticeSessionBase):
    deck_config_ids: List[uuid.UUID]


class PracticeSessionRead(PracticeSessionBase):
    id: uuid.UUID
    curr: int
