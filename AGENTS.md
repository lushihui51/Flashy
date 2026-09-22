# AGENTS.md

## Project

- Flashy — flashcard SaaS. Frontend: React/TypeScript/Vite (`frontend/`). Backend: FastAPI/SQLModel/PostgreSQL (`app/`)
- Auth: Clerk (ADR 007). Every router depends on `CurrentUserDep` (`app/dependencies.py`), which verifies the session JWT and yields the user every query scopes ownership by; a foreign or unknown id is a 404, never a 403. The local-only bypass (`DEV_AUTH_USER_ID` plus `ENV=development`, both required) is never set outside local dev
- Frontend auth: `@clerk/react` (not `@clerk/clerk-react`) — it has no `<SignedIn>`/`<SignedOut>`; branch on `useUser()`'s `isLoaded`/`isSignedIn` instead

## Commands

- Frontend (in /frontend): `npm run dev`; tests `npx vitest run` (`npm run test` is watch mode and never exits); regenerate API types `npm run gen:api`
- Backend: `fastapi dev`; tests `pytest`. The app never creates tables — a fresh database needs `alembic upgrade head` first (ADR 045)
- Migrations: `alembic revision --autogenerate -m "message"`, read the generated file, verify it on a `pg_dump` copy of the dev database, then `alembic upgrade head` against the dev database while `alembic heads` shows a single head. The auto-reloading `fastapi dev` server is running the new models the moment they are saved, so a running server is the reason to upgrade promptly, not a reason to defer
- CI (`.github/workflows/ci.yml`, ADR 041) runs `pytest`, the alembic chain from an empty database, `vitest`, lint, and build on every PR and push to `main`; the `protect-main` ruleset requires both checks, so changes reach `main` through PRs
- Browser checks: with the ADR 007 bypass on, headless Chromium (`playwright-core` in the session scratchpad, browser build in `~/.cache/ms-playwright`) can drive the signed-out app at `localhost:5173` against the real backend

## Hard rules

- Python runs only inside the project venv (`source .venv/bin/activate`, or `uv run …`); Python dependencies via `uv`, Node dependencies via `npm` (in /frontend)
- Never edit `frontend/src/api/types.ts` by hand — regenerate it
- Before committing any frontend change, `npx vitest run`, `npm run lint`, and `npm run build` (which includes `tsc -b`) must all be clean, not just for the files you touched
- Schema changes reach any persistent database only through an alembic migration; nothing under `app/` calls `create_all`/`drop_all` (ADR 045; `tests/api_tests/test_schema_guard.py`). Only `tests/conftest.py` may, and only against `TEST_DATABASE_URL`
- Mastery arithmetic (blending, scoring, aggregation) lives only in `MasteryStrategy` implementations under `app/mastery/` — never in SQL, a SQLModel expression, or a trigger (ADR 012; `test_no_mastery_arithmetic_outside_strategy`)
- A `review_group_id`'s rows are logged atomically, in one transaction, and never appended to afterward (ADR 011)
- Every deletion of a subject, deck, field, or card goes through `compute_deletion_impact` then `apply_deletion` in `app/services/deletion.py`, inside the deleting transaction (ADR 051); the unexposed archive endpoints are the one exception ADR 049 keeps
- Timestamps are server-stamped UTC instants; the user's timezone is a rendering input only (ADR 019). Never accept a caller-supplied timestamp on a write endpoint, never store, order, or compare instants in anything but UTC, and compute every user-facing date in `app_user.timezone` at read time
- Several sessions may work in this checkout and against `TEST_DATABASE_URL` at once: stage with `git add -p`, commit only hunks that belong to your task, and don't start a full `pytest` run while a peer session is mid-run
- Never bulk-delete rows from the local dev database as "cleanup" after a browser check — it can hold real data at any time. Leave seeded data in place
- Diagnostic reports, investigation traces, and plan-mode findings are files in `docs/cc/` — never only a chat summary, never a path outside the repo (copy one in before the session ends). `cc` is the only directory under `docs/` you may write to without asking. Each report:
  - `YYYY-MM-DD-short-slug.md`, one file per investigation — never append to an earlier one; write a new one and link back
  - Opens with date, what prompted it, and a one-line outcome (`diagnosis only, no code changes` / `bug found and fixed in <commit>` / `deferred, see <plan>`); cites code as `path:LINE-LINE` and states what it does now, not what it should do
  - Records the decision and its reasoning — a "deferred" outcome says what would need to be true to revisit — and names any ADR, plan phase, or test assertion it contradicts or extends

## Conventions

- Backend layering (ADR 034): `app/routers/api/` → `app/services/` → `app/database_ops/` (one module per table plus `practice_generation.py`; public functions `db_*`-prefixed, ownership scoped in the query). A service exists only where a flow spans several operations; a one-query handler calls its `db_*` function directly
- `app/models/` (ADR 046): `<table>.py` holds the table, its `Base`, and only that table's flat `Create`/`Read`/`Update`/`Summary` shapes; a shape that nests another model or describes a page/flow lives in `app/models/<router>_payloads.py`. A table module imports a sibling's table class only for a `Relationship`, never a shape (`test_models_layout_guard.py`)
- Array columns are the generic `sqlalchemy.ARRAY`: `.overlap()` does not exist and `.contains()` raises, so overlap is `.op("&&")(ids)` and membership is `.any(id)` (task 013 MD-5)
- A rule that can drift silently gets a source-scan guard test in `tests/api_tests/`; extend those rather than relying on review
- Frontend dates go through `formatDate`/`formatDateTime` in `src/lib/datetime.ts`, which pins `timeZone`; ESLint blocks `toLocale*String` and `Intl.DateTimeFormat` everywhere else (ADR 019)
- Server data is fetched through TanStack Query only (ADR 033) and lives in the query cache, never copied into long-lived component state. Reusable components and everything in `ui/` never fetch: data arrives as props and the page owns the query
- Extend an existing component with props rather than forking a near-duplicate; a genuinely new component is named for its purpose, never a generic name that leaves two similar components indistinguishable at the import site
- Layout: one directory per functional area under `src/components/` (`shell/`, `library/`, `practice/`) plus `ui/` for domain-free primitives (see the directory — the inventory drifts). Pages are `src/pages/<Name>Page.tsx`, except routed create/edit forms, which live in their area directory and take a `mode: 'create' | 'edit'` prop (see `App.tsx`)
- UI copy never echoes schema terms (ADR 021): the user-facing word set — **practice**, **deck configuration**, **active** / **completed**, **Prompt side** / **Answer side**, **Always shown** / **Random draw**, **Not used** — is the vocabulary table in `docs/tasks/004-practice-setup.md`; change the table first, then every surface. Never "practice config", "pool", a slot name, "in progress", or "ended" in a label, heading, button, or error string
- Every non-top-level detail page carries one structural breadcrumb row above its `<h1>`, pointing at its hierarchy parent however it was reached; shell destinations and create/edit forms are exempt (ADR 025). Page-view state (tabs, filters) lives in the URL, never `useState`
- Round-trip return addresses ride the URL as `?returnTo=`, read only through `internalReturnTo` (`src/lib/returnTo.ts`); one-shot arrival results (`{deckId}`, `{configurationId}`) stay in router state (ADR 024)
- A `.tsx` file exports only components (`react-refresh/only-export-components`); shared values live in a sibling `.ts` (`ratingTiers.ts`, `navItems.ts`) or `src/lib/`
- Imports are absolute from `src/` (alias in `vite.config.ts` and `tsconfig.app.json`), never relative `../..` chains
- Routed pages render below `AppShell`'s sticky header — never size them with `min-h-dvh`/`h-screen`/full-height `flex-1`, or bottom controls land below the fold
- Modals/sheets are Radix Dialog (ADR 016), never a hand-rolled focus trap or scroll lock. A trigger that isn't a `Dialog.Trigger` descendant needs `SideDrawer.tsx`'s `triggerRef` + `onPointerDownOutside` pattern, or Radix silently blocks it while the dialog is open
- `src/api/*.ts` functions throw via `unwrap`/`unwrapVoid` (`src/api/unwrap.ts`) and never side-effect (ADR 006); a structured `{code, message}` detail throws `ApiDetailError`, which shape-aware callers `instanceof`-check (ADR 022). Errors render inline at the call site — a failed query as a banner in place of its content, a failed mutation next to its control; no ErrorBoundary, global cache handlers, or toasts (ADR 035)
- `// TODO(defer:<tag>)` marks every deliberately deferred item, backend included; `grep -rn "TODO(defer:" app/ frontend/src/` before calling a task or PR done
- Component tests: the Vitest environment is `node`; a DOM test opts in per file with `// @vitest-environment jsdom` (ADR 017). Reuse `src/test/testUtils.tsx` (`renderWithRouter`, `renderWithProviders`) and `src/test/mocks/clerk.ts` rather than re-mocking. RTL auto-cleanup doesn't fire (no `globals: true`); `test/setup.ts`'s `afterEach(cleanup)` does — don't remove it

## Mastery model

- One `review_group_id` is one appearance: a `ReviewGroup` bundling every rated answer field and the prompt fields shown with them
- `MasteryStrategy.expand(group)` decides every `(card_id, field_def_id, side)` update for an appearance up front (ADR 012). Breadth (how many rated answers a prompt was shown for) changes the prompt-side update's _weight_, never its _target_ — see the comment above `EMA_BETA` in `app/mastery/ema.py`; both review counts increment by exactly 1 per appearance regardless
- **Harshest-wins** must stay consistent in two places: `submit_rating` (`app/services/practice_run.py`) fails a `practice_card` if _any_ answer field is rated 1, and `EmaStrategy._aggregate_target` makes the prompt-side target the rating-1 score if any answer failed, otherwise the mean (ADR 012)
- A card's display mastery is `strategy.card_score` over all its deck's active fields, unreviewed ones at the prior (ADR 043) — one definition for every surface. Run deltas (ADR 042) read that run's own `mastery_log` rows plus one bounded latest-row-below-bound lookup per pair, never a history replay; the bound rule is the delta-semantics contract in `docs/tasks/010-mastery-log.md`

## Entity vocabulary

The 12 tables under `app/models/`; the model files and the ADRs cited hold the column-level detail.

- `app_user` — the authenticated user (keyed by `clerk_user_id`), root of every ownership chain; `timezone` is their IANA zone, synced from the `X-Timezone` header on every request (ADR 019)
- `subject` — a user's top-level grouping of decks; owns `deck` rows. `icon` is a key into the curated set in `frontend/src/lib/subjectIcon.ts`. `last_activity_at` (there is no `updated_at`, ADR 018) is the server-side sort key for every subject and deck list — the frontend never re-sorts — written only by `touch()` in `app/services/activity.py`
- `deck` — a named collection of cards under one `subject`; owns `card`, `field_def`, and `deck_practice_config` rows. Always has ≥2 active fields, at least one prompt and one answer, enforced on create, batch edit, and archive (task 003 D3). Deleting a deck deletes everything that references it, review rows and snapshots included, and a run left with no deck goes with it (ADR 047, ADR 048)
- `field_def` — the sole source of truth for a field (name, `FieldType`, `position`), referenced by id everywhere (ADR 009); removed by a hard delete through the deletion closure, which also deletes the configurations and active runs naming it, scrubs it from `review_log.shown_prompt_ids`, and rebuilds its deck's mastery (ADR 049); `archived_at` and the archive endpoints stay in the code, unexposed. The active field at position 0 is the deck's **primary field**, derived, never stored (ADR 032)
- `card` — one flashcard in a `deck`; holds no content itself
- `card_field_value` — a card's per-field content, dense: exactly one row per active `field_def` of the deck, `""` when unfilled, never a missing row (adding a field backfills every existing card in the same transaction); archived fields keep their rows but are excluded from every read path. An all-blank card is never persisted (task 003)
- `review_log` — append-only ledger of every rated field review, the source of truth mastery is rebuilt from; a row is owned by its card and field and cascades with them, so history never outlives what it is about (ADR 011, ADR 047, ADR 048); every id in `shown_prompt_ids` is a live `field_def` id, kept so by the closure's scrub
- `mastery_log` — append-only ledger of `(card, field)` state changes, ordered by `reviewed_at` (ADR 050), current mastery being the latest row per pair; a disposable projection of `review_log`, regenerated whole by `rebuild_mastery` or per deck by `rebuild_deck_mastery` (ADR 042, ADR 049)
- `deck_practice_config` — a saved, named, mutable template of which fields are prompts/answers and the pool-sampling rules; validated on save and again at run start (ADR 013)
- `practice_run` — one user's run (`practice_session` before ADR 038; the UI says "practice", ADR 021), `active` or `completed` only, spanning one or more `practice_deck`s; the only status transition is in `get_current_practice_card` (ADR 015 amended). Rerun creates a new run and keeps the original (ADR 039). A run left owning no `practice_deck` is deleted alongside its last deck (ADR 048)
- `practice_deck` — an immutable snapshot of a `deck_practice_config` taken at run start (ADR 013); cascades with its deck and with its run (ADR 048); `source_config_id` is attribution only (ADR 040)
- `practice_card` — one generated card instance in a run (`pending`/`passed`/`failed`), ordered by a sparse `position` (ADR 008); a failed card is requeued as a new row, never mutated (ADR 036, ADR 037); cascades with its card and its run (ADR 015)

## Context

- Design decisions: see docs/adr/
- Task files (one per cycle, per-task Notes, "Superseded since" corrections): see docs/tasks/
