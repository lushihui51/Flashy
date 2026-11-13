import uuid

from sqlmodel import Field

from app.models.base import AppModel


class RunCountedCard(AppModel, table=True):
    """A card of its practice that the run could ask when it was cut. A run's rows are its
    count of cards; a deleted card's row goes with it."""

    run_id: uuid.UUID = Field(foreign_key="run.id", ondelete="CASCADE", primary_key=True)
    card_id: uuid.UUID = Field(
        foreign_key="card.id", ondelete="CASCADE", primary_key=True, index=True
    )
