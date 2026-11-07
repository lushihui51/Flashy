# 008 — Dependency and contract cleanup

## Goal

Outcome: Four dead dependencies and the vestigial `cards` array of the deck-create contract are removed.

Scope: The four dead dependencies, with the scratch cache file and its settings, and the `cards` array of the deck-create contract, removed end to end.

Judgement: None.

## Records

- ADR 007: Clerk as the authentication provider

## Tasks

### T1 — Drop the four dead dependencies

**Status**

- [x]

**Goal**

`redis[hiredis]`, `jinja2`, `nodeenv`, and the explicit `react-router` entry are gone, along with the scratch cache file and its settings.

**Dependencies**

None.

**Files**

- `pyproject.toml`
- `uv.lock` (regenerated)
- `app/cache.py` (delete)
- `app/config.py`
- `.env` (untracked: edit the local file)
- `frontend/package.json`
- `frontend/package-lock.json` (regenerated)

**Details**

The four dead dependencies must be removed with no ADRs: `redis[hiredis]` with its never-imported scratch file `app/cache.py` and the `cache_host`/`cache_port` settings, `jinja2`, `nodeenv`, and the explicit `react-router` entry.

`Settings` after this task: `database_url`, `test_database_url`, `permitted_origins`, `model_config`, `vite_clerk_publishable_key`, `clerk_fapi_url`, `dev_auth_user_id`, `env`; exactly the current class minus `cache_host`/`cache_port` (`app/config.py`).

Remove the three lines from `pyproject.toml`'s dependencies; `uv lock && uv sync`. Delete `app/cache.py`. Remove `cache_host`/`cache_port` from `Settings`, and the `CACHE_HOST`/`CACHE_PORT` lines from `.env`. In `frontend/package.json`, remove the `"react-router"` entry only; `"react-router-dom"` stays. Then `npm install` to regenerate the lockfile.

**Out of scope**

- Any import changes in `frontend/src`.
- Adding a `.env.example`.
- Touching AGENTS.md.
- Recording any of this in an ADR.

**Done when**

- `grep -rn 'redis\|jinja2\|nodeenv' pyproject.toml` is empty.
- `grep -rn 'import redis\|cache_host\|cache_port' app/ tests/` is empty.
- `grep -n '"react-router"' frontend/package.json` is empty while `react-router-dom` remains.
- In `frontend/`, `npm install` exits clean.
- In `frontend/`, `npm ls react-router` shows it only as a dependency of `react-router-dom`.

**Debrief**

All Done-when checks pass as literally stated. One nuance not covered by the criteria: `jinja2` is not fully gone from the dependency tree. `uv lock` shows it remains as a transitive dependency of `fastapi[standard]` (its optional-extras group), so it still appears in `uv.lock`. It's gone from `pyproject.toml`'s own dependency list, which is what the Done-when grep checks and what Details target (the direct, unused declaration); no code in this repo imports it either way. Backend: `uv run pytest` 236/236 passed. Frontend: `npm run build` (tsc + vite) clean, `npx vitest run` 378/378 passed, `npm run lint` clean, run beyond the literal Done-when list per AGENTS.md's pre-commit rule.

### T2 — Remove `cards` from deck-create end to end

**Status**

- [x]

**Goal**

`POST /api/decks` accepts identity + schema only; card creation exists solely on `POST /api/cards` and batch edit.

**Dependencies**

None.

**Files**

- `app/models/deck.py`
- `app/models/__init__.py`
- `app/services/deck_create.py`
- `app/routers/api/deck.py` (call site)
- `tests/conftest.py`
- `tests/api_tests/test_decks.py`
- `tests/api_tests/test_auth_scoping.py` (mechanical seed edits only)
- `tests/api_tests/test_activity_tracking.py` (mechanical seed edits only)
- `tests/api_tests/test_deck_delete_cascade.py` (mechanical seed edits only)
- `tests/api_tests/test_deck_copy.py` (mechanical seed edits only)
- `tests/api_tests/test_deck_batch_edit.py` (mechanical seed edits only)
- `tests/api_tests/test_subjects.py` (mechanical seed edits only)
- `frontend/src/lib/deckEditorReducer.ts`
- `frontend/src/lib/deckEditorReducer.test.ts`
- `frontend/src/api/openapi.json` (regenerated)
- `frontend/src/api/types.ts` (regenerated)

**Details**

The deck-create `cards` field must be removed outright, never kept accepting-but-ignored; the field, its model, the service's card-persistence path, and every test of create-with-cards behavior go.

`POST /api/decks` after this task:

```python
class DeckCreate(AppModel):
    name: str
    subject_id: uuid.UUID
    field_defs: list[FieldDefCreate]
```

- `DeckCardCreate` is deleted (`app/models/deck.py`, and its `app/models/__init__.py` export). `create_deck_atomic` loses its `cards` parameter and the card/value persistence loop, the misaligned-`values`-length validation, and the all-empty-card-drop rule; those behaviors cease to exist, they are not relocated.
- A payload that still contains a `cards` key gets 201 with the key ignored (Pydantic's default extra-field handling on `AppModel`; nothing sends one after this task). It is **not** a 422.
- The `DeckDetail` **read** shape keeps its `cards` list unchanged; it is always `[]` immediately after create. `DeckBatchEdit.cards` (the batch-edit changeset ops) and `POST /api/cards` (`{deck_id, values: {field_id: string}}`) are untouched; they are the only ways cards come to exist.

`buildDeckCreatePayload` after this task returns `{ name, subject_id, field_defs }` (`frontend/src/lib/deckEditorReducer.ts`); the generated `DeckCreate` type loses `cards`, so `tsc` fails until the `cards: []` line is gone.

Implement the two contracts above. In tests: `conftest.py`'s `multi_subject_library` and every other create-with-cards seed switches to creating the deck bare, then `POST /api/cards` per card with `values` keyed by the returned `field_defs` ids (the `existing_card` fixture is the pattern). Delete the three tests of create-with-cards behavior in `test_decks.py`, `test_misaligned_card_values_rejected`, `test_card_values_are_dense_over_field_defs`, `test_rollback_on_later_card_failure`, and strip the card assertions from `test_happy_path`; density and blank-as-`""` on the standalone path are already covered by `test_cards.py`, do not duplicate them. Update `buildDeckCreatePayload` and its docstring (the "cards is always empty" sentence goes), and the `cards: []` assertion in `deckEditorReducer.test.ts`. If `npx tsc`/tests surface other `cards`-payload assertions (e.g. `DeckEditor.test.tsx`), fix those call sites the same way; the regenerated type is the enforcement.

**Out of scope**

- Batch-edit `cards` ops, `POST /api/cards`, and the `DeckDetail.cards` read shape, all unchanged per the contract.
- Any Alembic migration.

**Done when**

- `grep -n 'cards' app/services/deck_create.py app/models/deck.py` shows only `DeckBatchEdit.cards` and the `DeckDetail`/read-shape references, no `DeckCardCreate`, no `DeckCreate.cards`.
- After `npm run gen:api`, the generated `DeckCreate` type has no `cards`.

**Debrief**

All Done-when checks pass as literally stated. Two deviations from the Details, both mechanical, neither a design change: (1) `deckEditorReducer.test.ts` never actually asserted `cards: []`; its only `cards` reference is an unrelated `DeckDetail` read-shape fixture, which is untouched by this task's contract (per contract, `DeckDetail.cards` stays as-is). The real `cards`-in-create-payload assertions the Details anticipated under "other call sites" turned out to be in `frontend/src/test/deck.test.ts` (a `components["schemas"]["DeckCreate"]`-typed payload with a literal `cards` key, now removed from both its test cases) and `DeckEditor.test.tsx` (a hand-typed mock-server body asserting `expect(body.cards).toEqual([])`, now `expect(body).not.toHaveProperty('cards')`, with its inline body type's `cards` field removed), fixed per the Details' own contingency ("fix those call sites the same way"). (2) `create_deck_atomic`'s local `new_field_defs` list became dead (built, never read) once the card-persistence loop that consumed it was removed; deleted it along with the loop rather than leaving unused code. Test conversions: `tests/conftest.py`'s `multi_subject_library`, `tests/api_tests/test_decks.py::test_read_decks_includes_card_count_and_field_names`, `test_deck_batch_edit.py::test_card_from_another_deck_rejected`, and `test_subjects.py::test_delete_subject_cascades_its_decks` all switched from a `cards` array in the deck-create payload to a bare create followed by `POST /api/cards` per card, keyed by the returned `field_defs` ids; the last of these also gained a `GET /api/cards/{id}` 404 assertion after the cascade, since a real card now exists to check. Every other `"cards": []` in a deck-create payload (test_auth_scoping.py, test_activity_tracking.py ×9, test_deck_copy.py ×2, test_deck_batch_edit.py ×1, test_subjects.py ×2) was a no-op key removed outright; none of those tests read the field back. `test_decks.py`'s three create-with-cards behavior tests were deleted as directed; `test_happy_path` strips to schema-only assertions plus `data["cards"] == []`. Backend: `uv run pytest` 233/233 passed (236 minus the 3 deleted tests). Frontend: `npm run build` clean, `npx vitest run` 378/378 passed, `npm run lint` clean.
