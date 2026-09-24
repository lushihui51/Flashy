# 016 — Dense rows on the standalone field create

The follow-up cycle from the 2026-09-24 /investigate of task 015 T9's Notes line: the standalone field-create route was the one write path that broke the density invariant (task 003 D10), and the batch edit had an unstated "one entry per card" precondition. Branch: `feat/dense-field-create`, cut from `feat/persistence-surface-and-empty-practice` at `1009c68` or later (or from `main` once that branch's PR merges); it needs task 015 T8–T10 present, specifically `db_stage_create_field_def`, `db_stage_create_card_field_values`, `db_read_card_ids_for_deck`, and `tests/api_tests/test_layering_guard.py`.

Earlier task files affected by name only, for the next sync's Superseded bullets (nothing here invalidates a checked task): task 003 D10's list of paths that maintain density gains the standalone route; task 015's contract line "`db_create_field_def` is unchanged" becomes stale, and T9's Notes line has two wording slips ("would now add a duplicate row": the primary key rejects it and the effect is a misleading 422; "consults the identity map": the old tolerance came from the SELECT fallback, since the flushed row was unreferenced and had left the identity map).

## ADRs

Decisions this file implements; full context and rejected alternatives live in the ADRs.

- **ADR 057 — Every field create writes the dense value rows**: `POST /decks/{deck_id}/fields` writes a `""` value row for every existing card in the same transaction as the field, through the `create_field_def` service in `app/services/field_def_create.py`; `db_create_field_def` is deleted; every path that adds an active field writes its dense rows (task 003 D10 at ADR level); no data migration.

## Minor decisions

- **MD-1**: A `cards.update` list naming the same card more than once is rejected with `DeckBatchEditValidationError` (a 422) naming the card, checked before any update entry is read or applied; `field_defs.update`, `field_defs.delete`, and `cards.delete` are unchanged. Rejected: merging entries per card before the loop; leaving the rule as task 015 T9's Notes caveat.
- **MD-2**: The batch edit's commit handler keeps mapping every `IntegrityError` to "a conflicting deck or field name already exists"; revisit when a cycle touches that commit path or a second constraint surfaces through it. Rejected: narrowing it by constraint name now.
- **MD-3**: This cycle is its own task file and branch (`feat/dense-field-create`) rather than two tasks appended to task 015, which is complete and committed on its branch.

## Contracts

### New service (ADR 057)

- `app/services/field_def_create.py`: `create_field_def(db: Session, deck: Deck, name: str, field_type: FieldType) -> FieldDef`. In order: `touch(db, deck)`; `field_def = db_stage_create_field_def(db, deck.id, name, field_type, db_next_position(db, deck.id))`; `for card_id in db_read_card_ids_for_deck(db, deck.id): db_stage_create_card_field_values(db, card_id, {field_def.id: ""})`; `db.commit()`; `db.refresh(field_def)`; return it. Everything from the staged create through the commit sits in one `try`; on `IntegrityError` it calls `db.rollback()` and raises `ValueError("An active field with this name already exists") from None`, the message the deleted function raised. Session calls in the module: `commit`, `rollback`, `refresh` only. `name` is passed through untrimmed, as the route does today.

### Removed (ADR 057)

- `db_create_field_def` in `app/database_ops/field_def.py` is deleted: it has no caller left, and a committing field create that writes no value rows is the function that caused this cycle. The docstring of `db_stage_create_field_def`, which calls itself the "staged counterpart to db_create_field_def", becomes: "The caller supplies the position, because a caller building several fields in one transaction already knows each one's slot, and owns the commit. An `IntegrityError` from the flush propagates."

### Route behaviour (ADR 057)

- `POST /decks/{deck_id}/fields`: 404 for an unknown or foreign deck; 400 with detail `An active field with this name already exists` on an active-name collision, with nothing persisted; 201 with `FieldDefRead` otherwise, after which every card of the deck has one `card_field_value` row for the new field with value `""`. Request and response shapes are unchanged, so `frontend/src/api/types.ts` needs no regeneration.

### Batch-edit validation (MD-1)

- In `apply_deck_batch_edit`, immediately before the `for entry in ops.update:` loop of the cards phase, a pre-scan over `ops.update` with a `seen_card_ids: set[uuid.UUID]`: a repeated `entry.id` raises `DeckBatchEditValidationError(f"cards.update id {entry.id} is duplicated")`. It runs before any update entry is read or applied, so it precedes the existing not-found check. The router's mapping to 422 is unchanged.

## Tasks

T1 and T2 touch disjoint files and have no dependency on each other; they can run in either order or in parallel sessions.

### T1 — The standalone field create backfills every card (ADR 057) — no dependencies

- [x] **Goal:** creating a field through `POST /decks/{deck_id}/fields` leaves every card of the deck with a `""` value row for it, in the same transaction.
- **Files:** create `app/services/field_def_create.py`; modify `app/routers/api/field_def.py`, `app/database_ops/field_def.py`, `tests/api_tests/test_field_defs.py`.
- **Details:** Write the service per the Contracts; imports are `db_next_position`, `db_stage_create_field_def` from `app.database_ops.field_def`, `db_read_card_ids_for_deck`, `db_stage_create_card_field_values` from `app.database_ops.card`, `touch` from `app.services.activity`, `IntegrityError` from `sqlalchemy.exc`, `Session` from `sqlmodel`. In the router, the handler is itself named `create_field_def`, so import the service as `from app.services.field_def_create import create_field_def as create_field_def_service`, the pattern `app/routers/api/deck.py` uses for `delete_deck_service`; the handler body becomes: read the deck (404 unchanged), then `return create_field_def_service(db, deck, payload.name, payload.type)` inside the existing `try`/`except ValueError` that maps to 400; delete the handler's own `touch(db, deck)` line, since the service touches (the `touch` import stays for the other handlers); drop `db_create_field_def` from the router's import list. Delete `db_create_field_def` from `app/database_ops/field_def.py` and reword the staged function's docstring per the Contracts. Add to `TestFieldDefLifecycle` in `test_field_defs.py`: `test_field_create_backfills_dense_card_field_value_rows(self, client, db, existing_deck, existing_field_defs, existing_card)`: POST `{"name": "Extra", "type": "text"}` and assert 201; GET `/api/decks/{deck_id}` and, for the card whose id is `existing_card["id"]`, assert `values` has exactly 3 keys, the new field's id maps to `""`, and the two original values are unchanged (`Value for front`, `Value for back`); assert `db.exec(select(CardFieldValue).where(CardFieldValue.card_id == card_id)).all()` has length 3. And `test_duplicate_active_name_leaves_no_rows(self, client, db, existing_deck, existing_field_defs, existing_card)`: POST `existing_field_defs[0]`'s name and type, assert 400 with detail `An active field with this name already exists`, then assert the card still has exactly 2 `card_field_value` rows and GET `/api/decks/{deck_id}` still lists 2 field defs. The deck detail is the right read for these assertions because it builds `values` from the rows that exist (`app/routers/api/deck.py:44-55`); the standalone card read (`app/routers/api/card.py:28-39`) fabricates `""` for a missing row and would hide the bug.
- **Out of scope:** trimming or validating the name; changing the 400 to a 422; the other standalone field routes; any frontend change or `npm run gen:api`; `deck_batch_edit.py` and `deck_create.py`, whose backfills are already correct; a data migration (ADR 057); the T9 Notes wording (sync).
- **Done when:** `uv run pytest` passes in full, including the two new tests, `test_field_create_touches_deck_last_activity`, `test_duplicate_active_name_rejected`, and all four tests in `test_layering_guard.py`; `grep -rn "db_create_field_def" app/ tests/` returns nothing; `grep -n "db\." app/services/field_def_create.py` matches only `db.commit()`, `db.rollback()`, and `db.refresh(`; `grep -n "touch" app/routers/api/field_def.py` no longer shows a call inside the create handler.
- Notes: none. The service carries a short docstring the Contracts don't specify. The backfill test was confirmed to fail against the old route before the fix.

### T2 — The batch edit rejects a repeated card in `cards.update` (MD-1) — no dependencies

- [x] **Goal:** a batch edit whose `cards.update` names one card twice is refused with a 422 naming the card, before any entry is applied.
- **Files:** `app/services/deck_batch_edit.py`, `tests/api_tests/test_deck_batch_edit.py`.
- **Details:** Add the pre-scan per the Contracts, placed immediately above `for entry in ops.update:` in the cards phase, with a one-line comment stating that the values loop builds `existing` from `card.values` once per card and relies on a card appearing once (task 015 T9). Add to `TestCardsUpdateAlone`: `test_card_update_same_card_twice_rejected(self, client, existing_deck, existing_field_defs)`: create a card via POST `/api/cards` with front `Bonjour` and back `Hello`; PATCH with `_cards(update=[{"id": card_id, "values": {front_id: "a"}}, {"id": card_id, "values": {front_id: "b"}}])`; assert 422 and that the detail contains both `is duplicated` and the card id; GET `/api/decks/{deck_id}` and assert the card's front is still `Bonjour`. And `test_card_update_two_different_cards_accepted(self, client, existing_deck, existing_field_defs)`: create two cards, PATCH one update entry for each with a new front value, assert 200 and both new values in the response.
- **Out of scope:** the same rule on `field_defs.update`, `field_defs.delete`, or `cards.delete` (MD-1); merging entries per card; the values loop's create branch; the commit handler (MD-2); the frontend, which never sends `cards`.
- **Done when:** `uv run pytest` passes in full, including the two new tests and every existing test in `test_deck_batch_edit.py` unchanged; `grep -n "is duplicated" app/services/deck_batch_edit.py` prints exactly two lines, the `client_key` rule and the new one.
- Notes: none. The rejection test was confirmed to fail (200, not 422) without the pre-scan. One test beyond the spec, added at review: `TestRollback.test_duplicated_card_update_rolls_back_staged_card_delete` pins that a duplicate rolls back a `cards.delete` staged in the same request.
