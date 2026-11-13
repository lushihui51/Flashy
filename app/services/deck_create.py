import uuid

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.database_ops.deck import db_stage_create_deck
from app.database_ops.field_def import db_stage_create_field_def
from app.models.deck import Deck
from app.models.field_def import FieldDefCreate
from app.refusals import Refusal


class DeckCreateValidationError(ValueError):
    """A create_deck_atomic input failed a validation rule. The message names the
    offending item and maps to a 422 in the router."""


def create_deck_atomic(
    db: Session,
    user_id: uuid.UUID,
    name: str,
    field_defs: list[FieldDefCreate],
) -> Deck:
    """Builds a deck of user_id and its field_defs in one transaction. Every validation rule runs
    before any row is added, so a failure anywhere leaves nothing persisted; there's no
    partial write to roll back. A deck is born with a schema and no content — cards are
    added afterward via POST /api/cards or the batch-edit endpoint."""
    name = name.strip()
    if not name:
        raise DeckCreateValidationError("name must not be empty")

    if len(field_defs) < 2:
        raise Refusal("too_few_fields", "field_defs has fewer than two entries")

    trimmed_names: list[str] = []
    seen_names: set[str] = set()
    for i, field_def in enumerate(field_defs):
        field_name = field_def.name.strip()
        if not field_name:
            raise DeckCreateValidationError(f"field_defs[{i}].name must not be empty")
        key = field_name.lower()
        if key in seen_names:
            raise DeckCreateValidationError(
                f"field_defs[{i}].name {field_def.name!r} duplicates an earlier field name"
            )
        seen_names.add(key)
        trimmed_names.append(field_name)

    try:
        deck = db_stage_create_deck(db, user_id, name)
    except IntegrityError:
        db.rollback()
        raise Refusal(
            "deck_name_taken", f"deck (user_id, name) {name!r} already exists"
        ) from None

    for position, (field_def, field_name) in enumerate(zip(field_defs, trimmed_names)):
        db_stage_create_field_def(db, deck.id, field_name, field_def.type, position)
    db.commit()
    db.refresh(deck)
    return deck
