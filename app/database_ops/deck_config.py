import uuid
from typing import Any

from sqlmodel import Session, select

from app.models.deck_config import DeckConfig


def db_create_deck_config(
    db: Session,
    deck_id: uuid.UUID,
    prompt_fields: list[str],
    answer_fields: list[str],
    prompt_pool: list[str],
    prompt_pool_counts: list[int],
    answer_pool: list[str],
    answer_pool_counts: list[int],
) -> DeckConfig:
    new_deck_config = DeckConfig(
        deck_id=deck_id,
        prompt_fields=prompt_fields,
        answer_fields=answer_fields,
        prompt_pool=prompt_pool,
        prompt_pool_counts=prompt_pool_counts,
        answer_pool=answer_pool,
        answer_pool_counts=answer_pool_counts,
    )
    db.add(new_deck_config)
    db.commit()
    db.refresh(new_deck_config)
    return new_deck_config


def db_read_deck_config(db: Session, deck_config_id: uuid.UUID) -> DeckConfig | None:
    return db.get(DeckConfig, deck_config_id)


def db_read_all_deck_configs(db: Session) -> list[DeckConfig]:
    deck_configs = db.exec(select(DeckConfig)).all()
    return list(deck_configs)


def db_update_deck_config(
    db: Session, deck_config: DeckConfig, payload: dict[str, Any]
) -> DeckConfig:
    for key, value in payload.items():
        setattr(deck_config, key, value)
    db.add(deck_config)
    db.commit()
    db.refresh(deck_config)
    return deck_config


def db_delete_deck_config(db: Session, deck_config: DeckConfig) -> None:
    db.delete(deck_config)
    db.commit()
