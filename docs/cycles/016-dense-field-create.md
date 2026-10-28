# 016 — Dense rows on the standalone field create

## Goal

Outcome: A field added to a deck on its own leaves every card of the deck with a value for it, and a batch edit refuses to name one card twice.

Scope: The standalone field-create route, `POST /decks/{deck_id}/fields`, and the batch edit's `cards.update`. Not covered: a data migration, and any frontend change.

Judgement: None.

## Records

- ADR 057: Dense value rows on every field create

## Tasks

### T1 — The standalone field create backfills every card

**Status**

- [x]

**Goal**

Creating a field through `POST /decks/{deck_id}/fields` leaves every card of the deck with a `""` value row for it, in the same transaction.

**Dependencies**

None.

**Files**

- `app/services/field_def_create.py` (new)
- `app/routers/api/field_def.py`
- `app/database_ops/field_def.py`
- `tests/api_tests/test_field_defs.py`

**Details**

The new service (ADR 057):

- `app/services/field_def_create.py`: `create_field_def(db: Session, deck: Deck, name: str, field_type: FieldType) -> FieldDef`. In order: `touch(db, deck)`; `field_def = db_stage_create_field_def(db, deck.id, name, field_type, db_next_position(db, deck.id))`; `for card_id in db_read_card_ids_for_deck(db, deck.id): db_stage_create_card_field_values(db, card_id, {field_def.id: ""})`; `db.commit()`; `db.refresh(field_def)`; return it. Everything from the staged create through the commit sits in one `try`; on `IntegrityError` it calls `db.rollback()` and raises `ValueError("An active field with this name already exists") from None`, the message the deleted function raised. Session calls in the module: `commit`, `rollback`, `refresh` only. `name` is passed through untrimmed, as the route does today.

Removed (ADR 057):

- `db_create_field_def` in `app/database_ops/field_def.py` must be deleted. The docstring of `db_stage_create_field_def`, which calls itself the "staged counterpart to db_create_field_def", becomes: "The caller supplies the position, because a caller building several fields in one transaction already knows each one's slot, and owns the commit. An `IntegrityError` from the flush propagates."

Route behaviour (ADR 057):

- `POST /decks/{deck_id}/fields`: 404 for an unknown or foreign deck; 400 with detail `An active field with this name already exists` on an active-name collision, with nothing persisted; 201 with `FieldDefRead` otherwise, after which every card of the deck has one `card_field_value` row for the new field with value `""`. Request and response shapes are unchanged, so `frontend/src/api/types.ts` needs no regeneration.

The service's imports are `db_next_position`, `db_stage_create_field_def` from `app.database_ops.field_def`, `db_read_card_ids_for_deck`, `db_stage_create_card_field_values` from `app.database_ops.card`, `touch` from `app.services.activity`, `IntegrityError` from `sqlalchemy.exc`, `Session` from `sqlmodel`.

In the router, the handler is itself named `create_field_def`, so import the service as `from app.services.field_def_create import create_field_def as create_field_def_service`, the pattern `app/routers/api/deck.py` uses for `delete_deck_service`. The handler body becomes: read the deck (404 unchanged), then `return create_field_def_service(db, deck, payload.name, payload.type)` inside the existing `try`/`except ValueError` that maps to 400. Delete the handler's own `touch(db, deck)` line, since the service touches (the `touch` import stays for the other handlers). Drop `db_create_field_def` from the router's import list.

Add to `TestFieldDefLifecycle` in `test_field_defs.py`:

- `test_field_create_backfills_dense_card_field_value_rows(self, client, db, existing_deck, existing_field_defs, existing_card)`: POST `{"name": "Extra", "type": "text"}` and assert 201; GET `/api/decks/{deck_id}` and, for the card whose id is `existing_card["id"]`, assert `values` has exactly 3 keys, the new field's id maps to `""`, and the two original values are unchanged (`Value for front`, `Value for back`); assert `db.exec(select(CardFieldValue).where(CardFieldValue.card_id == card_id)).all()` has length 3.
- `test_duplicate_active_name_leaves_no_rows(self, client, db, existing_deck, existing_field_defs, existing_card)`: POST `existing_field_defs[0]`'s name and type, assert 400 with detail `An active field with this name already exists`, then assert the card still has exactly 2 `card_field_value` rows and GET `/api/decks/{deck_id}` still lists 2 field defs.

The deck detail is the right read for these assertions because it builds `values` from the rows that exist (`app/routers/api/deck.py`); the standalone card read (`app/routers/api/card.py`) fabricates `""` for a missing row and would hide the bug.

**Out of scope**

- Trimming or validating the name.
- Changing the 400 to a 422.
- The other standalone field routes.
- Any frontend change or `npm run gen:api`.
- `deck_batch_edit.py` and `deck_create.py`, whose backfills are already correct.
- A data migration (ADR 057).

**Done when**

- `uv run pytest` passes in full, including the two new tests, `test_field_create_touches_deck_last_activity`, `test_duplicate_active_name_rejected`, and all four tests in `test_layering_guard.py`.
- `grep -rn "db_create_field_def" app/ tests/` returns nothing.
- `grep -n "db\." app/services/field_def_create.py` matches only `db.commit()`, `db.rollback()`, and `db.refresh(`.
- `grep -n "touch" app/routers/api/field_def.py` no longer shows a call inside the create handler.

**Debrief**

The service carries a short docstring the Details don't specify. The backfill test was confirmed to fail against the old route before the fix.

### T2 — The batch edit rejects a repeated card in `cards.update`

**Status**

- [x]

**Goal**

A batch edit whose `cards.update` names one card twice is refused with a 422 naming the card, before any entry is applied.

**Dependencies**

None.

**Files**

- `app/services/deck_batch_edit.py`
- `tests/api_tests/test_deck_batch_edit.py`

**Details**

A `cards.update` list naming the same card more than once must be rejected with `DeckBatchEditValidationError` (a 422) naming the card, checked before any update entry is read or applied; `field_defs.update`, `field_defs.delete`, and `cards.delete` must stay unchanged.

The batch edit's commit handler must keep mapping every `IntegrityError` to "a conflicting deck or field name already exists".

In `apply_deck_batch_edit`, immediately before the `for entry in ops.update:` loop of the cards phase, a pre-scan over `ops.update` with a `seen_card_ids: set[uuid.UUID]`: a repeated `entry.id` raises `DeckBatchEditValidationError(f"cards.update id {entry.id} is duplicated")`. It runs before any update entry is read or applied, so it precedes the existing not-found check. The router's mapping to 422 is unchanged.

Place the pre-scan with a one-line comment stating that the values loop builds `existing` from `card.values` once per card and relies on a card appearing once.

Add to `TestCardsUpdateAlone`:

- `test_card_update_same_card_twice_rejected(self, client, existing_deck, existing_field_defs)`: create a card via POST `/api/cards` with front `Bonjour` and back `Hello`; PATCH with `_cards(update=[{"id": card_id, "values": {front_id: "a"}}, {"id": card_id, "values": {front_id: "b"}}])`; assert 422 and that the detail contains both `is duplicated` and the card id; GET `/api/decks/{deck_id}` and assert the card's front is still `Bonjour`.
- `test_card_update_two_different_cards_accepted(self, client, existing_deck, existing_field_defs)`: create two cards, PATCH one update entry for each with a new front value, assert 200 and both new values in the response.

**Out of scope**

- The same rule on `field_defs.update`, `field_defs.delete`, or `cards.delete`.
- Merging entries per card.
- The values loop's create branch.
- The commit handler: revisit when a cycle touches that commit path or a second constraint surfaces through it.
- The frontend, which never sends `cards`.

**Done when**

- `uv run pytest` passes in full, including the two new tests and every existing test in `test_deck_batch_edit.py` unchanged.
- `grep -n "is duplicated" app/services/deck_batch_edit.py` prints exactly two lines, the `client_key` rule and the new one.

**Debrief**

The rejection test was confirmed to fail (200, not 422) without the pre-scan. One test beyond the spec, added at review: `TestRollback.test_duplicated_card_update_rolls_back_staged_card_delete` pins that a duplicate rolls back a `cards.delete` staged in the same request.
