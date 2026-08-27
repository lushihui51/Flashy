import uuid

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.database_ops.subject import db_read_subject
from app.models.deck import Deck
from app.models.field_def import FieldDef, FieldDefCreate
from app.services.activity import touch


class DeckCreateValidationError(ValueError):
    """A create_deck_atomic input failed a §2.2 validation rule. The message names
    the offending item, per the API contract, and maps to a 422 in the router."""


def create_deck_atomic(
    db: Session,
    user_id: uuid.UUID,
    name: str,
    subject_id: uuid.UUID,
    field_defs: list[FieldDefCreate],
) -> Deck:
    """Builds a deck and its field_defs in one transaction. Every validation rule runs
    before any row is added, so a failure anywhere leaves nothing persisted; there's no
    partial write to roll back. A deck is born with a schema and no content — cards are
    added afterward via POST /api/cards or the batch-edit endpoint (ADR 023)."""
    name = name.strip()
    if not name:
        raise DeckCreateValidationError("name must not be empty")

    subject = db_read_subject(db, subject_id, user_id)
    if subject is None:
        raise DeckCreateValidationError(f"subject_id {subject_id} not found")

    if len(field_defs) < 2:
        raise DeckCreateValidationError("a deck needs at least two fields")

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

    deck = Deck(subject_id=subject_id, name=name)
    db.add(deck)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise DeckCreateValidationError(
            f"a deck named {name!r} already exists in this subject"
        ) from None

    for position, (field_def, field_name) in enumerate(zip(field_defs, trimmed_names)):
        db.add(FieldDef(deck_id=deck.id, name=field_name, type=field_def.type, position=position))
    db.flush()

    # D13: the deck's own last_activity_at is set at insert (server_default=now(),
    # same as created_at) — only the subject needs an explicit touch.
    touch(db, subject)

    db.commit()
    db.refresh(deck)
    return deck
