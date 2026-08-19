import uuid

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.models.deck import Deck
from app.models.deck_practice_config import DeckPracticeConfig
from app.models.subject import Subject


def db_create_deck_practice_config(db: Session, data: dict) -> DeckPracticeConfig:
    config = DeckPracticeConfig(**data)
    db.add(config)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError(
            "A practice config with this name already exists for this deck"
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
            "A practice config with this name already exists for this deck"
        ) from None
    db.refresh(config)
    return config


def db_delete_deck_practice_config(db: Session, config: DeckPracticeConfig) -> None:
    db.delete(config)
    db.commit()
