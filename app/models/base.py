import re
from datetime import UTC, datetime

from sqlalchemy.orm import declared_attr
from sqlmodel import DateTime, Field, SQLModel, func


def _camel_to_snake(name: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()


def utcnow() -> datetime:
    """Current time as an explicit, timezone-aware value — used by `touch()`
    (app/services/activity.py) to set `last_activity_at` (D13)."""
    return datetime.now(UTC)


class AppModel(SQLModel):
    @declared_attr.directive
    def __tablename__(cls) -> str:
        return _camel_to_snake(cls.__name__)


class TimestampMixin(SQLModel):
    # sa_type (not a literal sa_column) so each subclass gets its own Column instance —
    # a shared Column object can only ever be bound to one table.
    created_at: datetime = Field(
        sa_type=DateTime(timezone=True), sa_column_kwargs={"server_default": func.now()}
    )
