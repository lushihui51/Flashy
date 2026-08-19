import uuid
from datetime import datetime

from sqlmodel import Field, UniqueConstraint

from app.models.base import AppModel, TimestampMixin


class SubjectBase(AppModel):
    name: str
    icon: str | None = None
    description: str | None = None


class Subject(SubjectBase, TimestampMixin, table=True):
    __table_args__ = (UniqueConstraint("user_id", "name"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="app_user.id")


class SubjectCreate(SubjectBase):
    pass


class SubjectRead(SubjectBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime


class SubjectUpdate(AppModel):
    name: str | None = None
    icon: str | None = None
    description: str | None = None
