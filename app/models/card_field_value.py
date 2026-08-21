import uuid

from sqlmodel import Field, Relationship

from app.models.base import AppModel


class CardFieldValue(AppModel, table=True):
    card_id: uuid.UUID = Field(foreign_key="card.id", ondelete="CASCADE", primary_key=True)
    field_def_id: uuid.UUID = Field(
        foreign_key="field_def.id", ondelete="CASCADE", primary_key=True
    )
    value: str

    card: "Card" = Relationship(back_populates="values")  # noqa: F821
