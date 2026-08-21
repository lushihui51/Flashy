import uuid
from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, func, select

from app.models.card_field_value import CardFieldValue
from app.models.deck import Deck
from app.models.field_def import FieldDef, FieldType
from app.models.subject import Subject


def db_read_field_def(
    db: Session, field_def_id: uuid.UUID, user_id: uuid.UUID
) -> FieldDef | None:
    return db.exec(
        select(FieldDef)
        .join(Deck, Deck.id == FieldDef.deck_id)
        .join(Subject, Subject.id == Deck.subject_id)
        .where(FieldDef.id == field_def_id, Subject.user_id == user_id)
    ).first()


def db_read_field_defs(
    db: Session, deck_id: uuid.UUID, user_id: uuid.UUID, include_archived: bool = False
) -> list[FieldDef]:
    query = (
        select(FieldDef)
        .join(Deck, Deck.id == FieldDef.deck_id)
        .join(Subject, Subject.id == Deck.subject_id)
        .where(FieldDef.deck_id == deck_id, Subject.user_id == user_id)
    )
    if not include_archived:
        query = query.where(col(FieldDef.archived_at).is_(None))
    query = query.order_by(col(FieldDef.position))
    return list(db.exec(query).all())


def db_read_field_defs_for_copy(db: Session, deck_id: uuid.UUID) -> list[FieldDef]:
    """Deliberately unscoped, live fields only — see db_read_deck_for_copy. Archived
    fields never propagate into a copy: there's no review_log/mastery history for them
    to protect on the new deck, and deck_practice_config validation already restricts
    configs to live field ids, so field_map only ever needs to cover these."""
    return list(
        db.exec(
            select(FieldDef)
            .where(FieldDef.deck_id == deck_id, col(FieldDef.archived_at).is_(None))
            .order_by(col(FieldDef.position))
        ).all()
    )


def db_next_position(db: Session, deck_id: uuid.UUID) -> int:
    max_position = db.exec(
        select(func.max(FieldDef.position)).where(FieldDef.deck_id == deck_id)
    ).one()
    return 0 if max_position is None else max_position + 1


def db_create_field_def(
    db: Session, deck_id: uuid.UUID, name: str, field_type: FieldType
) -> FieldDef:
    field_def = FieldDef(
        deck_id=deck_id,
        name=name,
        type=field_type,
        position=db_next_position(db, deck_id),
    )
    db.add(field_def)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError("An active field with this name already exists") from None
    db.refresh(field_def)
    return field_def


def db_rename_field_def(db: Session, field_def: FieldDef, name: str) -> FieldDef:
    field_def.name = name
    db.add(field_def)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError("An active field with this name already exists") from None
    db.refresh(field_def)
    return field_def


def db_archive_field_def(db: Session, field_def: FieldDef) -> FieldDef:
    if field_def.archived_at is None:
        field_def.archived_at = datetime.now(UTC)
        db.add(field_def)
        db.commit()
        db.refresh(field_def)
    return field_def


def db_count_card_field_values(db: Session, field_def_id: uuid.UUID) -> int:
    return db.exec(
        select(func.count())
        .select_from(CardFieldValue)
        .where(CardFieldValue.field_def_id == field_def_id)
    ).one()


def db_hard_delete_field_def(db: Session, field_def: FieldDef) -> None:
    db.delete(field_def)
    db.commit()


def db_reorder_field_defs(
    db: Session, field_defs: list[FieldDef], ordered_ids: list[uuid.UUID]
) -> list[FieldDef]:
    by_id = {fd.id: fd for fd in field_defs}
    for position, field_id in enumerate(ordered_ids):
        by_id[field_id].position = position
    db.commit()
    for fd in field_defs:
        db.refresh(fd)
    return field_defs
