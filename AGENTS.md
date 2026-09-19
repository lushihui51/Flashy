# AGENTS.md

## Project

- Name: Flashy
- Description: Flashcard SaaS
- Frontend: React/TypeScript/Vite
- Backend: FastAPI/SQLModel/PostgreSQL
- Auth: Clerk, integrated — every router depends on `CurrentUserDep`
  (`app/dependencies.py`), which verifies the session JWT and scopes ownership in
  the query, not in Python after the fetch. A local-only bypass (`DEV_AUTH_USER_ID`
  plus `ENV=development`, both required) skips verification and is never set outside
  local dev (ADR 007)
- Frontend auth: `@clerk/react` (not `@clerk/clerk-react`) — no `<SignedIn>`/`<SignedOut>` components exist in this package; branch on `useUser()`'s `isLoaded`/`isSignedIn` fields instead (ADR 007)

## Commands

- Frontend dev server: `npm run dev` (in /frontend)
- Backend dev server: `fastapi dev`. The app never creates tables — a fresh database needs `alembic upgrade head` first (ADR 045)
- Tests: `pytest`; `npx vitest run` (in /frontend — `npm run test` is `vitest` in watch mode and never exits)
- Regenerate API types: `npm run gen:api` (in /frontend)
- Migrations: `alembic revision --autogenerate -m "message"` to generate migration, then `alembic upgrade head` to apply
- CI: `.github/workflows/ci.yml` runs `pytest`, the alembic chain from an empty database, `vitest`, lint, and build on every PR and push to `main` (ADR 041). The `protect-main` ruleset requires both the `backend` and `frontend` checks, so changes reach `main` through PRs
- Browser checks: with the ADR 007 dev bypass on, headless Chromium (`playwright-core` installed in the session scratchpad, using the machine's `~/.cache/ms-playwright` build) can drive the signed-out app at `localhost:5173` against the real backend; leave any data it seeds in place afterwards (hard rule below)

## Hard rules

- Never run Python commands outside the project venv: `source .venv/bin/activate` first (CI and `npm run gen:api` use `uv run …`, which is equivalent)
- Never edit frontend/src/api/types.ts by hand, regenerate with `npm run gen:api` (in /frontend)
- Before committing any frontend change, run `npx vitest run`, `npm run lint`, and `npm run build` (in /frontend) — all three clean, not just the file(s) you touched. `npm run build` already runs `tsc -b` before bundling, so this covers typecheck + tests + lint + bundle
- Always read the generated migration before applying it
- Schema changes reach any persistent database only through an alembic migration; nothing under `app/` calls `SQLModel.metadata.create_all`/`drop_all` (ADR 045; `tests/api_tests/test_schema_guard.py` fails if one appears). Only `tests/conftest.py` may `create_all`, and only against `TEST_DATABASE_URL`
- Always manage Python dependencies with `uv`
- Always manage Node dependencies with `npm` (in /frontend)
- Mastery arithmetic (blending, scoring, aggregation) lives only inside `MasteryStrategy`
  implementations under `app/mastery/` — never in SQL, a SQLModel expression, or a
  trigger, in any phase
- A `review_group_id`'s rows must be logged atomically, in one transaction, and never appended to afterward — the prompt side's breadth is computed from the whole group (ADR 011)
- Diagnostic reports, investigation traces, and plan-mode findings are files in `docs/cc/` — never only a chat summary, and never a path outside the repository. If plan mode wrote a file elsewhere, copy it into `docs/cc/` before ending the session and reference the repo path in your summary
- `cc` is the only directory under `docs/` that you may create or edit files in without asking, everything else needs explicit permissions
- Several sessions may work in this checkout and against the `TEST_DATABASE_URL` database at the same time: before staging, confirm every hunk belongs to your task (`git add -p`), commit only your own files, and don't start a full `pytest` run while a peer session is mid-run
- Timestamps are server-stamped UTC instants; the user's timezone is a **rendering** input only (ADR 019). Never accept a caller-supplied timestamp on a write endpoint, and never store, order, or compare instants in anything but UTC. The user's IANA zone rides every request as the `X-Timezone` header and is stored on `app_user.timezone`; every user-facing date (display, "today", day-bucketing, streaks) is computed in it at read time
- Never bulk-delete rows from the local dev database as "cleanup" after seeding data for a live browser check (e.g. deleting every subject/deck currently present). The dev database can hold real data at any time, and a delete-everything cleanup can't tell that apart from what was just seeded. Leave seeded data in place once a browser check is done instead of removing it

## Conventions

- Backend layering (ADR 034): `app/routers/api/` → `app/services/` → `app/database_ops/` (one module per table, `db_*` prefix, ownership scoped in the query); a service exists only where a flow spans multiple operations — a one-query handler calls its `db_*` function directly
- `app/models/` layout (ADR 046): `<table>.py` holds the table, its `Base`, and only that table's own single-row shapes (`Create`/`Read`/`Update`/`Summary` — scalar additions allowed, nested models not). A shape that nests another model or describes a page/flow lives in `app/models/<router>_payloads.py` (`practice_run_payloads.py`, `deck_payloads.py`). A table module may import a sibling's table class for a `Relationship`, never a shape — `tests/api_tests/test_models_layout_guard.py` enforces that half
- Frontend date formatting goes through `formatDate`/`formatDateTime` in `frontend/src/lib/datetime.ts`, which pins `timeZone` explicitly — never `toLocaleDateString`/`toLocaleString`/`toLocaleTimeString` or a hand-built `Intl.DateTimeFormat`. An ESLint `no-restricted-syntax` rule blocks those outside that one file (ADR 019)
- Frontend server fetch through TanStack Query (ADR 033), no raw fetch in components; server data lives in the query cache, never copied into long-lived component state
- Reusable components do not fetch, all data are passed down as props
- When a new surface needs something close to an existing component, extend that component with props (e.g. a prop saying whether a picker is being used to filter or to create) rather than forking a near-duplicate — one interaction layer, one set of bugs. If a genuinely new component is warranted, name it for the purpose it serves (`SubjectFilterCombobox`), never a generic name that leaves two similar components indistinguishable at the import site
- Frontend component/page layout: one directory per functional area under `frontend/src/components/` (e.g. `shell/` for the app-shell chrome — TopBar, SideDrawer, AccountSheet, AuthSlot, Logo, SearchBar), not a flat `components/`. Pages are `frontend/src/pages/<Name>Page.tsx`, except routed create/edit forms, which live in their area directory and take a `mode: 'create' | 'edit'` prop (`SubjectForm`, `DeckEditor`, `CardStandaloneForm`, `DeckConfigurationEditor` — see `App.tsx`). The one non-area directory is `ui/`: domain-free primitives every area may import (see the directory — the inventory drifts). Nothing in `ui/` fetches or knows an entity — a primitive that needs data takes it as props, and the page owns the query
- A `.tsx` component file exports only components — ESLint's `react-refresh/only-export-components` rejects an exported constant or helper — so shared values live in a plain `.ts` module — a sibling (`ratingTiers.ts`, `navItems.ts`) or `src/lib/` (`pickerConfig.ts`)
- Imports are absolute from `src/` (alias in `vite.config.ts` and `tsconfig.app.json`), never relative `../..` chains
- Routed pages render below `AppShell`'s sticky header — don't size their content with `min-h-dvh`/`h-screen`/full-height `flex-1`, since the box ends up taller than what's visible and pins bottom controls below the fold
- Modals/sheets: use Radix Dialog primitives (`@radix-ui/react-dialog`, ADR 016), not a hand-rolled focus trap/scroll-lock. If the trigger button isn't a `Dialog.Trigger` descendant (e.g. it lives in a sibling component), thread a `triggerRef` for `onCloseAutoFocus`-based focus restoration and give the trigger an inline `pointerEvents: 'auto'` + a matching `onPointerDownOutside` exemption, or Radix's `disableOutsidePointerEvents` silently blocks it while the dialog is open (see `SideDrawer.tsx`)
- API layer error handling: `src/api/*.ts` functions throw via `unwrap`/`unwrapVoid` (`src/api/unwrap.ts`), never side-effect (no `console.error`, no toast) — display is a UI-edge concern, not the data layer's (ADR 006). A structured `{code, message}` detail throws a typed `ApiDetailError`; shape-aware callers `instanceof`-check it, everyone else catches a plain `Error` (ADR 022)
- Error display: inline at the call site — a failed query renders a banner in place of its content, a failed mutation renders its message next to the triggering control; no ErrorBoundary, no global QueryCache/MutationCache handlers, no toasts (ADR 035)
- `// TODO(defer:<tag>)` marks deliberately-deferred skeleton work, backend included (`app/dependencies.py` carries `dev-auth-bypass`); `grep -rn "TODO(defer:" app/ frontend/src/` before considering a phase/PR done — every deferred item must be tagged, nothing untagged
- Component tests: default Vitest environment is `node`; a test needing a DOM opts in per-file with a `// @vitest-environment jsdom` docblock at the top, not a global config change (ADR 017). Reuse `frontend/src/test/testUtils.tsx` (`renderWithRouter`, `renderWithProviders`) and `frontend/src/test/mocks/clerk.ts` (mocks `@clerk/react`'s `useUser`/`useClerk`) rather than re-mocking per file. RTL doesn't auto-cleanup here (only fires under Vitest's `globals: true`, which this repo doesn't set) — `test/setup.ts`'s `afterEach(() => cleanup())` does it instead; don't remove it
- For files written to `docs/cc/`:
  - Filename: `YYYY-MM-DD-short-slug.md` (e.g. `2026-08-19-practice-card-requeue-spacing.md`)
  - Open with a metadata block: date, what prompted the investigation, and the outcome in one line (`diagnosis only, no code changes` / `bug found and fixed in <commit>` / `deferred, see <plan>`).
  - Cite code as `path/to/file.py:LINE-LINE`. State what the code does now; do not restate what it should do unless a decision was made.
  - Record the decision and its reasoning, not just the trace. A report whose conclusion is "deferred" must say what would need to be true to revisit it.
  - Cross-reference: if the finding contradicts or extends an ADR or a plan phase, name it. If it makes an existing test's assertion look wrong, name the test and line.
  - One file per investigation. Do not append to an earlier report; write a new one and link back.

## Mastery model

- One `review_group_id` is one appearance: a `ReviewGroup` bundling every rated answer field and the prompt fields shown alongside them.
- `MasteryStrategy.expand(group)` decides one `MasteryUpdate` per `(card_id, field_def_id, side)` up front, because the prompt side needs the whole group to know its breadth — it can't be decided one log row at a time.
- Breadth (how many rated answers a prompt was shown for in one appearance) changes the _weight_ of the prompt-side update, never its _target_ — the comment above `EMA_BETA` in `app/mastery/ema.py` has the formula, the `beta` knob, and why. `prompt_review_count` and `answer_review_count` increment by exactly 1 per appearance regardless of breadth
- **Harshest-wins** is the rule for collapsing multiple per-field answer ratings into one signal, applied in two places that must stay consistent: `submit_rating` (`app/services/practice_run.py`) marks a `practice_card` failed if _any_ answer field is rated 1, and `EmaStrategy._aggregate_target` (`app/mastery/ema.py`) makes the prompt-side target the rating-1 score if any answer failed, otherwise the mean of the normalized scores (ADR 012 records why the two must move together).
- A card's display mastery is `strategy.card_score` over all of its deck's active fields, unreviewed fields at the prior (ADR 043) — one definition for every display surface, the breakdown today and the browse/statistics cycles later. Run deltas (ADR 042) read only that run's own `mastery_log` rows plus one bounded latest-row-below-bound lookup per pair, never a history replay; the exact bound rule is the delta-semantics contract in `docs/tasks/010-mastery-log.md`

## Entity vocabulary

All 12 tables under `app/models/`. When suggesting code, use these — not
`deck_schema`, per-card `fields` dicts, or any other pre-rewrite shape.

- `app_user` — the authenticated end user (keyed by `clerk_user_id`); root of every
  per-user ownership chain. `timezone` is the user's IANA zone name (default `UTC`,
  `DEFAULT_TIMEZONE`), synced from the `X-Timezone` header by `get_current_app_user`;
  a missing or unresolvable header leaves the stored value alone (ADR 019).
- `subject` — a user's top-level grouping of decks (e.g. a course or topic); owns
  `deck` rows, unique per `(user_id, name)`, and deleting a subject cascades every
  deck it owns (and, transitively, everything the deck-delete cascade below already
  cascades from there). `icon` is a kebab-case identifier into a
  small curated icon set (`frontend/src/lib/subjectIcon.ts`, ~25 entries from
  `lucide-react`) — not emoji, and not the full icon library. An unrecognized or
  blank value falls back to `BookOpen`. Default is `"book-open"` (`DEFAULT_SUBJECT_ICON`,
  `app/models/subject.py`). `last_activity_at` is the sort key every subject list
  orders by descending; it bubbles from owned decks (a deck created/deleted/moved
  under this subject) as well as the subject's own edits, written only by `touch()`
  (`app/services/activity.py`). There is no `updated_at` (ADR 018).
- `deck` — a named collection of cards under one `subject`; owns `card`, `field_def`,
  and `deck_practice_config` rows, unique per `(subject_id, name)`. Deleting a deck
  cascades all three — and, transitively, `card_field_value`, `mastery_log`,
  and `practice_card` — but never touches `review_log` or `practice_deck`, which
  outlive it (ADR 015). Always has **≥2 active `field_def` rows** (task 003's D3: at
  least one prompt and one answer field, and a field is one or the other), enforced on
  create, on the batch-edit endpoint, and on archiving a field (archiving counts as
  removing). `last_activity_at` is the same sort-key mechanism as `subject`'s — bumps
  on the deck's own edits and on any field/card write under it — and likewise has no
  `updated_at` (ADR 018).
- `field_def` — the sole source of truth for what a field is (name, `FieldType`,
  display `position`); archived via `archived_at`, never hard-deleted by default
  (ADR 009, ADR 010). Every other table references a field only by `field_def.id`.
- `card` — one flashcard belonging to a `deck`; holds no content itself.
- `card_field_value` — a card's actual per-field content: exactly one row per
  `(card_id, field_def_id)` for every field_def **active** on the card's deck — dense,
  never sparse. An unfilled field stores `""`, not a missing row, so "does this card
  have a value for field X" is never ambiguous between empty and never-written. An
  all-blank card is never persisted — `POST /api/cards` rejects it (422) and a
  batch-edit `cards.create` entry with no values is dropped silently — a different
  concern (not persisting a card the user never filled in) from the density
  invariant. Whatever creates or edits a deck's fields is
  responsible for keeping this true over time: adding a field backfills a `""` row for
  every existing card in the same transaction; archiving a field is not a field-set
  change the invariant tracks (below), and deleting a field's row via FK cascade
  handles itself. Archived fields keep their existing `card_field_value` rows forever
  (`field_def.archived_at` never cascades a delete) as inert history, but an archived
  field is excluded from the density invariant going forward and from every read path
  — a card's returned `values` and a deck's returned `field_defs` only ever reflect
  active fields.
- `review_log` — append-only, immutable ledger of every rated field review; the
  single source of truth mastery is rebuildable from (ADR 011). Never deleted, ever —
  its `card_id`, `practice_card_id`, and `field_def_id` foreign keys are all nullable
  with `ON DELETE SET NULL`, so a row survives the deletion of anything it references
  as orphaned history (ADR 015). `rebuild_mastery` excludes rows with a null
  `card_id`/`field_def_id` from its replay — there's no live `(card, field)` left to
  rebuild a `mastery_log` state for.
- `mastery_log` — append-only ledger: one row per `(card, field)` state change carrying
  the full post-blend `FieldMasteryState`; current mastery is the max-`id` row per pair
  (the BIGINT identity is the ordering key — `reviewed_at` is display data, never an
  order key). `practice_run_id` is nullable `ON DELETE SET NULL` attribution for run
  deltas; `card_id`/`field_def_id` are `ON DELETE CASCADE`. A disposable projection of
  `review_log`, regenerated whole by `rebuild_mastery` (ADR 042, ADR 011). Its write
  path takes a per-card `pg_advisory_xact_lock`, since append-only rows have nothing
  for a row lock to serialize.
- `deck_practice_config` — a saved, named template describing which fields are
  prompts/answers and pool-sampling rules; mutable.
- `practice_run` — one user's practice run (`practice_session` before ADR 038; the UI
  says "practice", ADR 021), `active` or `completed` — no third status (`abandoned`
  was dropped, ADR 015 amended). Spans one or more `practice_deck`s. Status is never
  inferred except on the current-card read path: `get_current_practice_card`
  transitions an `active` run to `completed` if no pending `practice_card` remains,
  whether because the user genuinely finished or because cascade-deleted cards
  stranded it — that distinction isn't tracked. The run list surfaces
  `deleted_deck_count` (its `practice_deck` rows whose `deck_id` has gone null) so the
  UI can render "deleted deck" chips, which is the only thing distinguishing the second
  case; nothing new is stored for it. Rerun (ADR 039) creates a new run from a
  completed run's own snapshots and keeps the original; deleting a run is a user
  action and the only way one leaves the list.
- `practice_deck` — an immutable snapshot of a `deck_practice_config`, copied at
  run start; editing or deleting the source config never affects it (ADR 013).
  `deck_id` is nullable with `ON DELETE SET NULL` — the snapshot survives deleting the
  source deck too, since it copies the config's field/pool ids into its own arrays
  rather than referencing the deck live (ADR 015). `source_config_id` is attribution
  only: nullable, `SET NULL` when the config is deleted, nulled by any material edit
  to the config's six arrays, and never read by generation, validation, or rerun
  (ADR 040). It does **not** survive its own run: `practice_run_id` is
  `ON DELETE CASCADE`.
- `practice_card` — one generated card instance within a run
  (`pending`/`passed`/`failed`); a failed card is requeued as a new row, never
  mutated in place. The requeue force-includes every "Again"-rated answer field that
  is still live and non-blank (ADR 036) and is inserted no earlier than
  `RETRY_SPACING_FLOOR` (3) other pending cards, or at the end of the queue when
  fewer remain (ADR 037). `card_id` is `NOT NULL` with `ON DELETE CASCADE` — deleting
  the card deletes it too (ADR 015). `practice_run_id` cascades too: the row is
  run-owned state, not history.

## Context

- Design decisions: see docs/adr/
- Task files (one per cycle, per-task Notes, "Superseded since" corrections): see docs/tasks/
