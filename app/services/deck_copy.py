import uuid

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.database_ops.card import db_read_cards_with_values_for_deck, db_stage_create_card
from app.database_ops.deck import db_read_deck_for_copy, db_stage_create_deck
from app.database_ops.field_def import db_read_field_defs_for_copy, db_stage_create_field_def
from app.models.deck import Deck


def copy_deck(db: Session, user_id: uuid.UUID, source_deck_id: uuid.UUID) -> Deck:
    """Copies a deck's fields, cards and values into a new deck of user_id under the
    source's name — never shares it by reference. source_deck_id is deliberately not
    ownership-scoped (see db_read_deck_for_copy): copying is the mechanism a future
    share-link phase authorizes, not something this function gates on its own.

    Single explicit transaction: one commit at the end. Raises LookupError when the
    source deck does not exist, and ValueError when user_id already has a deck of the
    source's name; either leaves nothing written.

    Never copied: configurations, mastery_log, review_log, runs — a copy starts with
    no history of its own.
    """
    source_deck = db_read_deck_for_copy(db, source_deck_id)
    if not source_deck:
        raise LookupError(f"deck {source_deck_id} not found")

    try:
        new_deck = db_stage_create_deck(db, user_id, source_deck.name)
    except IntegrityError:
        db.rollback()
        raise ValueError("A deck with this name already exists") from None

    field_map: dict[uuid.UUID, uuid.UUID] = {}
    for field_def in db_read_field_defs_for_copy(db, source_deck_id):
        new_field = db_stage_create_field_def(
            db, new_deck.id, field_def.name, field_def.type, field_def.position
        )
        field_map[field_def.id] = new_field.id

    for card in db_read_cards_with_values_for_deck(db, source_deck_id):
        values = {
            field_map[v.field_def_id]: v.value
            for v in card.values
            if v.field_def_id in field_map
        }
        db_stage_create_card(db, new_deck.id, values)

    db.commit()
    db.refresh(new_deck)
    return new_deck
