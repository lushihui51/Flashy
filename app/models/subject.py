import uuid
from datetime import datetime

from sqlmodel import Field, UniqueConstraint

from app.models.base import AppModel, TimestampMixin


class SubjectBase(AppModel):
    user_id: uuid.UUID = Field(foreign_key="app_user.id")
    name: str
    icon: str | None = None
    description: str | None = None

    __table_args__ = (UniqueConstraint("user_id", "name"),)


class Subject(SubjectBase, TimestampMixin, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)


class SubjectCreate(SubjectBase):
    pass


class SubjectRead(SubjectBase):
    id: uuid.UUID
    created_at: datetime


class SubjectUpdate(AppModel):
    name: str | None = None
    icon: str | None = None
    description: str | None = None
