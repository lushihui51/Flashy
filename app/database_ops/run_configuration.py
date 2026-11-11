import uuid
from collections.abc import Collection

from sqlmodel import Session, col, select

from app.models.card import Card
from app.models.deck import Deck
from app.models.review_log import ReviewLog
from app.models.run_card import RunCard
from app.models.run_configuration import RunConfiguration


def db_stage_create_run_configuration(db: Session, data: dict) -> RunConfiguration:
    """Does not commit — the run, its copies and its card rows are one transaction."""
    configuration = RunConfiguration(**data)
    db.add(configuration)
    db.flush()
    return configuration


def db_read_run_configuration_for_deck(
    db: Session, run_id: uuid.UUID, deck_id: uuid.UUID
) -> RunConfiguration | None:
    """Unscoped: the caller has already ownership-checked the run."""
    return db.exec(
        select(RunConfiguration).where(
            RunConfiguration.run_id == run_id,
            RunConfiguration.deck_id == deck_id,
        )
    ).first()


def db_read_run_configurations_for_decks(
    db: Session, deck_ids: Collection[uuid.UUID]
) -> list[RunConfiguration]:
    """Every run's copy of these decks. Unscoped: the caller has already
    ownership-checked the decks."""
    if not deck_ids:
        return []
    return list(
        db.exec(
            select(RunConfiguration).where(col(RunConfiguration.deck_id).in_(deck_ids))
        ).all()
    )


def db_stage_update_run_configuration(
    db: Session, configuration: RunConfiguration, arrays: dict[str, list]
) -> None:
    """Writes `arrays`, keyed by column name, onto a copy this session loaded. No
    commit."""
    for key, value in arrays.items():
        setattr(configuration, key, value)
    db.add(configuration)


def db_read_last_run_configurations(
    db: Session, user_id: uuid.UUID, deck_ids: Collection[uuid.UUID]
) -> dict[uuid.UUID, RunConfiguration]:
    """For each of the user's `deck_ids` that a run has rated a card of, the
    `run_configuration` of that deck in the run of its most recently rated card, in one
    statement. A rating counts only while its `run_card` exists, so a deck whose every
    rating outlived its run has no entry."""
    if not deck_ids:
        return {}
    latest = (
        select(Card.deck_id, RunCard.run_id)
        .select_from(ReviewLog)
        .join(RunCard, RunCard.id == ReviewLog.review_group_id)
        .join(Card, Card.id == ReviewLog.card_id)
        .join(Deck, Deck.id == Card.deck_id)
        .where(col(Card.deck_id).in_(deck_ids), Deck.user_id == user_id)
        .distinct(Card.deck_id)
        .order_by(
            col(Card.deck_id), col(ReviewLog.reviewed_at).desc(), col(RunCard.run_id)
        )
        .subquery()
    )
    configurations = db.exec(
        select(RunConfiguration).join(
            latest,
            (latest.c.deck_id == RunConfiguration.deck_id)
            & (latest.c.run_id == RunConfiguration.run_id),
        )
    ).all()
    return {configuration.deck_id: configuration for configuration in configurations}
