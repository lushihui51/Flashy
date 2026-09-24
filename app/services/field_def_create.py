from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.database_ops.card import db_read_card_ids_for_deck, db_stage_create_card_field_values
from app.database_ops.field_def import db_next_position, db_stage_create_field_def
from app.models.deck import Deck
from app.models.field_def import FieldDef, FieldType
from app.services.activity import touch


def create_field_def(db: Session, deck: Deck, name: str, field_type: FieldType) -> FieldDef:
    """Adds one active field at the deck's next position and, in the same transaction,
    a `""` value row for every existing card, keeping `card_field_value` dense (ADR 057).
    An active-name collision rolls everything back and raises `ValueError`."""
    touch(db, deck)
    try:
        field_def = db_stage_create_field_def(
            db, deck.id, name, field_type, db_next_position(db, deck.id)
        )
        for card_id in db_read_card_ids_for_deck(db, deck.id):
            db_stage_create_card_field_values(db, card_id, {field_def.id: ""})
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError("An active field with this name already exists") from None
    db.refresh(field_def)
    return field_def
