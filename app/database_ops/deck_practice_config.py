import uuid
from collections.abc import Collection

from sqlalchemy import delete, or_
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, select

from app.models.deck import Deck
from app.models.deck_practice_config import DeckPracticeConfig, DeckPracticeConfigSummary
from app.refusals import Refusal


def db_create_deck_practice_config(db: Session, data: dict) -> DeckPracticeConfig:
    config = DeckPracticeConfig(**data)
    db.add(config)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise Refusal(
            "configuration_name_taken",
            "deck_practice_config (deck_id, name) already exists",
        ) from None
    db.refresh(config)
    return config


def db_read_deck_practice_config(
    db: Session, config_id: uuid.UUID, user_id: uuid.UUID
) -> DeckPracticeConfig | None:
    return db.exec(
        select(DeckPracticeConfig)
        .join(Deck, Deck.id == DeckPracticeConfig.deck_id)
        .where(DeckPracticeConfig.id == config_id, Deck.user_id == user_id)
    ).first()


def db_read_deck_practice_configs_with_context(
    db: Session,
    user_id: uuid.UUID,
    deck_id: uuid.UUID | None = None,
) -> list[DeckPracticeConfigSummary]:
    """Every config the user owns, each carrying its deck's name, optionally narrowed
    to one deck. One query — the deck's name comes from the same join that already
    scopes ownership.

    Ordered by the deck's most recent change, then by the configuration's own, so a
    grouped list renders in this order without the client re-sorting."""
    query = (
        select(DeckPracticeConfig, Deck.name)
        .join(Deck, Deck.id == DeckPracticeConfig.deck_id)
        .where(Deck.user_id == user_id)
    )
    if deck_id is not None:
        query = query.where(DeckPracticeConfig.deck_id == deck_id)
    query = query.order_by(
        col(Deck.last_activity_at).desc(),
        col(Deck.id),
        col(DeckPracticeConfig.last_activity_at).desc(),
        col(DeckPracticeConfig.id),
    )

    return [
        DeckPracticeConfigSummary(
            **config.model_dump(),
            deck_name=deck_name,
        )
        for config, deck_name in db.exec(query).all()
    ]


def db_update_deck_practice_config(
    db: Session, config: DeckPracticeConfig, data: dict
) -> DeckPracticeConfig:
    for key, value in data.items():
        setattr(config, key, value)
    db.add(config)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise Refusal(
            "configuration_name_taken",
            "deck_practice_config (deck_id, name) already exists",
        ) from None
    db.refresh(config)
    return config


def db_delete_deck_practice_config(db: Session, config: DeckPracticeConfig) -> None:
    db.delete(config)
    db.commit()


def db_read_config_ids_for_decks(
    db: Session, deck_ids: Collection[uuid.UUID]
) -> set[uuid.UUID]:
    """Every configuration of these decks, for the deletion closure."""
    if not deck_ids:
        return set()
    return set(
        db.exec(
            select(DeckPracticeConfig.id).where(col(DeckPracticeConfig.deck_id).in_(deck_ids))
        ).all()
    )


def db_read_config_ids_naming_fields(
    db: Session, field_ids: Collection[uuid.UUID]
) -> set[uuid.UUID]:
    """Every configuration whose prompt/answer/pool field arrays overlap field_ids, for
    the deletion closure. A config naming a field in two of its four arrays
    (rare, but not disallowed) is still counted once, since this is a set of ids, not
    a count of matches."""
    if not field_ids:
        return set()
    ids = list(field_ids)
    query = select(DeckPracticeConfig.id).where(
        or_(
            DeckPracticeConfig.prompt_field_ids.op("&&")(ids),
            DeckPracticeConfig.answer_field_ids.op("&&")(ids),
            DeckPracticeConfig.prompt_pool_ids.op("&&")(ids),
            DeckPracticeConfig.answer_pool_ids.op("&&")(ids),
        )
    )
    return set(db.exec(query).all())


def db_stage_delete_deck_practice_configs(db: Session, ids: Collection[uuid.UUID]) -> None:
    """Bulk delete by id, no commit — apply_deletion owns the transaction."""
    if not ids:
        return
    db.execute(delete(DeckPracticeConfig).where(col(DeckPracticeConfig.id).in_(ids)))
