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
- **ADR 024 — Round-trip return address travels as a URL parameter, not router state**: every `returnTo` is a `?returnTo=` query param, read through the one shared `internalReturnTo` helper (a non-internal value is treated as absent); one-shot arrival results (`{deckId}`, `{configurationId}`) stay in router state, since they're consumed once and never forwarded further.

## Minor decisions

- **MD-1**: this file is the sole governing document for practice setup; the old 004/005 pair claimed the same work with contradictory status and is superseded.
- **MD-2**: this file was authored fresh from the 2026-08-25 /plan conversation as sole truth, and the pre-workflow 004/005 were deleted at decompose time — they were input material, not decompose-authored task files; their content survives in git history under `docs/plans/`.
- **MD-3**: `GET /api/practice_sessions/{id}` returns the summary shape (`PracticeSessionSummary` with `decks` and `deleted_deck_count`) — API-first beats a client-side join of the list endpoint.
- **MD-4**: on New practice, selections survive filter changes; an "N selected" count next to Create keeps hidden selections visible. Rejected: clearing hidden selections (turns browsing into destructive editing).
- **MD-5**: T6 walks the nested "New configuration" → "New deck…" round trip, in both directions (Cancel and Save), so the ADR 024 fix is verified by an automated end-to-end test rather than relying on manual repro. Rejected: leaving T6 scoped to only the two chains it originally covered.
- **MD-6**: `PracticeCreatePage`'s deck→configuration selection does not persist across a round trip through "New configuration"/"New deck…" — it is domain draft state, not the navigation metadata ADR 024 covers, and MD-4 only ever scoped it to survive filter changes within one mounted instance. Considered sessionStorage and hoisting the state into `AppShell`; rejected both as unneeded complexity for what was never promised.

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
- Pool-draw semantics: per card and per side, **one** of the checked counts is drawn uniformly at random, then that many fields are sampled (mastery-weighted) from the Random draw set. `[1, 3]` means some cards show one, others three. The drawn count is clamped to the candidates that survive filtering (archived ids in a stale snapshot are dropped — `min(k, len(candidates))` in `app/services/practice_generation.py`), so a card can show fewer than the drawn number. _(Clamp wording added by sync 2026-08-27; 006 T1 will add blank-valued fields to the same filter, ADR 026.)_

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

- **Round-trip navigation (ADR 024, T4; amends the shipped builder round-trip):**
  - `returnTo` is a URL query param; its value is the `pathname + search` of the page to return to. Built with `URLSearchParams.set` — never string concatenation — so a nested value (a `returnTo` whose value itself contains a `returnTo`) encodes and decodes correctly for free.
  - Readers go through `internalReturnTo(searchParams): string | null` in `frontend/src/lib/returnTo.ts` (new): returns the value only when it starts with `/` and not `//`, else `null` (ADR 024).
  - Senders: PracticeCreatePage "New configuration" → `/deck-configurations/new?subject&deck&returnTo=`; DeckConfigurationEditor "New deck…" and CardStandaloneForm "New deck…" → `/decks/new?returnTo=<own pathname+search>`. No `state` on these navigations.
  - Returns: Save → `navigate(returnTo, {state: {deckId}})` (DeckEditor) / `navigate(returnTo, {state: {configurationId}})` (DeckConfigurationEditor); Cancel → `navigate(returnTo)`, no state. Absent/invalid param → today's fallbacks, unchanged (DeckEditor → `/library`; DeckConfigurationEditor → `/decks/{deckId}?tab=configurations` or `/library`).
  - Router state carries only one-shot results: `{deckId}` (deck-editor save-return, and "start on this deck" into the builder), `{configurationId}` (builder save-return).
  - Per MD-6, `PracticeCreatePage`'s deck→configuration selection is not part of this contract and does not survive a round trip through it.
- **URL params:** overview and New practice share `subject` and `deck`; the overview alone adds `status`. Entry points already emit these (`SubjectDetailPage.tsx:88`, `DeckDetailPage.tsx:123`).

## Tasks

### T1 — Session detail shape and typed start errors

- [x] **Goal:** ship the two API-layer changes (MD-3, ADR 022) the creation and detail pages consume.
- **Files:** `app/routers/api/practice_session.py`, `app/database_ops/practice_session.py`, `tests/api_tests/test_practice_session.py`, `frontend/src/api/unwrap.ts`, `frontend/src/api/practice_session.ts`, `frontend/src/test/unwrap.test.ts` (new or existing), `frontend/src/api/types.ts` (via `npm run gen:api`).
- **Details:** Per MD-3, change `read_practice_session`'s `response_model` to `PracticeSessionSummary` and back it with a single-session variant of the existing two-query read (`db_read_practice_sessions_with_decks`) rather than a per-row loop. Per ADR 022, add `ApiDetailError` to `unwrap.ts` exactly as the contract states and throw it from `unwrap`/`unwrapVoid` when the shape matches; `createPracticeSession` needs no change beyond the regenerated types. No new endpoint, no schema migration.
- **Out of scope:** any UI consuming these (T3/T5); pagination; changing the list endpoint.
- **Done when:** `pytest` passes with new assertions — detail response carries `decks` and `deleted_deck_count` (including a session whose deck was deleted), foreign-user id 404s; `npx vitest run` passes with a test asserting `unwrap` throws `ApiDetailError` exposing `detail.code`/`detail.config_id` for a structured error and plain `Error` otherwise; `npm run gen:api` diff committed; `npm run lint` and `npm run build` clean.
- **Commit:** `feat: session detail carries deck chips, typed api detail errors`
- Notes: none. The single-session read is a private `_summaries_for_sessions` helper shared by both `db_read_practice_sessions_with_decks` (list) and the new `db_read_practice_session_with_decks` (detail) in `app/database_ops/practice_session.py`, rather than a second copy of the two-query logic — same "two queries regardless of row count, never a per-row loop" property, applied to a one-session list.

### T2 — Side-major tap-to-assign board (replaces the shipped drag-table)

- [x] **Goal:** rebuild the assignment board per ADR 020 and ADR 021: side-major layout, whole-chip tap targets, BottomSheet destination picker, no drag code.
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
- Notes: `DeckConfigurationEditor.tsx` needed no edit — the "page-bottom explanation paragraph" ("A pool draws one of its checked counts...") actually lived inside the old `FieldAssignmentBoard.tsx`, not in the editor page itself, and disappeared along with the rest of that file's rewrite. Also updated `frontend/src/lib/deckConfigurationBoard.test.ts` (not listed under Files) to match the reworded `boardValidationError` strings — a mechanical follow-on of the Details-authorized copy change, needed to keep the existing suite green. The sheet's five destination-row labels ("Prompt · always shown" etc., contract line 82) are a second, shorter wording distinct from `SLOT_LABELS`' compound area names ("Prompt side · Always shown", contract lines 74-80) used for region landmarks/headings; both come verbatim from the contract, applied to their respective spots.

### T3 — New practice page (depends on T1; run after T2 so the flow never links into the condemned board)

_Built against the pre-ADR-024 state-based `returnTo` contract; T4 migrates its New-configuration hand-off. Checked status stands — the page met its spec as written._

- [x] **Goal:** build `/practice/new` — filter, pick one configuration per deck, name, create, land on the practice detail page.
- **Files:** `frontend/src/App.tsx` (route), `frontend/src/pages/PracticeCreatePage.tsx` (new), `frontend/src/components/practice/ConfigurationPickList.tsx` (new), `frontend/src/pages/PracticeCreatePage.test.tsx` (new).
- **Details:**
  - Route `/practice/new` reads `?subject=` / `?deck=` (the overview's New practice button and the Create sheet already navigate here carrying them).
  - Reuse `PracticeFilterBar` with the same props/semantics as the overview; the page fetches subjects and decks and passes them down, filter state lives in the URL.
  - Configurations from `readDeckPracticeConfigs({subjectId, deckId})`, grouped by deck; group header is "deck name · subject name". `ConfigurationPickList` takes groups, selection, per-config error text, and `onSelect` as props — it does not fetch. Selection is a radio per deck group (invariant 7), any number of decks; per MD-4, selections survive filter changes and "N selected" renders next to Create.
  - Name input prefilled `formatDateTime(new Date())` — the same call `DeckConfigurationEditor.tsx:139` makes — editable, sent verbatim (invariant 8).
  - "New configuration" button navigates to `/deck-configurations/new` carrying the current `subject`/`deck` params and state `{returnTo: current pathname+search}`; on return, `location.state.configurationId` auto-selects that configuration's radio.
  - Create enabled when ≥1 selected and name non-blank, else disabled with the unmet condition as inline text (same pattern as the builder's Save). On success navigate to `/practice/<id>`.
  - Errors, per the ADR 022 contract: `stale_config` → the message "This configuration no longer produces any prompts — edit it." rendered on the offending row (`detail.config_id`), selection preserved; `config_not_found` → top-of-list message "A selected configuration no longer exists." and refetch the list; `duplicate_deck` (unreachable through the radio UI) and any other error → `error.message` rendered above Create. No toasts.
  - Empty states: no configurations at all → "No deck configurations yet." plus the New configuration button; filters match zero → "No configurations match these filters." plus a Clear filters button that empties both params.
- **Out of scope:** the practice detail page itself (T5); builder changes; a cross-deck configuration management list (each deck's page owns management).
- **Done when:** MSW tests cover — grouping with two same-named decks in different subjects stays disambiguated; radio-per-deck enforced; successful create posts `{name, deck_practice_config_ids}` and navigates to `/practice/<returned id>`; `stale_config` renders on the right row with selection intact; both empty states; the MD-4 count updates when a selected group is filtered out; `npx vitest run`, `npm run lint`, `npm run build` clean.
- **Commit:** `feat: practice creation flow with configuration selection`
- Notes: `groupConfigurationsByDeck` (with its `ConfigurationGroup` type) lives in a new `frontend/src/lib/practiceConfigurationGroups.ts` rather than inside `ConfigurationPickList.tsx` as the Files line implied — colocating a plain function with a component export trips this repo's `react-refresh/only-export-components` lint rule, and `deckConfigurationBoard.ts`/`FieldAssignmentBoard.tsx` already establish the "pure state-shaping logic in `lib/`, rendering in the component" split. A few things the Details didn't specify were filled in by extending established page conventions rather than inventing new ones: a sticky-header Cancel button (navigates to `/practice`, keeping the current filters) matching every other creation-flow page (`SubjectForm`, `DeckEditor`, `CardStandaloneForm`, `DeckConfigurationEditor`); the "N selected" count sits in that same header next to Create (literally "next to Create" per Details); the true-empty state repeats the "New configuration" button that's already always visible above the list, mirroring `DeckDetailPage`'s configurations tab (ADR 023 rule 2); and a "Could not load deck configurations." banner mirrors the load-error pattern every sibling list page already has. None of these are covered by an explicit Done-when bullet but each has a test.

### T4 — returnTo rides the URL (depends on T3; independent of T5; run before T6)

- [x] **Goal:** move every `returnTo` from router state to the `?returnTo=` URL param per ADR 024, so return context survives nested round trips and the New practice → New configuration → New deck chain returns correctly on both Cancel and Save.
- **Files:** `frontend/src/lib/returnTo.ts` (new), `frontend/src/lib/returnTo.test.ts` (new), `frontend/src/pages/PracticeCreatePage.tsx`, `frontend/src/components/library/DeckConfigurationEditor.tsx`, `frontend/src/components/library/CardStandaloneForm.tsx`, `frontend/src/components/library/DeckEditor.tsx`, plus those four components' existing test files.
- **Details:**
  - Implement the Round-trip navigation contract exactly; all four sites in one task so no state-based sender survives.
  - PracticeCreatePage `newConfiguration`: add `returnTo` to the params it already builds; drop the `state` argument.
  - DeckConfigurationEditor: read via `internalReturnTo` instead of `location.state.returnTo` (state keeps only `deckId`); "New deck…" → `/decks/new` with `?returnTo=${location.pathname}${location.search}`, no state.
  - CardStandaloneForm "New deck…": same, value `${location.pathname}${location.search}` (today it passes bare `pathname` in state).
  - DeckEditor: create mode reads via `internalReturnTo`; save/cancel targets otherwise unchanged.
  - `returnTo.test.ts`: `/x` accepted; `https://evil.com`, `//evil.com`, `x`, empty → `null`.
  - Component tests: replace `state: {returnTo}` entries with URL-param entries. Assert the nested chain: builder entered with `?returnTo=<encoded /practice/new?subject=s1>` → "New deck…" → the `/decks/new` location's `returnTo` param, **decoded via URLSearchParams**, equals the builder's full `pathname+search` including its own `returnTo`; deck-editor Cancel lands on that full builder URL; Save lands there with `{deckId}` state. Compare decoded values, never encoded string literals.
- **Out of scope:** T6's end-to-end chain tests; any change to `{deckId}`/`{configurationId}` result state; the Cancel-confirm dialogs; T5's pages; persisting `PracticeCreatePage`'s selection (MD-6 — explicitly not built).
- **Done when:** `grep -rn "returnTo" frontend/src | grep -v "\.test\." | grep "state"` returns nothing; `npx vitest run` passes with the new helper and nested-chain tests; the manual repro — Practice → New practice → New configuration → New deck, Cancel, Cancel — lands on `/practice/new` with filters intact in the browser (outcome in Notes); `npm run lint` and `npm run build` clean.
- **Commit:** `fix: return context rides the URL so nested round trips survive`
- Notes: Two deviations from the literal Done-when text, both mechanical, not scope changes. (1) The literal `grep -rn "returnTo" frontend/src | grep -v "\.test\." | grep "state"` is not empty — it also matches inline comments explaining the ADR 024 rule ("returnTo rides the URL, not state") and the one legitimate line where they co-occur, `DeckEditor.tsx`'s `navigate(returnTo, { state: { deckId: created.id } })`, where `returnTo` is the navigate target and the state object only ever holds `deckId`. A precise check (`grep -rn "state:.*returnTo\|returnTo.*: *{"`) confirms zero cases of a `returnTo` value actually stored inside a state object. (2) The manual in-browser walk could not be performed: this environment has no Clerk dev-auth bypass on the frontend (backend-only, via `DEV_AUTH_USER_ID`), a gap already documented in `docs/cc/2026-08-19-frontend-rewrite-survey.md` before this task existed, not something new. In its place: the nested-round-trip component tests added to `DeckConfigurationEditor.test.tsx` and `DeckEditor.test.tsx` exercise the equivalent interaction chain end-to-end at the component level (builder entered with an inbound `returnTo` → opens "New deck…" → the deck editor's own `returnTo`, decoded, equals the builder's exact prior location; Cancel and Save both land there correctly). Recommend the user walk the real browser repro once by hand — Practice → New practice → New configuration → New deck, Cancel, Cancel — before treating this as verified end-to-end in a real session.

### T5 — Practice detail page (depends on T1)

- [x] **Goal:** replace the detail stub with the real page: header facts, status-dependent body, delete.
- **Files:** `frontend/src/pages/PracticeDetailsPage.tsx` (fill in), `frontend/src/pages/PracticeRunPage.tsx` (new stub), `frontend/src/components/practice/SessionDeckChips.tsx` (new, extracted), `frontend/src/components/practice/PracticeSessionRow.tsx` (use the extraction), `frontend/src/App.tsx` (run route), `frontend/src/pages/PracticeDetailsPage.test.tsx` (new).
- **Details:**
  - Fetch `readPracticeSession` (T1's summary shape). Render name, status badge, created date via `formatDateTime`, and the deck·subject chips with the "N / M decks deleted" treatment — extract that chip block from `PracticeSessionRow` into `SessionDeckChips` (props: `decks`, `deletedDeckCount`; no fetching) and use it in both places; if the status badge is currently inline in the row, extract it the same way, otherwise reuse the existing component.
  - Active → a "Start practice" button, pure navigation (invariant 2) to `/practice/:practiceSessionId/run`; add that route rendering `PracticeRunPage`, a stub marked `// TODO(defer:practice-run)` with heading "Practice run" and body "Coming soon."
  - Completed → no Start button; body text "A summary of this practice is coming later."
  - Delete button opens the same `ConfirmDialog` copy the overview uses; on success navigate to `/practice`. Render the mutation's `error.message` inline in the dialog on failure, dialog stays open.
  - Query error (404 / foreign id) → "Practice session not found." — the `SubjectDetailPage.tsx:39-45` pattern.
- **Out of scope:** stats, restart, rename, anything on the run surface beyond the stub.
- **Done when:** tests cover — active session shows Start and it navigates to the run stub; completed session hides Start and shows the summary line; deleted-deck count renders; delete confirm calls the API and navigates to `/practice`; not-found state renders; `grep -r "TODO(defer:" frontend/src/` shows the run stub tagged; `npx vitest run`, `npm run lint`, `npm run build` clean.
- **Commit:** `feat: practice detail page and run stub`
- Notes: The status badge was indeed inline in `PracticeSessionRow`, so per Details it got the same extraction treatment as the deck chips — a new `frontend/src/components/practice/PracticeStatusBadge.tsx` (not listed under Files, but directly instructed by "extract it the same way"). `SessionDeckChips` renders its chips with no wrapping element (a Fragment), not its own flex container, so each caller can drop them into whatever row it's already building (the overview row also places a created-date chip alongside them; the detail page doesn't need to). "Error inline in the dialog, dialog stays open" needed a capability `ConfirmDialog` didn't have — a `children` slot rendered between the description and the button row, added as a purely additive optional prop so every existing caller (five of them) is unaffected. `PracticeDetailsPage` is split into an outer component (just the `useParams`/`useQuery` gate) and a `PracticeDetailsPageBody` that owns the mutation and dialog state, the same split `DeckConfigurationEditor` uses — the delete mutation can't be called conditionally after the not-found/loading early returns without breaking the Rules of Hooks. Also removed `PracticeDetailsPage` from `placeholderPages.test.tsx`'s stub-smoke-test list, since it's no longer a placeholder and crashed there once real data-fetching needed a `QueryClientProvider` that bare test didn't supply; its real behavior is now covered by the new dedicated test file.

### T6 — Pre-filter chain, end to end (depends on T3 and T4)

- [x] **Goal:** prove the two context chains work as wholes, not per page.
- **Files:** `frontend/src/pages/practicePrefilterChain.test.tsx` (new); wiring fixes only where a chain test finds a step dropping context.
- **Details:** MSW-backed tests walking each chain by simulated clicks: subject page → `/practice?subject=S` → New practice (subject filter applied) → New configuration (that subject's decks sorted first in the picker); deck page → `/practice?subject=S&deck=D` → New practice (both filters) → New configuration (deck pre-selected). Per MD-5, a third walk: from New practice, "New configuration" → "New deck…"; **Cancel** in the deck editor → back on New configuration with its `subject`/`deck` params and `returnTo` intact; Cancel again → back on `/practice/new` with the original filters. And the save direction: create the deck → back on New configuration with the new deck preselected → save the configuration → back on `/practice/new` with that configuration auto-selected — but per MD-6, any _other_ deck's selection made before leaving `/practice/new` is expected to be gone, not preserved; the chain test asserts that explicitly (select two decks, leave via New configuration → New deck, return, assert only the auto-selected one is checked). Then walk all three chains in the running app against the dev backend. A fix belongs here only if it is a context-passing bug surfaced by these tests; anything larger is reported in Notes, not built.
- **Out of scope:** new features, new params, home-page launchers; persisting `PracticeCreatePage`'s selection (MD-6).
- **Done when:** all three chain tests pass, including the two nested-round-trip directions; the browser walk is done and its outcome written into Notes; `npx vitest run`, `npm run lint`, `npm run build` clean.
- **Commit:** `test: practice pre-filter chain end to end`
- Notes: One context-passing bug surfaced and fixed, exactly the class this task authorizes: `PracticeCreatePage`'s auto-select one-shot for `location.state.configurationId` consumed itself against the _stale cached_ config list on remount (the invalidated refetch still in flight), so a configuration created through the round trip was never auto-selected — the fix consumes the one-shot only when the returned id is actually found in the list (`PracticeCreatePage.tsx`). T3's own test missed it because its builder stub returned an id already present in the list. The browser walk WAS performed this time, resolving T4's open recommendation: the backend `DEV_AUTH_USER_ID` bypass authenticates token-less requests, so headless Chromium (playwright-core, scratchpad-installed, against the machine's ms-playwright browser) drove the real signed-out app at localhost:5173 — all three chains passed, both nested directions included, zero console errors; T4's recommended manual repro (New practice → New configuration → New deck, Cancel, Cancel) is covered by the cancel-direction walk. The walk created "T6 Walk Deck" and "T6 Walk Config" in the dev database and left them in place (AGENTS.md: never bulk-delete dev data after a browser check).

## Deferred — do not build

- The run surface (prompt rendering, rating, requeue display) — next task, branch `rewrite/practice-run`, which also decides what a completed practice's summary shows.
- Home page practice launchers.
- **Restart** ("run again" on the detail page). Design settled, build deferred to the run task: create a new session from the old session's own `practice_deck` snapshot rows — never from the saved `deck_practice_config` — then delete the old session; one transaction, creation first, so a failed restart leaves the old session intact; snapshots with `deck_id` null are unrestartable; the new run regenerates against current mastery, so ordering and combinations will differ — intended.
- Any "stale" badge on configuration lists; session start handles staleness and the builder silently drops dead ids.
- Session rename from the UI.
- Removing the deck-create contract's `cards` array (the client now always sends it empty) — API cleanup plus `npm run gen:api`, carried from old 005.
- Pointer-based drag (dnd-kit) as a wide-viewport enhancement layered on the same board state — only ever in addition to tap-to-assign, never replacing it (ADR 020).
