import uuid

from sqlmodel import Field, SQLModel


class SubjectBase(SQLModel):
    name: str = Field(unique=True)


class Subject(SubjectBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)


class SubjectCreate(SubjectBase):
    pass


class SubjectRead(SubjectBase):
    id: uuid.UUID


class SubjectUpdate(SQLModel):
    name: str | None = None
