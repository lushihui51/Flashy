import uuid
from collections.abc import Collection

from sqlalchemy import delete
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, func, select

from app.models.deck import Deck
from app.models.field_def import FieldDef, FieldType
from app.models.subject import Subject
from app.refusals import Refusal


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
    db: Session, deck_id: uuid.UUID, user_id: uuid.UUID
) -> list[FieldDef]:
    return list(
        db.exec(
            select(FieldDef)
            .join(Deck, Deck.id == FieldDef.deck_id)
            .join(Subject, Subject.id == Deck.subject_id)
            .where(FieldDef.deck_id == deck_id, Subject.user_id == user_id)
            .order_by(col(FieldDef.position))
        ).all()
    )


def db_read_field_defs_for_copy(db: Session, deck_id: uuid.UUID) -> list[FieldDef]:
    """Deliberately unscoped — see db_read_deck_for_copy."""
    return list(
        db.exec(
            select(FieldDef)
            .where(FieldDef.deck_id == deck_id)
            .order_by(col(FieldDef.position))
        ).all()
    )


def db_next_position(db: Session, deck_id: uuid.UUID) -> int:
    max_position = db.exec(
        select(func.max(FieldDef.position)).where(FieldDef.deck_id == deck_id)
    ).one()
    return 0 if max_position is None else max_position + 1


def db_stage_create_field_def(
    db: Session, deck_id: uuid.UUID, name: str, field_type: FieldType, position: int
) -> FieldDef:
    """The caller supplies the position, because a caller building several fields in one
    transaction already knows each one's slot, and owns the commit. An `IntegrityError`
    from the flush propagates."""
    field_def = FieldDef(deck_id=deck_id, name=name, type=field_type, position=position)
    db.add(field_def)
    db.flush()
    return field_def


def db_rename_field_def(db: Session, field_def: FieldDef, name: str) -> FieldDef:
    field_def.name = name
    db.add(field_def)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise Refusal(
            "field_name_taken", "an active field_def (deck_id, name) already exists"
        ) from None
    db.refresh(field_def)
    return field_def


def db_read_owned_field_ids(
    db: Session, user_id: uuid.UUID, ids: Collection[uuid.UUID]
) -> set[uuid.UUID]:
    """The subset of `ids` that exist and belong to user_id (via the subject chain) —
    compute_deletion_impact's ownership check."""
    if not ids:
        return set()
    return set(
        db.exec(
            select(FieldDef.id)
            .join(Deck, Deck.id == FieldDef.deck_id)
            .join(Subject, Subject.id == Deck.subject_id)
            .where(col(FieldDef.id).in_(ids), Subject.user_id == user_id)
        ).all()
    )


def db_read_deck_id_by_field(
    db: Session, field_ids: Collection[uuid.UUID]
) -> dict[uuid.UUID, uuid.UUID]:
    """field_def_id -> deck_id for these fields — the deletion closure needs each
    explicit field's own deck to decide whether it's already covered by a deck-level
    delete."""
    if not field_ids:
        return {}
    return dict(
        db.exec(
            select(FieldDef.id, FieldDef.deck_id).where(col(FieldDef.id).in_(field_ids))
        ).all()
    )


def db_read_field_ids_for_decks(
    db: Session, deck_ids: Collection[uuid.UUID]
) -> set[uuid.UUID]:
    if not deck_ids:
        return set()
    return set(
        db.exec(select(FieldDef.id).where(col(FieldDef.deck_id).in_(deck_ids))).all()
    )


def db_stage_delete_field_defs(db: Session, ids: Collection[uuid.UUID]) -> None:
    """Bulk delete by id, no commit — apply_deletion owns the transaction."""
    if not ids:
        return
    db.execute(delete(FieldDef).where(col(FieldDef.id).in_(ids)))


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
