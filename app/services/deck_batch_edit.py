import uuid

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, select

from app.database_ops.field_def import db_next_position
from app.database_ops.subject import db_read_subject
from app.models.card import Card
from app.models.card_field_value import CardFieldValue
from app.models.deck import Deck, DeckBatchEdit
from app.models.field_def import FieldDef
from app.models.subject import Subject
from app.services.activity import touch


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
    db: Session, user_id: uuid.UUID, deck: Deck, payload: DeckBatchEdit
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
    existing_card_ids = list(
        db.exec(select(Card.id).where(Card.deck_id == deck.id)).all()
    )

    active_fields: dict[uuid.UUID, FieldDef] = {
        fd.id: fd
        for fd in db.exec(
            select(FieldDef).where(
                FieldDef.deck_id == deck.id, col(FieldDef.archived_at).is_(None)
            )
        ).all()
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
            row = FieldDef(
                deck_id=deck.id,
                name=field_name,
                type=entry.type,
                position=db_next_position(db, deck.id),
            )
            db.add(row)
            db.flush()
            key_to_new_field[entry.client_key] = row
            active_fields[row.id] = row
            # D10: every existing card owes this new field a "" row, in this same
            # transaction — this is the mechanism that keeps the density invariant
            # true going forward, not just at deck-create time.
            for card_id in existing_card_ids:
                db.add(CardFieldValue(card_id=card_id, field_def_id=row.id, value=""))

        for entry in ops.update:
            field = active_fields.get(entry.id)
            if field is None:
                raise DeckBatchEditValidationError(
                    f"field_defs.update id {entry.id} not found on this deck"
                )
            if entry.name is not None:
                field_name = entry.name.strip()
                if not field_name:
                    raise DeckBatchEditValidationError(
                        "field_defs.update name must not be empty"
                    )
                field.name = field_name
            if entry.type is not None:
                field.type = entry.type
            db.add(field)

        for field_id in ops.delete:
            field = active_fields.get(field_id)
            if field is None:
                raise DeckBatchEditValidationError(
                    f"field_defs.delete id {field_id} not found on this deck"
                )
            del active_fields[field_id]
            # No manual cleanup of card_field_value/card_field_mastery rows — both
            # have a DB-level ON DELETE CASCADE on field_def_id (D11's "deleting a
            # field_def cascades its values and mastery rows").
            db.delete(field)

        if len(active_fields) < 2:
            raise DeckBatchEditValidationError("a deck needs at least two fields")

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
                db.add(field)

        db.flush()

    # --- cards ---
    if payload.cards is not None:
        ops = payload.cards
        if ops.create or ops.update or ops.delete:
            touch_deck = True

        for card_id in ops.delete:
            card = db.exec(
                select(Card).where(Card.id == card_id, Card.deck_id == deck.id)
            ).first()
            if card is None:
                raise DeckBatchEditValidationError(
                    f"cards.delete id {card_id} not found on this deck"
                )
            db.delete(card)
        db.flush()

        for entry in ops.update:
            card = db.exec(
                select(Card).where(Card.id == entry.id, Card.deck_id == deck.id)
            ).first()
            if card is None:
                raise DeckBatchEditValidationError(
                    f"cards.update id {entry.id} not found on this deck"
                )
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
                existing = db.get(CardFieldValue, (card.id, field_id))
                if existing is not None:
                    existing.value = stored_value
                    db.add(existing)
                else:
                    db.add(
                        CardFieldValue(
                            card_id=card.id, field_def_id=field_id, value=stored_value
                        )
                    )

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
            new_card = Card(deck_id=deck.id)
            db.add(new_card)
            db.flush()
            for field_id in active_fields:
                db.add(
                    CardFieldValue(
                        card_id=new_card.id,
                        field_def_id=field_id,
                        value=resolved_values.get(field_id, ""),
                    )
                )

    if touch_deck:
        touch(db, deck)
    if touch_subject_ids:
        subjects = [db.get(Subject, sid) for sid in touch_subject_ids]
        touch(db, *(s for s in subjects if s is not None))

    db.add(deck)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise DeckBatchEditValidationError(
            "a conflicting deck or field name already exists"
        ) from e
    db.refresh(deck)
    return deck
