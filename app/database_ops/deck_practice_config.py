import uuid

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.models.deck_practice_config import DeckPracticeConfig


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


def db_read_deck_practice_config(db: Session, config_id: uuid.UUID) -> DeckPracticeConfig | None:
    return db.get(DeckPracticeConfig, config_id)


def db_read_deck_practice_configs(db: Session, deck_id: uuid.UUID) -> list[DeckPracticeConfig]:
    return list(
        db.exec(
            select(DeckPracticeConfig).where(DeckPracticeConfig.deck_id == deck_id)
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
