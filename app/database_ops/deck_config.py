import uuid
from typing import Any, List

from sqlmodel import Session, select

from app.models.deck_config import DeckConfig


def db_create_deck_config(
    db: Session,
    deck_id: uuid.UUID,
    static_reveals: List[str],
    static_conceals: List[str],
    dynamic_reveals: List[str],
    dynamic_reveal_quantities: List[int],
    dynamic_conceals: List[str],
    dynamic_conceal_quantities: List[int],
) -> DeckConfig:
    new_deck_config = DeckConfig(
        deck_id=deck_id,
        static_reveals=static_reveals,
        static_conceals=static_conceals,
        dynamic_reveals=dynamic_reveals,
        dynamic_reveal_quantities=dynamic_reveal_quantities,
        dynamic_conceals=dynamic_conceals,
        dynamic_conceal_quantities=dynamic_conceal_quantities,
    )
    db.add(new_deck_config)
    db.commit()
    db.refresh(new_deck_config)
    return new_deck_config


def db_read_deck_config(db: Session, deck_config_id: uuid.UUID) -> DeckConfig | None:
    return db.get(DeckConfig, deck_config_id)


def db_read_all_deck_configs(db: Session) -> List[DeckConfig]:
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
