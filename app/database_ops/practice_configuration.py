import uuid
from collections.abc import Collection

from sqlalchemy import insert
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, select

from app.models.deck import Deck
from app.models.practice import Practice
from app.models.practice_configuration import PracticeConfiguration


def db_try_stage_create_practice_configurations(db: Session, rows: list[dict]) -> int | None:
    """Inserts every row of `rows`, each a `practice_configuration`'s columns, in one
    statement, returning how many it wrote, or None when the statement breaks a
    constraint, two rows of one practice naming one deck among them, owning its savepoint
    so nothing of it is left. No commit."""
    if not rows:
        return 0
    try:
        with db.begin_nested():
            db.execute(insert(PracticeConfiguration), rows)
    except IntegrityError:
        return None
    return len(rows)


def db_read_practice_configurations(
    db: Session, practice_id: uuid.UUID
) -> list[PracticeConfiguration]:
    """The practice's configurations, one per deck, most recently changed deck first.
    Unscoped: the caller has already ownership-checked the practice."""
    return list(
        db.exec(
            select(PracticeConfiguration)
            .join(Deck, Deck.id == PracticeConfiguration.deck_id)
            .where(PracticeConfiguration.practice_id == practice_id)
            .order_by(col(Deck.last_activity_at).desc(), col(Deck.id))
        ).all()
    )


def db_read_practice_configuration(
    db: Session, user_id: uuid.UUID, practice_id: uuid.UUID, deck_id: uuid.UUID
) -> PracticeConfiguration | None:
    """The user's practice's configuration of the deck, or None when the practice is
    missing or not the user's, or the deck is not one of the practice's."""
    return db.exec(
        select(PracticeConfiguration)
        .join(Practice, Practice.id == PracticeConfiguration.practice_id)
        .where(
            PracticeConfiguration.practice_id == practice_id,
            PracticeConfiguration.deck_id == deck_id,
            Practice.user_id == user_id,
        )
    ).first()


def db_read_practice_configurations_for_decks(
    db: Session, deck_ids: Collection[uuid.UUID]
) -> list[PracticeConfiguration]:
    """Every practice's configuration of these decks. Unscoped: the caller has already
    ownership-checked the decks."""
    if not deck_ids:
        return []
    return list(
        db.exec(
            select(PracticeConfiguration).where(
                col(PracticeConfiguration.deck_id).in_(deck_ids)
            )
        ).all()
    )


def db_read_practice_ids_for_decks(
    db: Session, user_id: uuid.UUID, deck_ids: Collection[uuid.UUID]
) -> set[uuid.UUID]:
    """The user's practices that hold any of these decks."""
    if not deck_ids:
        return set()
    return set(
        db.exec(
            select(PracticeConfiguration.practice_id)
            .join(Practice, Practice.id == PracticeConfiguration.practice_id)
            .where(col(PracticeConfiguration.deck_id).in_(deck_ids), Practice.user_id == user_id)
        ).all()
    )


def db_stage_update_practice_configuration(
    db: Session, configuration: PracticeConfiguration, arrays: dict[str, list]
) -> None:
    """Writes `arrays`, keyed by column name, onto a configuration this session loaded.
    No commit."""
    for key, value in arrays.items():
        setattr(configuration, key, value)
    db.add(configuration)
