import uuid

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.database_ops.card import (
    db_read_card_for_deck,
    db_read_card_ids_for_deck,
    db_stage_create_card,
    db_stage_create_card_field_values,
)
from app.database_ops.field_def import (
    db_next_position,
    db_read_field_defs,
    db_stage_create_field_def,
)
from app.database_ops.subject import db_read_subject
from app.mastery.strategy import MasteryStrategy
from app.models.deck import Deck
from app.models.deck_payloads import DeckBatchEdit
from app.models.field_def import FieldDef
from app.services.activity import touch
from app.services.deletion import apply_deletion, compute_deletion_impact


class DeckBatchEditValidationError(ValueError):
    """A batch-edit input failed a §2.3 validation rule. The message names the
    offending item; the router maps this to a 422."""


def _is_blank(value: str | None) -> bool:
    return value is None or value.strip() == ""


def _resolve_field_key(
    key: str, active_fields: dict[uuid.UUID, FieldDef], key_to_new_field: dict[str, FieldDef]
) -> FieldDef | None:
    if key in key_to_new_field:
        return key_to_new_field[key]
    try:
        field_id = uuid.UUID(key)
    except ValueError:
        return None
    return active_fields.get(field_id)


def apply_deck_batch_edit(
    db: Session, user_id: uuid.UUID, deck: Deck, payload: DeckBatchEdit, strategy: MasteryStrategy
) -> Deck:
    """Applies a §2.3 changeset to `deck` in one transaction: field create → field
    update → field delete → reorder → card delete → card update → card create, then a
    single commit. Any validation failure raises before that commit, so nothing
    partial — not even an already-renamed deck — ever reaches the database (D2)."""
    touch_deck = False
    touch_subject_ids: set[uuid.UUID] = set()

    # --- own columns: name, subject_id ---
    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise DeckBatchEditValidationError("name must not be empty")
        if name != deck.name:
            deck.name = name
            touch_deck = True

    if payload.subject_id is not None and payload.subject_id != deck.subject_id:
        subject = db_read_subject(db, payload.subject_id, user_id)
        if subject is None:
            raise DeckBatchEditValidationError(f"subject_id {payload.subject_id} not found")
        old_subject_id = deck.subject_id
        deck.subject_id = payload.subject_id
        touch_deck = True
        touch_subject_ids.add(old_subject_id)
        touch_subject_ids.add(payload.subject_id)

    # Snapshot before any card is created/deleted below — this is exactly the set that
    # owes a backfilled row to any field created in this same request (D10); a card
    # created later in this request already gets a dense row set at creation time.
    existing_card_ids = db_read_card_ids_for_deck(db, deck.id)

    active_fields: dict[uuid.UUID, FieldDef] = {
        fd.id: fd for fd in db_read_field_defs(db, deck.id, user_id)
    }
    key_to_new_field: dict[str, FieldDef] = {}

    if payload.field_defs is not None:
        ops = payload.field_defs
        if ops.create or ops.update or ops.delete or ops.order:
            touch_deck = True

        seen_client_keys: set[str] = set()
        for entry in ops.create:
            if entry.client_key in seen_client_keys:
                raise DeckBatchEditValidationError(
                    f"field_defs.create client_key {entry.client_key!r} is duplicated"
                )
            seen_client_keys.add(entry.client_key)
            field_name = entry.name.strip()
            if not field_name:
                raise DeckBatchEditValidationError("field_defs.create name must not be empty")
            row = db_stage_create_field_def(
                db, deck.id, field_name, entry.type, db_next_position(db, deck.id)
            )
            key_to_new_field[entry.client_key] = row
            active_fields[row.id] = row
            # D10: every existing card owes this new field a "" row, in this same
            # transaction — this is the mechanism that keeps the density invariant
            # true going forward, not just at deck-create time.
            for card_id in existing_card_ids:
                db_stage_create_card_field_values(db, card_id, {row.id: ""})

        for entry in ops.update:
            field = active_fields.get(entry.id)
            if field is None:
                raise DeckBatchEditValidationError(
                    f"field_defs.update id {entry.id} not found on this deck"
                )
            if entry.type is not None and entry.type != field.type:
                raise DeckBatchEditValidationError(
                    "field_defs.update type cannot be changed"
                )
            if entry.name is not None:
                field_name = entry.name.strip()
                if not field_name:
                    raise DeckBatchEditValidationError(
                        "field_defs.update name must not be empty"
                    )
                field.name = field_name

        for field_id in ops.delete:
            field = active_fields.get(field_id)
            if field is None:
                raise DeckBatchEditValidationError(
                    f"field_defs.delete id {field_id} not found on this deck"
                )
            del active_fields[field_id]

        if len(active_fields) < 2:
            raise DeckBatchEditValidationError("a deck needs at least two fields")

        # No manual cleanup of configurations, active runs, review rows, or
        # shown_prompt_ids references — apply_deletion is the only way a field_def
        # is ever deleted, and it takes all of that with it and rebuilds the deck's
        # mastery to what the live path would have written without the field
        # (ADR 049, ADR 051).
        if ops.delete:
            apply_deletion(
                db, strategy, compute_deletion_impact(db, user_id, field_ids=ops.delete)
            )

        if ops.order:
            resolved_order: list[FieldDef] = []
            for key in ops.order:
                field = _resolve_field_key(key, active_fields, key_to_new_field)
                if field is None:
                    raise DeckBatchEditValidationError(
                        f"field_defs.order id {key!r} not found on this deck"
                    )
                resolved_order.append(field)
            if len(resolved_order) != len(active_fields) or {
                f.id for f in resolved_order
            } != set(active_fields):
                raise DeckBatchEditValidationError(
                    "field_defs.order must contain exactly the deck's resulting fields"
                )
            for position, field in enumerate(resolved_order):
                field.position = position

        db.flush()

    # --- cards ---
    if payload.cards is not None:
        ops = payload.cards
        if ops.create or ops.update or ops.delete:
            touch_deck = True

        for card_id in ops.delete:
            card = db_read_card_for_deck(db, card_id, deck.id)
            if card is None:
                raise DeckBatchEditValidationError(
                    f"cards.delete id {card_id} not found on this deck"
                )

        # No manual cleanup — apply_deletion takes the card's review rows and
        # mastery rows with it; a card delete never needs a rebuild (ADR 047,
        # ADR 051).
        if ops.delete:
            apply_deletion(
                db, strategy, compute_deletion_impact(db, user_id, card_ids=ops.delete)
            )
        db.flush()

        for entry in ops.update:
            card = db_read_card_for_deck(db, entry.id, deck.id)
            if card is None:
                raise DeckBatchEditValidationError(
                    f"cards.update id {entry.id} not found on this deck"
                )
            # The flush at the end of the field phase precedes this read, so a "" row
            # backfilled for a field created in this request is already in card.values.
            existing = {v.field_def_id: v for v in card.values}
            for key, value in entry.values.items():
                # A same-request client_key is valid here too (Phase 7): field
                # create -> ... -> card update is the stated order, so a field
                # created earlier in this request already has a real row by the
                # time an existing card's value for it is set here.
                field = _resolve_field_key(key, active_fields, key_to_new_field)
                if field is None:
                    raise DeckBatchEditValidationError(
                        f"cards.update value references unknown field {key!r}"
                    )
                field_id = field.id
                stored_value = "" if _is_blank(value) else value
                if field_id in existing:
                    existing[field_id].value = stored_value
                else:
                    db_stage_create_card_field_values(db, card.id, {field_id: stored_value})

        for entry in ops.create:
            if all(_is_blank(v) for v in entry.values.values()):
                continue  # all-blank new card dropped, same rule as create_deck_atomic (D2)
            resolved_values: dict[uuid.UUID, str] = {}
            for key, value in entry.values.items():
                field = _resolve_field_key(key, active_fields, key_to_new_field)
                if field is None:
                    raise DeckBatchEditValidationError(
                        f"cards.create value references unknown field {key!r}"
                    )
                resolved_values[field.id] = "" if _is_blank(value) else value
            db_stage_create_card(
                db,
                deck.id,
                {field_id: resolved_values.get(field_id, "") for field_id in active_fields},
            )

    if touch_deck:
        touch(db, deck)
    if touch_subject_ids:
        subjects = [db_read_subject(db, sid, user_id) for sid in touch_subject_ids]
        touch(db, *(s for s in subjects if s is not None))

    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise DeckBatchEditValidationError(
            "a conflicting deck or field name already exists"
        ) from e
    db.refresh(deck)
    return deck
