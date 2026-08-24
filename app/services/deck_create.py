import uuid

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.database_ops.subject import db_read_subject
from app.models.card import Card
from app.models.card_field_value import CardFieldValue
from app.models.deck import Deck, DeckCardCreate
from app.models.field_def import FieldDef, FieldDefCreate
from app.services.activity import touch


class DeckCreateValidationError(ValueError):
    """A create_deck_atomic input failed a §2.2 validation rule. The message names
    the offending item, per the API contract, and maps to a 422 in the router."""


def _is_blank(value: str | None) -> bool:
    return value is None or value.strip() == ""


def create_deck_atomic(
    db: Session,
    user_id: uuid.UUID,
    name: str,
    subject_id: uuid.UUID,
    field_defs: list[FieldDefCreate],
    cards: list[DeckCardCreate],
) -> Deck:
    """Builds a deck, its field_defs, and its cards in one transaction (D2). Every
    validation rule runs before any row is added, so a failure anywhere — including a
    late card — leaves nothing persisted; there's no partial write to roll back."""
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

    for j, card in enumerate(cards):
        if len(card.values) != len(field_defs):
            raise DeckCreateValidationError(
                f"cards[{j}].values must have exactly {len(field_defs)} entries, "
                f"one per field_def"
            )

    deck = Deck(subject_id=subject_id, name=name)
    db.add(deck)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise DeckCreateValidationError(
            f"a deck named {name!r} already exists in this subject"
        ) from None

    new_field_defs: list[FieldDef] = []
    for position, (field_def, field_name) in enumerate(zip(field_defs, trimmed_names)):
        row = FieldDef(deck_id=deck.id, name=field_name, type=field_def.type, position=position)
        db.add(row)
        new_field_defs.append(row)
    db.flush()

    for card in cards:
        if all(_is_blank(value) for value in card.values):
            continue  # all-empty card is dropped, not rejected — a different concern
            # from the row-per-field invariant below: this is about not persisting a
            # card the user never filled in at all.
        new_card = Card(deck_id=deck.id)
        db.add(new_card)
        db.flush()
        for field_def, value in zip(new_field_defs, card.values):
            # Every field gets a row, "" when blank — a card's values are dense over
            # the deck's active fields, never sparse (see AGENTS.md's card_field_value
            # entry). Sparse writes make "does this card have a value for field X"
            # ambiguous between "empty" and "never written."
            db.add(
                CardFieldValue(
                    card_id=new_card.id,
                    field_def_id=field_def.id,
                    value="" if _is_blank(value) else value,
                )
            )

    # D13: the deck's own last_activity_at is set at insert (server_default=now(),
    # same as created_at) — only the subject needs an explicit touch.
    touch(db, subject)

    db.commit()
    db.refresh(deck)
    return deck
