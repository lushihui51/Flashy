import uuid

from sqlmodel import Field

from app.models.base import AppModel, TimestampMixin


class AppUser(AppModel, TimestampMixin, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    clerk_user_id: str = Field(unique=True)
