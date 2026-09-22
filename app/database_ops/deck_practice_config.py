import uuid
from collections.abc import Collection

from sqlalchemy import delete, or_
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, select

from app.models.deck import Deck
from app.models.deck_practice_config import DeckPracticeConfig, DeckPracticeConfigSummary
from app.models.subject import Subject


def db_create_deck_practice_config(db: Session, data: dict) -> DeckPracticeConfig:
    config = DeckPracticeConfig(**data)
    db.add(config)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError(
            "A configuration with this name already exists for this deck"
        ) from None
    db.refresh(config)
    return config


def db_read_deck_practice_config(
    db: Session, config_id: uuid.UUID, user_id: uuid.UUID
) -> DeckPracticeConfig | None:
    return db.exec(
        select(DeckPracticeConfig)
        .join(Deck, Deck.id == DeckPracticeConfig.deck_id)
        .join(Subject, Subject.id == Deck.subject_id)
        .where(DeckPracticeConfig.id == config_id, Subject.user_id == user_id)
    ).first()


def db_read_deck_practice_config_for_copy(
    db: Session, config_id: uuid.UUID
) -> DeckPracticeConfig | None:
    """Deliberately unscoped — see db_read_deck_for_copy. Callers must independently
    check config.deck_id against the source deck they've already established."""
    return db.get(DeckPracticeConfig, config_id)


def db_read_deck_practice_configs(
    db: Session, deck_id: uuid.UUID, user_id: uuid.UUID
) -> list[DeckPracticeConfig]:
    return list(
        db.exec(
            select(DeckPracticeConfig)
            .join(Deck, Deck.id == DeckPracticeConfig.deck_id)
            .join(Subject, Subject.id == Deck.subject_id)
            .where(DeckPracticeConfig.deck_id == deck_id, Subject.user_id == user_id)
        ).all()
    )


def db_read_deck_practice_configs_with_context(
    db: Session,
    user_id: uuid.UUID,
    subject_id: uuid.UUID | None = None,
    deck_id: uuid.UUID | None = None,
) -> list[DeckPracticeConfigSummary]:
    """Every config the user owns, each carrying its deck and subject, optionally
    narrowed to one subject or one deck. One query — the deck/subject context comes
    from the same join chain that already scopes ownership.

    Ordered subject → deck → config name so a grouped list renders in a stable,
    human-sorted order without the client re-sorting."""
    query = (
        select(DeckPracticeConfig, Deck.name, Subject.id, Subject.name)
        .join(Deck, Deck.id == DeckPracticeConfig.deck_id)
        .join(Subject, Subject.id == Deck.subject_id)
        .where(Subject.user_id == user_id)
    )
    if subject_id is not None:
        query = query.where(Deck.subject_id == subject_id)
    if deck_id is not None:
        query = query.where(DeckPracticeConfig.deck_id == deck_id)
    query = query.order_by(
        col(Subject.name), col(Deck.name), col(DeckPracticeConfig.name)
    )

    return [
        DeckPracticeConfigSummary(
            **config.model_dump(),
            deck_name=deck_name,
            subject_id=subject_id_,
            subject_name=subject_name,
        )
        for config, deck_name, subject_id_, subject_name in db.exec(query).all()
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
        raise ValueError(
            "A configuration with this name already exists for this deck"
        ) from None
    db.refresh(config)
    return config


def db_delete_deck_practice_config(db: Session, config: DeckPracticeConfig) -> None:
    db.delete(config)
    db.commit()


def db_read_config_ids_for_decks(
    db: Session, deck_ids: Collection[uuid.UUID]
) -> set[uuid.UUID]:
    """Every configuration of these decks — ADR 051 step 6's first half."""
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
    """Every configuration whose prompt/answer/pool field arrays overlap field_ids —
    ADR 051 step 6's second half. A config naming a field in two of its four arrays
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


def db_delete_deck_practice_configs(db: Session, ids: Collection[uuid.UUID]) -> None:
    """Bulk delete by id, no commit — apply_deletion (ADR 051) owns the transaction."""
    if not ids:
        return
    db.execute(delete(DeckPracticeConfig).where(col(DeckPracticeConfig.id).in_(ids)))
