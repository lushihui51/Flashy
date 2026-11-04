# 029 — Field deletion

## Goal

Outcome: A field leaves its deck only by deletion, and a deleted field is gone with everything it held: its value on every card, its mastery, its place in every practice that showed or asked it, and the configurations and active practices that named it. No screen shows "Removed field", and the app keeps no set-aside field.

Scope: The cycle covers the end of the archive in the schema, the API and every read that filtered on it, the field delete route through the deletion closure, the scrub of a deleted field's id from practice cards, the end of the breakdown's placeholder, and the tests that used the archive. It leaves the deck form's confirm as it is, since its sentence already names what goes, and "Practice these" refusing over a removed field to the summary's cycle.

Judgement: The engineer judges on the live server, on Edit deck of a deck with a completed practice: removing a field the practice asked and saving, then opening the practice's page and seeing each attempt without that field and no "Removed field" anywhere, the deck's cards with one field fewer, and the deck's mastery figures reading from the remaining fields alone.

## Records

- PDR 028: A field kept in its deck or deleted with all it held
- ADR 092: Independence of persistent entities from ephemeral ones, with live ids on practice cards
- ADR 093: One deletion closure for every deletion, scrubbing practice cards
- ADR 094: Total removal of a deleted field's influence, with no archive

## Tasks

### T1 — Field deletion in place of the archive

**Status**

- [x]

**Goal**

A field is either in its deck or gone: the schema, the API and every read know no archived field, and the one field delete route deletes through the deletion closure.

**Dependencies**

None.

**Files**

- `alembic/versions/<revision>_no_field_archive.py` (new, its revision id from `alembic revision`)
- `app/models/field_def.py`
- `app/database_ops/field_def.py`
- `app/database_ops/deck.py`
- `app/database_ops/mastery_log.py`
- `app/database_ops/practice_generation.py`
- `app/routers/api/field_def.py`
- `app/routers/api/deck.py`
- `app/routers/api/card.py`
- `app/services/deletion.py`
- `app/services/deck_batch_edit.py`
- `app/services/deck_copy.py`
- `app/services/deck_practice_config.py`
- `app/services/practice_run.py`
- `frontend/src/api/field_def.ts`
- `frontend/src/api/openapi.json`
- `frontend/src/api/types.ts`
- `frontend/src/test/field_def.test.ts`
- `frontend/src/components/library/CardTable.tsx`
- `frontend/src/components/library/CardList.tsx`
- `frontend/src/components/library/FieldAssignmentBoard.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.test.tsx`
- `frontend/src/lib/deckConfigurationBoard.ts`
- `frontend/src/lib/deckConfigurationBoard.test.ts`
- `tests/api_tests/test_field_defs.py`
- `tests/api_tests/test_auth_scoping.py`
- `tests/api_tests/test_activity_tracking.py`
- `tests/api_tests/test_cards.py`
- `tests/api_tests/test_decks.py`
- `tests/api_tests/test_deck_copy.py`
- `tests/api_tests/test_deck_practice_config.py`
- `tests/api_tests/test_practice_run.py`

**Details**

The schema, ADR 094:

- The migration must refuse to run, raising with the count, when any `field_def` row has `archived_at` set, so that no history is dropped unread; then it must drop the index `uq_field_def_deck_id_name_active`, create the unique index `uq_field_def_deck_id_name` on `(deck_id, name)`, and drop the column `archived_at`. Its downgrade adds the column back nullable and restores the conditioned index.
- `FieldDef` in `app/models/field_def.py` must declare `Index("uq_field_def_deck_id_name", "deck_id", "name", unique=True)` with no `postgresql_where`, and neither `FieldDef` nor `FieldDefRead` carries `archived_at`.

The reads: every filter on `archived_at` goes, and every comment or docstring that speaks of an archived field speaks of a deleted one or goes.

- `app/database_ops/field_def.py`: `db_read_field_defs` loses `include_archived`; `db_read_field_defs_for_copy` and `db_read_active_field_ids_for_decks` lose their filter, and the latter is renamed `db_read_field_ids_for_decks`, with its two callers in `app/services/deletion.py` following; `db_archive_field_def`, `db_count_card_field_values` and `db_hard_delete_field_def` go.
- `app/database_ops/deck.py`, `app/database_ops/mastery_log.py` and `app/database_ops/practice_generation.py`: the `archived_at IS NULL` condition goes from each join or where that holds it; the docstring of `db_fetch_generation_candidates` says "drops ids no longer live" in place of its archived clause.
- `app/routers/api/deck.py` and `app/routers/api/card.py`: the comments on `active_field_ids` say nothing of archived rows.
- `app/services/deck_copy.py`, `app/services/deck_practice_config.py` and `app/services/practice_run.py`: every `include_archived=True` argument goes, and each comment that explains a stale reference by an archived field explains it by a deleted one.

The route, ADR 094, in `app/routers/api/field_def.py`: `archive_field_def` and `hard_delete_field_def` go, and `read_field_defs` loses `include_archived`. In their place:

```python
@router.delete("/fields/{field_id}", status_code=204)
def delete_field_def(db: SessionDep, current_user: CurrentUserDep, field_id: uuid.UUID) -> None:
    """404 for a field that is not the user's; 422 with code `too_few_fields` when the deck would keep fewer than two fields."""
```

- It must delete through `delete_field` in `app/services/deletion.py`, written beside `delete_card`:

```python
def delete_field(
    db: Session, strategy: MasteryStrategy, user_id: uuid.UUID, field_def: FieldDef
) -> None:
    """Raises Refusal("too_few_fields", ...) before anything is staged when the deck
    has two fields; otherwise compute_deletion_impact over the one field, apply_deletion,
    touch(deck), commit."""
```

- The router obtains the strategy as `app/routers/api/deck.py` does, and maps the `Refusal` to 422 with `detail=e.detail`, as `archive_field_def` did.

The frontend:

- `frontend/src/api/field_def.ts`: `archiveFieldDef` and `hardDeleteFieldDef` become one `deleteFieldDef(fieldId: string): Promise<void>` over `DELETE /api/fields/{field_id}` through `unwrapVoid`, and `readFieldDefs(deckId: string)` takes no second argument.
- `frontend/src/test/field_def.test.ts`: the `include_archived` assertion goes from the list test, and the `archiveFieldDef` describe becomes a `deleteFieldDef` test that resolves on a 204.
- The comments in `CardTable.tsx`, or `CardList.tsx` once cycle 027 has renamed it, `FieldAssignmentBoard.tsx` and `deckConfigurationBoard.ts`, and the test names and ids in `deckConfigurationBoard.test.ts` and `DeckConfigurationEditor.test.tsx`, say "deleted" where they say "archived"; the tests keep their assertions, since a configuration fetched before its field's delete can still name the field.

The backend tests, each named for what it now proves:

- `test_field_defs.py`: `test_archive_below_two_active_fields_rejected` becomes `test_delete_below_two_fields_refused`, asserting 422 with code `too_few_fields` and that the field still reads 200. `test_list_field_defs_excludes_archived_by_default` becomes `test_list_field_defs_omits_a_deleted_field`, without the `include_archived` read. `test_archive_then_recreate_same_name_succeeds` becomes `test_delete_then_recreate_same_name_succeeds`, with the delete asserting 204. The three `test_hard_delete_*` tests become one `test_delete_removes_the_field_and_its_values`: with a card holding a value for the field, the delete returns 204, the field reads 404, and the card's read holds no key for it.
- `test_auth_scoping.py`: the `/hard` assertion goes; the delete's 404 assertion stays.
- `test_activity_tracking.py`: `test_field_archive_touches_deck_last_activity` becomes `test_field_delete_touches_deck_last_activity`; `test_field_hard_delete_touches_deck_last_activity` goes.
- `test_cards.py`: `test_card_create_rejects_archived_field_key` becomes `test_card_create_after_a_field_delete_fills_the_remaining_fields`, assertions unchanged.
- `test_decks.py`: the delete's comment says deleted, assertions unchanged.
- `test_deck_practice_config.py`: `test_archived_field_id_rejected` becomes `test_deleted_field_id_rejected`, assertions unchanged.
- `test_deck_copy.py`: `test_does_not_copy_archived_field_or_its_values` becomes `test_does_not_copy_a_deleted_field_or_its_values`, the delete asserting 204. `test_stale_config_rejected` becomes `test_config_deleted_with_its_field_is_not_found_on_copy`, expecting `LookupError`, since the closure deletes the configuration that named the field. `test_failed_copy_leaves_no_partial_state` makes its failure with a configuration id that does not exist, `uuid.uuid4()`, in place of the delete, expecting `LookupError`.
- `test_practice_run.py`: `test_archived_failed_pool_field_drops_out_and_card_still_requeues` and `test_archived_field_still_resolves` become one `test_deleting_a_field_deletes_the_active_practice_naming_it`: the delete returns 204 and the practice's state reads 404, ADR 094. `test_config_gone_stale_since_saving_400s_with_the_config_id` becomes `test_config_deleted_with_its_field_is_not_found_at_start`, expecting the status and code `create_practice_run` in `app/routers/api/practice_run.py` gives an unknown configuration id. `test_progress_counts_all_four_buckets_end_to_end` and `test_full_breakdown_all_four_buckets` make their stuck card by blanking the card's only answer value through `PATCH /api/cards/{id}` in place of the archive, since a blank value leaves the requeue nothing to draw from, ADR 095, and keep every other assertion. `test_rerun_drops_a_stale_deck_but_keeps_others` and `test_rerun_refuses_when_nothing_survives` assert 204 on the delete and keep the rest.

**Out of scope**

- Scrubbing a deleted field's id from practice cards, and the end of the breakdown's placeholder: T2.
- The word "active" where it means a deck's current fields, as in `active_fields` in `app/services/deck_batch_edit.py`: never, since it names no archive.
- Deleting archived rows the migration finds: never, by the migration; the engineer decides by hand.

**Done when**

- `grep -rin "archiv" app frontend/src tests docs/vocabulary.md` prints nothing.
- `uv run alembic heads` prints one revision, the new one, and `uv run alembic current` prints the same.
- `uv run python -c "from sqlalchemy import inspect; from app.database import engine; i = inspect(engine); print([c['name'] for c in i.get_columns('field_def')], [x['name'] for x in i.get_indexes('field_def')])"` prints no `archived_at` and the index `uq_field_def_deck_id_name`.
- `uv run pytest tests/api_tests/test_field_defs.py tests/api_tests/test_auth_scoping.py tests/api_tests/test_activity_tracking.py tests/api_tests/test_cards.py tests/api_tests/test_decks.py tests/api_tests/test_deck_copy.py tests/api_tests/test_deck_practice_config.py tests/api_tests/test_practice_run.py` passes, with the renamed tests named in the output.
- `uv run pytest` passes.
- `grep -c "archived_at\|include_archived" frontend/src/api/types.ts` prints `0`.

**Debrief**

Evidence, in Done-when order:

- `grep -rin "archiv" app frontend/src tests docs/vocabulary.md` printed nothing, exit status 1.
- `uv run alembic heads` printed `45fe82fb6098 (head)`; `uv run alembic current` printed `45fe82fb6098 (head)`. The migration is `alembic/versions/45fe82fb6098_no_field_archive.py`. Before applying it, a `pg_dump` copy of the dev database took the upgrade (columns `created_at deck_id name type position id`, index `uq_field_def_deck_id_name` on `(deck_id, name)` with no condition), took the downgrade back (column `archived_at` and the conditioned index `uq_field_def_deck_id_name_active` restored), and with one row's `archived_at` set the upgrade raised `RuntimeError: 1 field_def row(s) have archived_at set; decide what becomes of them by hand before dropping the column`. The copy was dropped afterwards. The dev database held no archived row and took the upgrade.
- The inspect command printed `['created_at', 'deck_id', 'name', 'type', 'position', 'id'] ['uq_field_def_deck_id', 'uq_field_def_deck_id_name']`.
- The eight-file pytest printed `214 passed`, with every renamed test named PASSED in its `-v` output: `test_delete_below_two_fields_refused`, `test_list_field_defs_omits_a_deleted_field`, `test_delete_then_recreate_same_name_succeeds`, `test_delete_removes_the_field_and_its_values`, `test_field_delete_touches_deck_last_activity`, `test_card_create_after_a_field_delete_fills_the_remaining_fields`, `test_deleted_field_id_rejected`, `test_does_not_copy_a_deleted_field_or_its_values`, `test_config_deleted_with_its_field_is_not_found_on_copy`, `test_failed_copy_leaves_no_partial_state`, `test_config_deleted_with_its_field_is_not_found_at_start`, `test_deleting_a_field_deletes_the_active_practice_naming_it`, `test_progress_counts_all_four_buckets_end_to_end`, `test_full_breakdown_all_four_buckets`, `test_rerun_drops_a_stale_deck_but_keeps_others`, `test_rerun_refuses_when_nothing_survives`.
- `uv run pytest` printed `349 passed`, with no other connection to the test database at the start.
- `grep -c "archived_at\|include_archived" frontend/src/api/types.ts` printed `0`.

The commit's checks: `npx vitest run` printed `58 passed (58)` files and `588 passed (588)` tests; `npm run lint` and `npm run build` printed no error; `npm run gen:api` regenerated `frontend/src/api/types.ts` and `frontend/src/api/openapi.json`.

Departures from Files:

- `frontend/src/components/library/CardTable.tsx` does not exist; cycle 027 renamed it to `CardList.tsx`, which Details anticipates, and that file took the comment edit.
- `app/services/deck_batch_edit.py`, added with the engineer's go-ahead: the name-clash handler in `apply_deck_batch_edit` matched the unique index by its old name, so a field renamed to a taken name on Edit deck fell through to the generic 422; it now matches `uq_field_def_deck_id_name`.
- `frontend/src/api/openapi.json`, added with the engineer's go-ahead: `npm run gen:api` writes it before `types.ts`, and the grep over `frontend/src` reads it. On the engineer's order it is also added to T2's Files, since T2 runs the same command.

Departures from Details:

- `db_read_field_ids_for_decks` has a third caller, `validate_deck_practice_config` in `app/services/deck_practice_config.py`, which followed the rename.
- `test_progress_counts_all_four_buckets_end_to_end` no longer creates its `filler` field, whose only reason was the two-field floor the archive hit; every assertion is kept. The breakdown's `_setup_deck` keeps its `filler`, which a card's dense write still fills, with its docstring reworded.
- `test_blanked_failed_pool_field_drops_out_and_card_still_requeues` keeps its assertions; its docstring no longer names the removed archive test as its twin.
- `test_deleting_a_field_deletes_the_active_practice_naming_it` also asserts the practice's state read 200 before the delete, so the 404 after it is the delete's doing.

For the engineer to read:

- `delete_field` in `app/services/deletion.py`: the two-field floor is checked by counting the deck's fields through `db_read_field_defs` before anything is staged, and the `Refusal` carries the same message as `apply_deck_batch_edit`'s.
- The `upgrade` of `alembic/versions/45fe82fb6098_no_field_archive.py`: the count query and the `RuntimeError` it raises are the migration's refusal.
- `test_config_deleted_with_its_field_is_not_found_at_start` in `tests/api_tests/test_practice_run.py` asserts 404 with code `config_not_found` and the configuration's id, which is what `create_practice_run` gives an unknown id.

### T2 — Practice cards scrubbed and the placeholder gone

**Status**

- [ ]

**Goal**

A deleted field's id is gone from every practice card, so every id a practice card holds names a live field, and no screen shows "Removed field".

**Dependencies**

- T1: `DELETE /api/fields/{field_id}` and `delete_field`, through which the tests delete, and the reads without an archive.

**Files**

- `docs/vocabulary.md`
- `app/database_ops/practice_card.py`
- `app/services/deletion.py`
- `app/services/practice_run.py`
- `app/models/practice_run_payloads.py`
- `frontend/src/api/openapi.json`
- `frontend/src/api/types.ts`
- `frontend/src/components/practice/FieldValue.tsx`
- `frontend/src/components/practice/RunBreakdown.tsx`
- `frontend/src/components/practice/RunBreakdown.test.tsx`
- `tests/api_tests/test_deletion.py`
- `tests/api_tests/test_practice_run.py`

**Details**

The words first: the vocabulary's "A field deleted after a practice used it" row, "Removed field", and its "A missing rating" row, "Unrated", leave, since after this task neither state can reach a screen.

The scrub, ADR 092 and ADR 093, in `app/database_ops/practice_card.py`:

```python
def db_stage_scrub_practice_card_field_ids(
    db: Session, deck_id: uuid.UUID, field_ids: Collection[uuid.UUID]
) -> None:
    """Removes each of field_ids from `prompts` and from `answers` on every practice
    card of this deck's cards, one UPDATE per id narrowed to the rows that name it, as
    db_stage_scrub_shown_prompt_ids does for review rows. No commit."""
```

- `apply_deletion` must call it right after `db_stage_scrub_shown_prompt_ids`, inside the same loop over `explicit_fields_by_deck`, and its docstring's list of what the closure takes names practice cards.
- The scrub must be scoped by card, through `Card.deck_id`, so no other deck's practice cards are read, ADR 094.

The resolution, ADR 092, in `app/services/practice_run.py` and `app/models/practice_run_payloads.py`:

- `_resolve_field_values` loses `keep_removed` and its placeholder branch; an id with no field row is dropped on every path, and its docstring says so. `_resolve_rated_field_values` and the breakdown's call pass no `keep_removed`.
- `ResolvedFieldValue` loses `removed`, and `RatedFieldValue.rating` becomes `int`, with both docstrings' placeholder sentences gone.

The frontend, after `npm run gen:api`:

- `FieldValue.tsx` loses its `removed` branch and the comment's placeholder sentence.
- `RunBreakdown.tsx`: the `field.removed !== true` condition goes, `RatingBadge` takes `rating: number`, and its "Unrated" fallback goes; a rating no tier matches renders nothing.
- `RunBreakdown.test.tsx`: the test `shows a removed field as "Removed field" with no value and no rating` goes, since the state it mounts can no longer arrive.

The backend tests:

- `test_deletion.py`, `test_field_deletion_drops_prompt_influence_scopes_the_scrub_and_updates_configs_and_runs`: gains, on `completed_run_with_b`, one practice card naming B in `prompts` and one naming it in `answers`, and on a run of deck2 a practice card naming B, and asserts after the delete that the two deck1 practice cards hold no B in either array while deck2's still does.
- `test_practice_run.py`: `test_removed_fields_stay_as_placeholders_in_every_attempt` becomes `test_deleted_fields_leave_every_attempt`, asserting each attempt's `prompts` is exactly p1 and its `answers` exactly a1 with rating 4, and no `removed` key anywhere. `test_resolver_drops_unknown_ids_unless_asked_to_keep_them` becomes `test_resolver_drops_unknown_ids`, keeping the ordering assertion over live entries alone. Every `"removed": False` in an expected payload goes.

**Out of scope**

- Scrubbing a deleted field's id from a snapshot's arrays: never, ADR 092.
- The summary's new layout and words: the summary's cycle.
- Filtering a dead id when reading a practice card: never, ADR 094.

**Done when**

- `grep -n '"Removed field"\|"Unrated"' docs/vocabulary.md` prints nothing.
- `grep -rn '"removed"\|\.removed\|removed=\|keep_removed\|Unrated' app frontend/src/components/practice frontend/src/api/types.ts tests/api_tests/test_practice_run.py` prints nothing.
- `grep -n "db_stage_scrub_practice_card_field_ids" app/services/deletion.py` prints two lines, the import and the call.
- `uv run pytest tests/api_tests/test_deletion.py tests/api_tests/test_practice_run.py` passes, with `test_deleted_fields_leave_every_attempt` and `test_resolver_drops_unknown_ids` named in the output.
- `uv run pytest` passes.
- The cycle's judgement: on the live server, signed out of Clerk, a deck with at least three fields and a completed practice that asked one of them; a script in the session scratchpad records that practice's breakdown before, removes that field on Edit deck through the deck form's Remove and Save, and records the breakdown after; the before holds the field in every attempt that asked it and the after holds it in none, with no `removed` key and no "Removed field" or "Unrated" text on the practice's page at 390px width, and the deck page shows one field fewer. The script's output and the two page screenshots are named in the Debrief, for the engineer to drive the same path with a mouse.

**Debrief**

None.
