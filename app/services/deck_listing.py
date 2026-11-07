from sqlmodel import Session

from app.mastery.strategy import MasteryStrategy
from app.models.deck import DeckListing, DeckSummary
from app.services.mastery import deck_readiness


def deck_summaries(
    db: Session, strategy: MasteryStrategy, listings: list[DeckListing]
) -> list[DeckSummary]:
    """`listings` as list rows, in the same order, each with its readiness."""
    readiness = deck_readiness(db, strategy, [row.id for row in listings])
    return [DeckSummary(**row.model_dump(), readiness=readiness[row.id]) for row in listings]
