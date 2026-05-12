import uuid

from sqlmodel import Field, SQLModel


class DeckBase(SQLModel):
    subject_id: uuid.UUID = Field(foreign_key="subject.id")
    name: str


class Deck(DeckBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)


class DeckCreate(DeckBase):
    pass


class DeckRead(DeckBase):
    id: uuid.UUID


class DeckUpdate(SQLModel):
    subject_id: uuid.UUID | None = None
    name: str | None = None
