# 008 — Dependency and contract cleanup

Removes four dead dependencies and the vestigial `cards` array from the deck-create contract, per the 2026-08-27 /plan session (which followed the same day's /sync checkpoint). Branch: `chore/dependency-cleanup`, independent of 006's `rewrite/practice-run` — no shared files.

## ADRs

Decisions this cycle resolved; full context and rejected alternatives live in the ADRs.

- **ADR 023 — Entity actions in the header, collection actions in the collection, no card entry in deck forms**: T2 executes the deferred cleanup its Consequences name — the vestigial `cards` array leaves the deck-create contract.
- **ADR 035 — Errors render inline at their call site, no global handler, no toasts**: recorded this cycle; no task here implements it — it records the frontend convention that already exists in code.
- **ADR 007 (amended this cycle) — backend token verification**: an implementation note naming PyJWT with a cached `PyJWKClient` against Clerk's JWKS; no task here implements it — it records existing code (`app/verify_clerk_session.py`).

## Minor decisions

- **MD-1**: The four dead dependencies are removed with no ADRs — `redis[hiredis]` with its never-imported scratch file `app/cache.py` and the `cache_host`/`cache_port` settings (premature cache experiment), `jinja2` (pre-React prototype leftover), `nodeenv` (abandoned frontend-isolation idea), and the explicit `react-router` entry (all imports go through `react-router-dom`, which keeps the core transitively). Never-adopted experiments need no record. Rejected: ADRs for the removals; migrating 42 files to import from bare `react-router`. (T1)
- **MD-2**: The deck-create `cards` field is removed outright rather than kept accepting-but-ignored — a dead contract surface someone would eventually "fix". Executes ADR 023's deferred cleanup; the field, its model, the service's card-persistence path, and every test of create-with-cards behavior go. (T2)

## Contracts

### `POST /api/decks` after T2 (ADR 023, MD-2)

```python
class DeckCreate(AppModel):
    name: str
    subject_id: uuid.UUID
    field_defs: list[FieldDefCreate]
```

- `DeckCardCreate` is deleted (`app/models/deck.py`, and its `app/models/__init__.py` export). `create_deck_atomic` loses its `cards` parameter and the card/value persistence loop, the misaligned-`values`-length validation, and the all-empty-card-drop rule — those behaviors cease to exist, they are not relocated.
- A payload that still contains a `cards` key gets 201 with the key ignored (Pydantic's default extra-field handling on `AppModel`; nothing sends one after this task). It is **not** a 422.
- The `DeckDetail` **read** shape keeps its `cards` list unchanged — it is simply always `[]` immediately after create. `DeckBatchEdit.cards` (the batch-edit changeset ops) and `POST /api/cards` (`{deck_id, values: {field_id: string}}`) are untouched — they are the only ways cards come to exist.

### `buildDeckCreatePayload` after T2 (ADR 023, MD-2)

Returns `{ name, subject_id, field_defs }` (`frontend/src/lib/deckEditorReducer.ts`); the generated `DeckCreate` type loses `cards`, so `tsc` fails until the `cards: []` line is gone.

### `Settings` after T1 (MD-1)

`database_url`, `test_database_url`, `permitted_origins`, `model_config`, `vite_clerk_publishable_key`, `clerk_fapi_url`, `dev_auth_user_id`, `env` — exactly the current class minus `cache_host`/`cache_port` (`app/config.py`).

## Tasks

Execution order T1 → T2, but they share no files and are safe to run in parallel sessions.

### T1 — Drop the four dead dependencies (MD-1)

- [x] **Goal:** `redis[hiredis]`, `jinja2`, `nodeenv`, and the explicit `react-router` entry are gone, along with the scratch cache file and its settings.
- **Files:** `pyproject.toml`, `uv.lock` (regenerated), `app/cache.py` (delete), `app/config.py`, `.env` (untracked — edit the local file), `frontend/package.json`, `frontend/package-lock.json` (regenerated).
- **Details:** Remove the three lines from `pyproject.toml`'s dependencies; `uv lock && uv sync`. Delete `app/cache.py` (nothing imports it). Remove `cache_host`/`cache_port` from `Settings` per the contract, and the `CACHE_HOST`/`CACHE_PORT` lines from `.env`. In `frontend/package.json`, remove the `"react-router"` entry only — `"react-router-dom"` stays — then `npm install` to regenerate the lockfile.
- **Out of scope:** any import changes in `frontend/src` (there are none from `'react-router'`); adding a `.env.example`; touching AGENTS.md; recording any of this in an ADR (MD-1).
- **Done when:** `grep -rn 'redis\|jinja2\|nodeenv' pyproject.toml` is empty and `grep -rn 'import redis\|cache_host\|cache_port' app/ tests/` is empty; `uv run pytest` passes; `grep -n '"react-router"' frontend/package.json` is empty while `react-router-dom` remains; in `frontend/`, `npm install` exits clean, `npm ls react-router` shows it only as a dependency of `react-router-dom`, and `npm run build` passes.
- Notes: All Done-when checks pass as literally stated. One nuance not covered by the criteria: `jinja2` is not fully gone from the dependency tree — `uv lock` shows it remains as a transitive dependency of `fastapi[standard]` (its optional-extras group), so it still appears in `uv.lock`. It's gone from `pyproject.toml`'s own dependency list, which is what the Done-when grep checks and what MD-1 targets (the direct, unused declaration); no code in this repo imports it either way. Backend: `uv run pytest` 236/236 passed. Frontend: `npm run build` (tsc + vite) clean, `npx vitest run` 378/378 passed, `npm run lint` clean — run beyond the literal Done-when list per AGENTS.md's pre-commit rule. Branch note: this session started on `rewrite/sync-and-distill` (uncommitted docs changes from the prior /sync, /plan, /decompose, /justify steps in the same conversation); created `chore/dependency-cleanup` from that point via `git checkout -b` rather than a clean base, so the earlier docs changes ride along on this branch too.

### T2 — Remove `cards` from deck-create end to end (ADR 023, MD-2)

- [x] **Goal:** `POST /api/decks` accepts identity + schema only; card creation exists solely on `POST /api/cards` and batch edit.
- **Files:** `app/models/deck.py`, `app/models/__init__.py`, `app/services/deck_create.py`, `app/routers/api/deck.py` (call site), `tests/conftest.py`, `tests/api_tests/test_decks.py`, plus every test file whose deck-create payload includes `cards` (`test_auth_scoping.py`, `test_activity_tracking.py`, `test_deck_delete_cascade.py`, `test_deck_copy.py`, `test_deck_batch_edit.py`, `test_subjects.py` — mechanical seed edits only), `frontend/src/lib/deckEditorReducer.ts`, `frontend/src/lib/deckEditorReducer.test.ts`, regenerated `frontend/src/api/openapi.json` + `types.ts`, `docs/tasks/003-frontend-rebuild-creation-flows.md` (one bullet).
- **Details:** Implement the two contracts above. In tests: `conftest.py`'s `multi_subject_library` and every other create-with-cards seed switches to creating the deck bare, then `POST /api/cards` per card with `values` keyed by the returned `field_defs` ids (the `existing_card` fixture is the pattern). Delete the three tests of create-with-cards behavior in `test_decks.py` — `test_misaligned_card_values_rejected`, `test_card_values_are_dense_over_field_defs`, `test_rollback_on_later_card_failure` — and strip the card assertions from `test_happy_path`; density and blank-as-`""` on the standalone path are already covered by `test_cards.py`, do not duplicate them. Update `buildDeckCreatePayload` and its docstring (the "cards is always empty" sentence goes), and the `cards: []` assertion in `deckEditorReducer.test.ts`. Add one bullet to 003's "Superseded since (sync 2026-08-27)" section: the create contract no longer has a `cards` field at all (this task, executing ADR 023's deferred cleanup; MD-2). If `npx tsc`/tests surface other `cards`-payload assertions (e.g. `DeckEditor.test.tsx`), fix those call sites the same way — the regenerated type is the enforcement.
- **Out of scope:** batch-edit `cards` ops, `POST /api/cards`, and the `DeckDetail.cards` read shape (all unchanged per contract); any Alembic migration (no schema change — this is API contract only); ADR 023 (its "until the deferred cleanup lands" wording self-resolves).
- **Done when:** `grep -n 'cards' app/services/deck_create.py app/models/deck.py` shows only `DeckBatchEdit.cards` and the `DeckDetail`/read-shape references, no `DeckCardCreate`, no `DeckCreate.cards`; `uv run pytest` passes; `npm run gen:api` run and the generated `DeckCreate` type has no `cards`; `npx vitest run`, `npm run lint`, `npm run build` clean; the 003 bullet is present.
- Notes: All Done-when checks pass as literally stated. Two deviations from the Details, both mechanical, neither a design change: (1) `deckEditorReducer.test.ts` never actually asserted `cards: []` — its only `cards` reference is an unrelated `DeckDetail` read-shape fixture, which is untouched by this task's contract (per contract, `DeckDetail.cards` stays as-is). The real `cards`-in-create-payload assertions the Details anticipated under "other call sites" turned out to be in `frontend/src/test/deck.test.ts` (a `components["schemas"]["DeckCreate"]`-typed payload with a literal `cards` key, now removed from both its test cases) and `DeckEditor.test.tsx` (a hand-typed mock-server body asserting `expect(body.cards).toEqual([])`, now `expect(body).not.toHaveProperty('cards')`, with its inline body type's `cards` field removed) — fixed per the Details' own contingency ("fix those call sites the same way"). (2) `create_deck_atomic`'s local `new_field_defs` list became dead (built, never read) once the card-persistence loop that consumed it was removed; deleted it along with the loop rather than leaving unused code. Test conversions: `tests/conftest.py`'s `multi_subject_library`, `tests/api_tests/test_decks.py::test_read_decks_includes_card_count_and_field_names`, `test_deck_batch_edit.py::test_card_from_another_deck_rejected`, and `test_subjects.py::test_delete_subject_cascades_its_decks` all switched from a `cards` array in the deck-create payload to a bare create followed by `POST /api/cards` per card, keyed by the returned `field_defs` ids — the last of these also gained a `GET /api/cards/{id}` 404 assertion after the cascade, since a real card now exists to check. Every other `"cards": []` in a deck-create payload (test_auth_scoping.py, test_activity_tracking.py ×9, test_deck_copy.py ×2, test_deck_batch_edit.py ×1, test_subjects.py ×2) was a no-op key removed outright — none of those tests read the field back. `test_decks.py`'s three create-with-cards behavior tests were deleted as directed; `test_happy_path` strips to schema-only assertions plus `data["cards"] == []`. Backend: `uv run pytest` 233/233 passed (236 minus the 3 deleted tests). Frontend: `npm run build` clean, `npx vitest run` 378/378 passed, `npm run lint` clean.
