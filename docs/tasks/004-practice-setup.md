# 004 — Practice setup: board rebuild, creation flow, details

Covers the remaining work up to and including creating a practice: the rebuilt deck configuration board, the New practice page, the practice detail page, and the pre-filter chain. Running a session stays out of scope (next task, branch `rewrite/practice-run`).

Branch: `rewrite/practice-setup`. Execute one task per /build session; stop and report against "Done when" before the next. This file supersedes the pre-workflow task files 004-frontend-rebuild-practice-setup.md and 005-004-phase-2-fix.md (deleted; per MD-2 the /plan conversation of 2026-08-25 took priority over both; their content survives in git history under `docs/plans/`).

Already shipped on this branch (history, not tasks): backend endpoints + `name` column (`f304e7a`, verified in `docs/cc/2026-08-24-practice-setup-phase-0-backend.md`), practice overview with filters/tabs/entry points (`6fe4ec0`), the drag-table builder now condemned by ADR 020 (`4c32349`, renamed `b24b4aa`), deck/subject action scoping (`f4afa9a`, `6a288a0`).

## ADRs

Decisions this file implements; full context and rejected alternatives live in the ADRs.

- **ADR 020 — Tap-to-assign side-major board for the deck configuration builder**: `BottomSheet` destination picker at every viewport; Prompt side / Answer side cards, each with Always shown and Random draw areas, frequency checkboxes inside the Random draw area they govern, "Not used" on top; all HTML5 drag removed — drag may only ever return as an enhancement on the same `BoardState`.
- **ADR 021 — User-facing vocabulary is a contract and never exposes schema terms**: the canonical word set lives in this file's Contracts; "pool" and slot names never reach the UI.
- **ADR 022 — unwrap throws a typed ApiDetailError for structured error details**: shape-aware callers `instanceof`-check and read `.detail`; every other caller still catches a plain `Error` with an unchanged message.
- **ADR 023 — Entity actions in the header, collection actions in the collection, no card entry in deck forms** (the already-shipped rule from old 005's Fixes 1/1b, `f4afa9a`/`6a288a0`): placement rules binding for every surface.

## Minor decisions

- **MD-1**: this file is the sole governing document for practice setup; the old 004/005 pair claimed the same work with contradictory status and is superseded.
- **MD-2**: this file was authored fresh from the 2026-08-25 /plan conversation as sole truth, and the pre-workflow 004/005 were deleted at decompose time — they were input material, not decompose-authored task files; their content survives in git history under `docs/plans/`.
- **MD-3**: `GET /api/practice_sessions/{id}` returns the summary shape (`PracticeSessionSummary` with `decks` and `deleted_deck_count`) — API-first beats a client-side join of the list endpoint.
- **MD-4**: on New practice, selections survive filter changes; an "N selected" count next to Create keeps hidden selections visible. Rejected: clearing hidden selections (turns browsing into destructive editing).

## Contracts

### Canonical vocabulary

One word per concept. Middle column is what a user reads; right column is what code and schema call it. Never write "practice config"; never show "pool" or a slot name.

| Concept | Written as | Entity / field |
| --- | --- | --- |
| one run of practice | **practice** | `practice_session` |
| a deck's prompt/answer layout | **deck configuration** (**configuration** in deck context) | `deck_practice_config` |
| the copy a practice takes at start | never shown | `practice_deck` |
| the list of practices | **Practice** | — |
| where a practice is created | **New practice** | — |
| where a configuration is authored | **New configuration** / **Edit configuration** | — |
| one practice's own page | practice detail | — |
| the two halves of a card | **Prompt side** / **Answer side** | prompt/answer assignment |
| fields on every card | **Always shown** | `prompt_field_ids` / `answer_field_ids` |
| fields drawn at random per card | **Random draw** | `prompt_pool_ids` / `answer_pool_ids` |
| the allowed draw sizes | **"Each card shows [1] [2] … of these"** | `*_pool_counts` |
| a field left out | **Not used** | unassigned |

### Carried invariants (from the schema rewrite; still binding)

1. `practice_deck` has no configuration lineage — no `source_config_id`, ever. Session ↔ subject/deck relevance resolves only through `practice_deck.deck_id → deck → subject`.
2. Create = start: the Create button runs the full session-start path; no draft state, no cardless session.
3. Editing or deleting a `deck_practice_config` never touches any practice; the UI never implies otherwise.
4. Fields travel as `field_def.id` uuids; names are display strings.
5. Archived fields never appear in the builder.
6. The four field arrays are pairwise disjoint **by construction** — assignment moves, never copies.
7. One configuration per deck per practice (`UNIQUE (practice_session_id, deck_id)`; radio-per-deck in UI; server error still rendered if it slips through).
8. Session names are computed client-side; the server stores the string verbatim and has no timezone logic.
9. Ownership stays query-scoped; foreign resources 404.

### Backend API (verified in code; see the Phase 0 report for provenance)

- `POST /api/practice_sessions` `{name, deck_practice_config_ids}` → 201 `PracticeSessionRead`. Errors carry `detail: {code, message, config_id}`: `config_not_found` (404), `duplicate_deck` (400, `config_id` is the second config), `stale_config` (400, config no longer validates — e.g. a referenced field was archived).
- `GET /api/practice_sessions?subject_id&deck_id` → `PracticeSessionSummary[]`, newest first: `id, name, status, created_at, decks: [{deck_id, deck_name, subject_id, subject_name}], deleted_deck_count`. Filters AND-compose via EXISTS over `practice_deck`.
- `GET /api/practice_sessions/{id}` → today `PracticeSessionRead`; **T1 changes it to `PracticeSessionSummary` (MD-3)**. 404 for foreign/missing.
- `DELETE /api/practice_sessions/{id}` → 204. `review_log` survives (its `practice_card_id` goes SET NULL).
- `GET /api/deck_practice_configs?subject_id&deck_id` → `DeckPracticeConfigSummary[]` (config + `deck_name, subject_id, subject_name`), ordered subject → deck → name.
- `GET /api/decks/{deck_id}` → includes live-only `field_defs` `{id, name, type, position}`, position-ordered.
- `SessionStatus` is two values: `active`, `completed`.
- Pool-draw semantics: per card and per side, **one** of the checked counts is drawn uniformly at random, then that many fields are sampled (mastery-weighted) from the Random draw set. `[1, 3]` means some cards show one, others three.

### Frontend contracts

- **`ApiDetailError` (ADR 022, created by T1)** in `frontend/src/api/unwrap.ts`: `class ApiDetailError extends Error { detail: { code: string; message: string; config_id?: string } }`. Thrown by `unwrap`/`unwrapVoid` when `detail` is an object with string `code` and `message`; `Error.message` stays what `formatError` produces today. No side effects in the api layer (ADR 006 rule unchanged).
- **Board slot ↔ UI mapping (ADR 020 / ADR 021)** — `BoardState` in `frontend/src/lib/deckConfigurationBoard.ts` is unchanged structurally:

  | Slot            | Renders in                               |
  | --------------- | ---------------------------------------- |
  | `unassigned`    | **Not used** area, top of board          |
  | `prompt_fields` | Prompt side · Always shown               |
  | `prompt_pool`   | Prompt side · Random draw (+ counts row) |
  | `answer_fields` | Answer side · Always shown               |
  | `answer_pool`   | Answer side · Random draw (+ counts row) |

  Sheet rows, in this order, current location omitted (four rows shown): _Prompt · always shown_, _Prompt · random draw_, _Answer · always shown_, _Answer · random draw_, _Not used_.

- **Builder round-trip (already built; T3 consumes it):** the builder reads `?subject=` / `?deck=` plus router state `{returnTo, deckId}`; on save it navigates to `returnTo` with state `{configurationId}` (`DeckConfigurationEditor.tsx:95-103, 187`).
- **URL params:** overview and New practice share `subject` and `deck`; the overview alone adds `status`. Entry points already emit these (`SubjectDetailPage.tsx:88`, `DeckDetailPage.tsx:118`).

## Tasks

### T1 — Session detail shape and typed start errors

- [ ] **Goal:** ship the two API-layer changes (MD-3, ADR 022) the creation and detail pages consume.
- **Files:** `app/routers/api/practice_session.py`, `app/database_ops/practice_session.py`, `tests/api_tests/test_practice_session.py`, `frontend/src/api/unwrap.ts`, `frontend/src/api/practice_session.ts`, `frontend/src/test/unwrap.test.ts` (new or existing), `frontend/src/api/types.ts` (via `npm run gen:api`).
- **Details:** Per MD-3, change `read_practice_session`'s `response_model` to `PracticeSessionSummary` and back it with a single-session variant of the existing two-query read (`db_read_practice_sessions_with_decks`) rather than a per-row loop. Per ADR 022, add `ApiDetailError` to `unwrap.ts` exactly as the contract states and throw it from `unwrap`/`unwrapVoid` when the shape matches; `createPracticeSession` needs no change beyond the regenerated types. No new endpoint, no schema migration.
- **Out of scope:** any UI consuming these (T3/T4); pagination; changing the list endpoint.
- **Done when:** `pytest` passes with new assertions — detail response carries `decks` and `deleted_deck_count` (including a session whose deck was deleted), foreign-user id 404s; `npx vitest run` passes with a test asserting `unwrap` throws `ApiDetailError` exposing `detail.code`/`detail.config_id` for a structured error and plain `Error` otherwise; `npm run gen:api` diff committed; `npm run lint` and `npm run build` clean.
- **Commit:** `feat: session detail carries deck chips, typed api detail errors`
- Notes:

### T2 — Side-major tap-to-assign board (replaces the shipped drag-table)

- [ ] **Goal:** rebuild the assignment board per ADR 020 and ADR 021: side-major layout, whole-chip tap targets, BottomSheet destination picker, no drag code.
- **Files:** `frontend/src/components/library/FieldAssignmentBoard.tsx` (rewrite), `frontend/src/lib/deckConfigurationBoard.ts` (labels and validation strings only), `frontend/src/components/library/DeckConfigurationEditor.tsx` (drop the page-bottom explanation paragraph), `frontend/src/components/library/DeckConfigurationEditor.test.tsx`.
- **Details:**
  - Layout per the contract's slot ↔ UI mapping table (ADR 020), one layout at every viewport: Not used, then the Prompt side card (Always shown area, Random draw area), then the Answer side card.
  - Each chip is a single `<button>` whose accessible name is the field name, with `aria-haspopup="dialog"`. Tapping sets it as the sheet trigger (one shared ref, assigned on tap, passed as `BottomSheet`'s `triggerRef` so focus returns to the chip on close) and opens the sheet titled `Move "<field name>" to…` with the four destination rows per the contract. Choosing calls the existing `onMove` and closes; scrim-tap/Esc dismisses (no Cancel row).
  - Frequency: inside each Random draw area, below its chips, only when the area has ≥1 field: the text "Each card shows", checkboxes labeled 1…n, the text "of these". Wire to the existing `toggleCount`; pruning stays in `moveField`, untouched.
  - Empty-area copy, exactly: Not used empty → "Every field is assigned."; an empty Always shown or Random draw area → "None yet."
  - Update `SLOT_LABELS` to the ADR 021 words and reword `boardValidationError`'s four strings to: "Check how many random prompt fields each card shows." / "Check how many random answer fields each card shows." / "The prompt side needs at least one field — always shown or random draw." / "The answer side needs at least one field — always shown or random draw."
  - Delete all HTML5 DnD code (`draggable`, `onDragStart`, `dropProps`, drag-over state) and the per-chip `<select>`; delete their tests and replace the simulated dragstart→drop test with tap-path tests.
- **Out of scope:** dnd-kit or any drag enhancement; changes to `BoardState`, `moveField`, `boardToPayload`, `boardFromConfig`; deck picker, name input, save flow.
- **Done when:** `grep -rn "draggable\|onDragStart\|onDrop" frontend/src/components/library/` returns nothing; `npx vitest run` passes with tests covering: tap chip → sheet → choose destination → chip renders in the target area; counts pruned when the last checked count exceeds the shrunk n; frequency row absent when a Random draw area is empty; existing payload-mapping tests still green; every assignment reachable by click/tap alone; `npm run lint` and `npm run build` clean.
- **Commit:** `refactor: side-major tap-to-assign board, html5 drag removed`
- Notes:

### T3 — New practice page (depends on T1; run after T2 so the flow never links into the condemned board)

- [ ] **Goal:** build `/practice/new` — filter, pick one configuration per deck, name, create, land on the practice detail page.
- **Files:** `frontend/src/App.tsx` (route), `frontend/src/pages/PracticeCreatePage.tsx` (new), `frontend/src/components/practice/ConfigurationPickList.tsx` (new), `frontend/src/pages/PracticeCreatePage.test.tsx` (new).
- **Details:**
  - Route `/practice/new` reads `?subject=` / `?deck=` (the overview's New practice button and the Create sheet already navigate here carrying them).
  - Reuse `PracticeFilterBar` with the same props/semantics as the overview; the page fetches subjects and decks and passes them down, filter state lives in the URL.
  - Configurations from `readDeckPracticeConfigs({subjectId, deckId})`, grouped by deck; group header is "deck name · subject name". `ConfigurationPickList` takes groups, selection, per-config error text, and `onSelect` as props — it does not fetch. Selection is a radio per deck group (invariant 7), any number of decks; per MD-4, selections survive filter changes and "N selected" renders next to Create.
  - Name input prefilled `formatDateTime(new Date())` — the same call `DeckConfigurationEditor.tsx:137` makes — editable, sent verbatim (invariant 8).
  - "New configuration" button navigates to `/deck-configurations/new` carrying the current `subject`/`deck` params and state `{returnTo: current pathname+search}`; on return, `location.state.configurationId` auto-selects that configuration's radio.
  - Create enabled when ≥1 selected and name non-blank, else disabled with the unmet condition as inline text (same pattern as the builder's Save). On success navigate to `/practice/<id>`.
  - Errors, per the ADR 022 contract: `stale_config` → the message "This configuration no longer produces any prompts — edit it." rendered on the offending row (`detail.config_id`), selection preserved; `config_not_found` → top-of-list message "A selected configuration no longer exists." and refetch the list; `duplicate_deck` (unreachable through the radio UI) and any other error → `error.message` rendered above Create. No toasts.
  - Empty states: no configurations at all → "No deck configurations yet." plus the New configuration button; filters match zero → "No configurations match these filters." plus a Clear filters button that empties both params.
- **Out of scope:** the practice detail page itself (T4); builder changes; a cross-deck configuration management list (each deck's page owns management).
- **Done when:** MSW tests cover — grouping with two same-named decks in different subjects stays disambiguated; radio-per-deck enforced; successful create posts `{name, deck_practice_config_ids}` and navigates to `/practice/<returned id>`; `stale_config` renders on the right row with selection intact; both empty states; the MD-4 count updates when a selected group is filtered out; `npx vitest run`, `npm run lint`, `npm run build` clean.
- **Commit:** `feat: practice creation flow with configuration selection`
- Notes:

### T4 — Practice detail page (depends on T1)

- [ ] **Goal:** replace the detail stub with the real page: header facts, status-dependent body, delete.
- **Files:** `frontend/src/pages/PracticeDetailsPage.tsx` (fill in), `frontend/src/pages/PracticeRunPage.tsx` (new stub), `frontend/src/components/practice/SessionDeckChips.tsx` (new, extracted), `frontend/src/components/practice/PracticeSessionRow.tsx` (use the extraction), `frontend/src/App.tsx` (run route), `frontend/src/pages/PracticeDetailsPage.test.tsx` (new).
- **Details:**
  - Fetch `readPracticeSession` (T1's summary shape). Render name, status badge, created date via `formatDateTime`, and the deck·subject chips with the "N / M decks deleted" treatment — extract that chip block from `PracticeSessionRow` into `SessionDeckChips` (props: `decks`, `deletedDeckCount`; no fetching) and use it in both places; if the status badge is currently inline in the row, extract it the same way, otherwise reuse the existing component.
  - Active → a "Start practice" button, pure navigation (invariant 2) to `/practice/:practiceSessionId/run`; add that route rendering `PracticeRunPage`, a stub marked `// TODO(defer:practice-run)` with heading "Practice run" and body "Coming soon."
  - Completed → no Start button; body text "A summary of this practice is coming later."
  - Delete button opens the same `ConfirmDialog` copy the overview uses; on success navigate to `/practice`. Render the mutation's `error.message` inline in the dialog on failure, dialog stays open.
  - Query error (404 / foreign id) → "Practice session not found." — the `SubjectDetailPage.tsx:39-42` pattern.
- **Out of scope:** stats, restart, rename, anything on the run surface beyond the stub.
- **Done when:** tests cover — active session shows Start and it navigates to the run stub; completed session hides Start and shows the summary line; deleted-deck count renders; delete confirm calls the API and navigates to `/practice`; not-found state renders; `grep -r "TODO(defer:" frontend/src/` shows the run stub tagged; `npx vitest run`, `npm run lint`, `npm run build` clean.
- **Commit:** `feat: practice detail page and run stub`
- Notes:

### T5 — Pre-filter chain, end to end (depends on T3)

- [ ] **Goal:** prove the two context chains work as wholes, not per page.
- **Files:** `frontend/src/pages/practicePrefilterChain.test.tsx` (new); wiring fixes only where a chain test finds a step dropping context.
- **Details:** MSW-backed tests walking each chain by simulated clicks: subject page → `/practice?subject=S` → New practice (subject filter applied) → New configuration (that subject's decks sorted first in the picker); deck page → `/practice?subject=S&deck=D` → New practice (both filters) → New configuration (deck pre-selected). Then walk both chains in the running app against the dev backend. A fix belongs here only if it is a context-passing bug surfaced by these tests; anything larger is reported in Notes, not built.
- **Out of scope:** new features, new params, home-page launchers.
- **Done when:** both chain tests pass; the browser walk is done and its outcome written into Notes; `npx vitest run`, `npm run lint`, `npm run build` clean.
- **Commit:** `test: practice pre-filter chain end to end`
- Notes:

## Deferred — do not build

- The run surface (prompt rendering, rating, requeue display) — next task, branch `rewrite/practice-run`, which also decides what a completed practice's summary shows.
- Home page practice launchers.
- **Restart** ("run again" on the detail page). Design settled, build deferred to the run task: create a new session from the old session's own `practice_deck` snapshot rows — never from the saved `deck_practice_config` — then delete the old session; one transaction, creation first, so a failed restart leaves the old session intact; snapshots with `deck_id` null are unrestartable; the new run regenerates against current mastery, so ordering and combinations will differ — intended.
- Any "stale" badge on configuration lists; session start handles staleness and the builder silently drops dead ids.
- Session rename from the UI.
- Removing the deck-create contract's `cards` array (the client now always sends it empty) — API cleanup plus `npm run gen:api`, carried from old 005.
- Pointer-based drag (dnd-kit) as a wide-viewport enhancement layered on the same board state — only ever in addition to tap-to-assign, never replacing it (ADR 020).
