import uuid

from sqlmodel import Field, SQLModel


class SubjectBase(SQLModel):
    name: str = Field(unique=True)
    icon: str | None = None
    description: str | None = None


class Subject(SubjectBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)


class SubjectCreate(SubjectBase):
    pass


class SubjectRead(SubjectBase):
    id: uuid.UUID
    deck_count: int


class SubjectUpdate(SQLModel):
    name: str | None = None
    icon: str | None = None
    description: str | None = None
