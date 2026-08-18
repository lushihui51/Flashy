import uuid
from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, func, select

from app.models.card_field_value import CardFieldValue
from app.models.field_def import FieldDef, FieldType


def db_read_field_def(db: Session, field_def_id: uuid.UUID) -> FieldDef | None:
    return db.get(FieldDef, field_def_id)


def db_read_field_defs(
    db: Session, deck_id: uuid.UUID, include_archived: bool = False
) -> list[FieldDef]:
    query = select(FieldDef).where(FieldDef.deck_id == deck_id)
    if not include_archived:
        query = query.where(col(FieldDef.archived_at).is_(None))
    query = query.order_by(col(FieldDef.position))
    return list(db.exec(query).all())


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
