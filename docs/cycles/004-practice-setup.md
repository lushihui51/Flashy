# 004 — Practice setup: board rebuild, creation flow, details

## Goal

Outcome: The remaining work up to and including creating a practice is built: the rebuilt deck configuration board, the New practice page, the practice detail page, and the pre-filter chain.

Scope: The rebuilt deck configuration board, the New practice page, the practice detail page, and the pre-filter chain. Not covered: running a session, that is the run surface's prompt rendering, rating and requeue display, which belongs to a later cycle; home page practice launchers; Restart ("run again" on the detail page), deferred to a later cycle; any "stale" badge on configuration lists; session rename from the UI; removing the deck-create contract's `cards` array; and pointer-based drag (dnd-kit) as a wide-viewport enhancement layered on the same board state, only ever in addition to tap-to-assign, never replacing it.

Judgement: None.

## Records

- ADR 022: A typed ApiDetailError for structured error details
- ADR 024: A URL parameter for the round-trip return address

## Tasks

### T1 — Session detail shape and typed start errors

**Status**

- [x]

**Goal**

The two API-layer changes the creation and detail pages consume are shipped.

**Dependencies**

None.

**Files**

- `app/routers/api/practice_session.py`
- `app/database_ops/practice_session.py`
- `tests/api_tests/test_practice_session.py`
- `frontend/src/api/unwrap.ts`
- `frontend/src/api/practice_session.ts`
- `frontend/src/test/unwrap.test.ts` (new or existing)
- `frontend/src/api/types.ts` (via `npm run gen:api`)

**Details**

`GET /api/practice_sessions/{id}` must return the summary shape, `PracticeSessionSummary` with `decks` and `deleted_deck_count`.

Change `read_practice_session`'s `response_model` to `PracticeSessionSummary` and back it with a single-session variant of the existing two-query read (`db_read_practice_sessions_with_decks`) rather than a per-row loop.

Per ADR 022, add `ApiDetailError` to `unwrap.ts` and throw it from `unwrap`/`unwrapVoid` when `detail` is an object with string `code` and `message`; `Error.message` stays what `formatError` produces today. No side effects in the api layer (ADR 006). `createPracticeSession` needs no change beyond the regenerated types.

```ts
// frontend/src/api/unwrap.ts
class ApiDetailError extends Error {
  detail: { code: string; message: string; config_id?: string };
}
```

Add no new endpoint and no schema migration.

These invariants are binding:

1. `practice_deck` has no configuration lineage: no `source_config_id`, ever. Session ↔ subject/deck relevance resolves only through `practice_deck.deck_id → deck → subject`.
2. Create = start: the Create button runs the full session-start path; no draft state, no cardless session.
3. Editing or deleting a `deck_practice_config` never touches any practice; the UI never implies otherwise.
4. Fields travel as `field_def.id` uuids; names are display strings.
5. Archived fields never appear in the builder.
6. The four field arrays are pairwise disjoint by construction: assignment moves, never copies.
7. One configuration per deck per practice (`UNIQUE (practice_session_id, deck_id)`; radio-per-deck in UI; server error still rendered if it slips through).
8. Session names are computed client-side; the server stores the string verbatim and has no timezone logic.
9. Ownership stays query-scoped; foreign resources 404.

**Out of scope**

- Any UI consuming these: T3 and T5.
- Pagination.
- Changing the list endpoint.

**Done when**

- `pytest` passes with new assertions: the detail response carries `decks` and `deleted_deck_count`, including a session whose deck was deleted, and a foreign user's id 404s.
- `npx vitest run` passes with a test asserting `unwrap` throws `ApiDetailError` exposing `detail.code`/`detail.config_id` for a structured error and plain `Error` otherwise.

**Debrief**

The single-session read is a private `_summaries_for_sessions` helper shared by both `db_read_practice_sessions_with_decks` (list) and the new `db_read_practice_session_with_decks` (detail) in `app/database_ops/practice_session.py`, rather than a second copy of the two-query logic: same "two queries regardless of row count, never a per-row loop" property, applied to a one-session list.

### T2 — Side-major tap-to-assign board (replaces the shipped drag-table)

**Status**

- [x]

**Goal**

The assignment board is rebuilt: side-major layout, whole-chip tap targets, BottomSheet destination picker, no drag code.

**Dependencies**

None.

**Files**

- `frontend/src/components/library/FieldAssignmentBoard.tsx` (rewrite)
- `frontend/src/lib/deckConfigurationBoard.ts` (labels and validation strings only)
- `frontend/src/components/library/DeckConfigurationEditor.tsx` (drop the page-bottom explanation paragraph)
- `frontend/src/components/library/DeckConfigurationEditor.test.tsx`

**Details**

One word per concept. The middle column is what a user reads; the right column is what code and schema call it. Never write "practice config"; never show "pool" or a slot name. Never "in progress" or "ended" for a practice's state.

| Concept | Written as | Entity / field |
| --- | --- | --- |
| one run of practice | **practice** | `practice_session` |
| a deck's prompt/answer layout | **deck configuration** (**configuration** in deck context) | `deck_practice_config` |
| the copy a practice takes at start | never shown | `practice_deck` |
| the list of practices | **Practice** | — |
| where a practice is created | **New practice** | — |
| where a configuration is authored | **New configuration** / **Edit configuration** | — |
| one practice's own page | practice detail | — |
| a practice that can still be continued | **active** (badge and tab: **Active**) | `practice_run.status = 'active'` |
| a practice that has finished | **completed** (badge and tab: **Completed**) | `practice_run.status = 'completed'` |
| a card whose last attempt was rated Again on a field | **failed** (badge: **Failed**) | a `practice_card` chain whose last row is `failed`; breakdown bucket `still_failed` |
| the two halves of a card | **Prompt side** / **Answer side** | prompt/answer assignment |
| fields on every card | **Always shown** | `prompt_field_ids` / `answer_field_ids` |
| fields drawn at random per card | **Random draw** | `prompt_pool_ids` / `answer_pool_ids` |
| the allowed draw sizes | **"Each card shows [1] [2] … of these"** | `*_pool_counts` |
| a field left out | **Not used** | unassigned |
| a field deleted after a practice used it | **Removed field** | a `practice_card` prompt/answer id with no `field_def` row (`removed: true`) |

`BoardState` in `frontend/src/lib/deckConfigurationBoard.ts` is unchanged structurally. Its slots map to the UI as:

| Slot            | Renders in                               |
| --------------- | ---------------------------------------- |
| `unassigned`    | **Not used** area, top of board          |
| `prompt_fields` | Prompt side · Always shown               |
| `prompt_pool`   | Prompt side · Random draw (+ counts row) |
| `answer_fields` | Answer side · Always shown               |
| `answer_pool`   | Answer side · Random draw (+ counts row) |

Sheet rows, in this order, current location omitted (four rows shown): _Prompt · always shown_, _Prompt · random draw_, _Answer · always shown_, _Answer · random draw_, _Not used_.

- Layout per the slot ↔ UI mapping table, one layout at every viewport: Not used, then the Prompt side card (Always shown area, Random draw area), then the Answer side card.
- Each chip is a single `<button>` whose accessible name is the field name, with `aria-haspopup="dialog"`. Tapping sets it as the sheet trigger (one shared ref, assigned on tap, passed as `BottomSheet`'s `triggerRef` so focus returns to the chip on close) and opens the sheet titled `Move "<field name>" to…` with the four destination rows above. Choosing calls the existing `onMove` and closes; scrim-tap/Esc dismisses (no Cancel row).
- Frequency: inside each Random draw area, below its chips, only when the area has ≥1 field: the text "Each card shows", checkboxes labeled 1…n, the text "of these". Wire to the existing `toggleCount`; pruning stays in `moveField`, untouched.
- Empty-area copy, exactly: Not used empty → "Every field is assigned."; an empty Always shown or Random draw area → "None yet."
- Update `SLOT_LABELS` to the words of the table above and reword `boardValidationError`'s four strings to: "Check how many random prompt fields each card shows." / "Check how many random answer fields each card shows." / "The prompt side needs at least one field — always shown or random draw." / "The answer side needs at least one field — always shown or random draw."
- Delete all HTML5 DnD code (`draggable`, `onDragStart`, `dropProps`, drag-over state) and the per-chip `<select>`; delete their tests and replace the simulated dragstart→drop test with tap-path tests.

**Out of scope**

- dnd-kit or any drag enhancement.
- Changes to `BoardState`, `moveField`, `boardToPayload`, `boardFromConfig`.
- Deck picker, name input, save flow.

**Done when**

- `grep -rn "draggable\|onDragStart\|onDrop" frontend/src/components/library/` returns nothing.
- `npx vitest run` passes with a test covering: tap chip → sheet → choose destination → chip renders in the target area.
- `npx vitest run` passes with a test covering: counts pruned when the last checked count exceeds the shrunk n.
- `npx vitest run` passes with a test covering: frequency row absent when a Random draw area is empty.
- The existing payload-mapping tests still pass.
- Every assignment is reachable by click/tap alone.

**Debrief**

`DeckConfigurationEditor.tsx` needed no edit: the "page-bottom explanation paragraph" ("A pool draws one of its checked counts...") actually lived inside the old `FieldAssignmentBoard.tsx`, not in the editor page itself, and disappeared along with the rest of that file's rewrite. Also updated `frontend/src/lib/deckConfigurationBoard.test.ts` (not listed under Files) to match the reworded `boardValidationError` strings, a mechanical follow-on of the Details-authorized copy change, needed to keep the existing suite green. The sheet's five destination-row labels ("Prompt · always shown") are a second, shorter wording distinct from `SLOT_LABELS`' compound area names ("Prompt side · Always shown") used for region landmarks/headings; both come verbatim from the contract, applied to their respective spots.

### T3 — New practice page

**Status**

- [x]

**Goal**

`/practice/new` is built: filter, pick one configuration per deck, name, create, land on the practice detail page.

**Dependencies**

- T1: `ApiDetailError`.
- T2: run after T2 so the flow never links into the condemned board.

**Files**

- `frontend/src/App.tsx` (route)
- `frontend/src/pages/PracticeCreatePage.tsx` (new)
- `frontend/src/components/practice/ConfigurationPickList.tsx` (new)
- `frontend/src/pages/PracticeCreatePage.test.tsx` (new)

**Details**

On New practice, selections must survive filter changes, and an "N selected" count must render next to Create so hidden selections stay visible.

The overview and New practice share the URL params `subject` and `deck`; the overview alone adds `status`.

- Route `/practice/new` reads `?subject=` / `?deck=`.
- Reuse `PracticeFilterBar` with the same props/semantics as the overview; the page fetches subjects and decks and passes them down, filter state lives in the URL.
- Configurations from `readDeckPracticeConfigs({subjectId, deckId})`, grouped by deck; group header is "deck name · subject name". `ConfigurationPickList` takes groups, selection, per-config error text, and `onSelect` as props; it does not fetch. Selection is a radio per deck group (T1's invariant 7), any number of decks.
- Name input prefilled `formatDateTime(new Date())`, the same call `DeckConfigurationEditor.tsx` makes, editable, sent verbatim (T1's invariant 8).
- "New configuration" button navigates to `/deck-configurations/new` carrying the current `subject`/`deck` params and state `{returnTo: current pathname+search}`; on return, `location.state.configurationId` auto-selects that configuration's radio.
- Create enabled when ≥1 selected and name non-blank, else disabled with the unmet condition as inline text (same pattern as the builder's Save). On success navigate to `/practice/<id>`.
- Errors, per ADR 022: `stale_config` → the message "This configuration no longer produces any prompts — edit it." rendered on the offending row (`detail.config_id`), selection preserved; `config_not_found` → top-of-list message "A selected configuration no longer exists." and refetch the list; `duplicate_deck` (unreachable through the radio UI) and any other error → `error.message` rendered above Create. No toasts.
- Empty states: no configurations at all → "No deck configurations yet." plus the New configuration button; filters match zero → "No configurations match these filters." plus a Clear filters button that empties both params.

**Out of scope**

- The practice detail page itself: T5.
- Builder changes.
- A cross-deck configuration management list.

**Done when**

- An MSW test covers grouping with two same-named decks in different subjects staying disambiguated.
- An MSW test covers radio-per-deck being enforced.
- An MSW test covers a successful create posting `{name, deck_practice_config_ids}` and navigating to `/practice/<returned id>`.
- An MSW test covers `stale_config` rendering on the right row with selection intact.
- MSW tests cover both empty states.
- An MSW test covers the "N selected" count updating when a selected group is filtered out.

**Debrief**

`groupConfigurationsByDeck` (with its `ConfigurationGroup` type) lives in a new `frontend/src/lib/practiceConfigurationGroups.ts` rather than inside `ConfigurationPickList.tsx` as the Files line implied: colocating a plain function with a component export trips this repo's `react-refresh/only-export-components` lint rule, and `deckConfigurationBoard.ts`/`FieldAssignmentBoard.tsx` already establish the "pure state-shaping logic in `lib/`, rendering in the component" split. A few things the Details didn't specify were filled in by extending established page conventions rather than inventing new ones: a sticky-header Cancel button (navigates to `/practice`, keeping the current filters) matching every other creation-flow page (`SubjectForm`, `DeckEditor`, `CardStandaloneForm`, `DeckConfigurationEditor`); the "N selected" count sits in that same header next to Create (literally "next to Create" per Details); the true-empty state repeats the "New configuration" button that's already always visible above the list, mirroring `DeckDetailPage`'s configurations tab; and a "Could not load deck configurations." banner mirrors the load-error pattern every sibling list page already has. None of these are covered by an explicit Done-when bullet but each has a test.

### T4 — returnTo rides the URL

**Status**

- [x]

**Goal**

Every `returnTo` moves from router state to the `?returnTo=` URL param per ADR 024, so return context survives nested round trips and the New practice → New configuration → New deck chain returns correctly on both Cancel and Save.

**Dependencies**

- T3: `PracticeCreatePage`'s `newConfiguration`.

**Files**

- `frontend/src/lib/returnTo.ts` (new)
- `frontend/src/lib/returnTo.test.ts` (new)
- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.tsx`
- `frontend/src/components/library/CardStandaloneForm.tsx`
- `frontend/src/components/library/DeckEditor.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.test.tsx`
- `frontend/src/components/library/CardStandaloneForm.test.tsx`
- `frontend/src/components/library/DeckEditor.test.tsx`

**Details**

The round-trip navigation contract (ADR 024), amending the shipped builder round trip:

- `returnTo` is a URL query param; its value is the `pathname + search` of the page to return to. Built with `URLSearchParams.set`, never string concatenation, so a nested value (a `returnTo` whose value itself contains a `returnTo`) encodes and decodes correctly.
- Readers go through `internalReturnTo(searchParams): string | null` in `frontend/src/lib/returnTo.ts` (new): returns the value only when it starts with `/` and not `//`, else `null` (ADR 024).
- Senders: PracticeCreatePage "New configuration" → `/deck-configurations/new?subject&deck&returnTo=`; DeckConfigurationEditor "New deck…" and CardStandaloneForm "New deck…" → `/decks/new?returnTo=<own pathname+search>`. No `state` on these navigations.
- Returns: Save → `navigate(returnTo, {state: {deckId}})` (DeckEditor) / `navigate(returnTo, {state: {configurationId}})` (DeckConfigurationEditor); Cancel → `navigate(returnTo)`, no state. Absent/invalid param → today's fallbacks, unchanged (DeckEditor → `/library`; DeckConfigurationEditor → `/decks/{deckId}?tab=configurations` or `/library`).
- Router state carries only one-shot results: `{deckId}` (deck-editor save-return, and "start on this deck" into the builder), `{configurationId}` (builder save-return).

`PracticeCreatePage`'s deck→configuration selection is not part of this contract and must not persist across a round trip through "New configuration"/"New deck…".

- Implement the round-trip navigation contract exactly; all four sites in one task so no state-based sender survives.
- PracticeCreatePage `newConfiguration`: add `returnTo` to the params it already builds; drop the `state` argument.
- DeckConfigurationEditor: read via `internalReturnTo` instead of `location.state.returnTo` (state keeps only `deckId`); "New deck…" → `/decks/new` with `?returnTo=${location.pathname}${location.search}`, no state.
- CardStandaloneForm "New deck…": same, value `${location.pathname}${location.search}`.
- DeckEditor: create mode reads via `internalReturnTo`; save/cancel targets otherwise unchanged.
- `returnTo.test.ts`: `/x` accepted; `https://evil.com`, `//evil.com`, `x`, empty → `null`.
- Component tests: replace `state: {returnTo}` entries with URL-param entries. Assert the nested chain: builder entered with `?returnTo=<encoded /practice/new?subject=s1>` → "New deck…" → the `/decks/new` location's `returnTo` param, decoded via URLSearchParams, equals the builder's full `pathname+search` including its own `returnTo`; deck-editor Cancel lands on that full builder URL; Save lands there with `{deckId}` state. Compare decoded values, never encoded string literals.

**Out of scope**

- End-to-end chain tests: T6.
- Any change to `{deckId}`/`{configurationId}` result state.
- The Cancel-confirm dialogs.
- T5's pages.
- Persisting `PracticeCreatePage`'s selection, explicitly not built.

**Done when**

- `grep -rn "returnTo" frontend/src | grep -v "\.test\." | grep "state"` returns nothing.
- `npx vitest run` passes with the new helper and nested-chain tests.
- The manual repro, Practice → New practice → New configuration → New deck, Cancel, Cancel, lands on `/practice/new` with filters intact in the browser, with the outcome in the Debrief.

**Debrief**

Two deviations from the literal Done-when text, both mechanical, not scope changes. (1) The literal `grep -rn "returnTo" frontend/src | grep -v "\.test\." | grep "state"` is not empty: it also matches inline comments explaining the ADR 024 rule ("returnTo rides the URL, not state") and the one legitimate line where they co-occur, `DeckEditor.tsx`'s `navigate(returnTo, { state: { deckId: created.id } })`, where `returnTo` is the navigate target and the state object only ever holds `deckId`. A precise check (`grep -rn "state:.*returnTo\|returnTo.*: *{"`) confirms zero cases of a `returnTo` value actually stored inside a state object. (2) The manual in-browser walk could not be performed: this environment has no Clerk dev-auth bypass on the frontend (backend-only, via `DEV_AUTH_USER_ID`), a gap already documented before this task existed, not something new. In its place: the nested-round-trip component tests added to `DeckConfigurationEditor.test.tsx` and `DeckEditor.test.tsx` exercise the equivalent interaction chain end-to-end at the component level (builder entered with an inbound `returnTo` → opens "New deck…" → the deck editor's own `returnTo`, decoded, equals the builder's exact prior location; Cancel and Save both land there correctly). Recommend the user walk the real browser repro once by hand, Practice → New practice → New configuration → New deck, Cancel, Cancel, before treating this as verified end-to-end in a real session.

### T5 — Practice detail page

**Status**

- [x]

**Goal**

The detail stub is replaced with the real page: header facts, status-dependent body, delete.

**Dependencies**

- T1: `readPracticeSession`'s summary shape.

**Files**

- `frontend/src/pages/PracticeDetailsPage.tsx` (fill in)
- `frontend/src/pages/PracticeRunPage.tsx` (new stub)
- `frontend/src/components/practice/SessionDeckChips.tsx` (new, extracted)
- `frontend/src/components/practice/PracticeSessionRow.tsx` (use the extraction)
- `frontend/src/App.tsx` (run route)
- `frontend/src/pages/PracticeDetailsPage.test.tsx` (new)

**Details**

- Fetch `readPracticeSession` (T1's summary shape). Render name, status badge, created date via `formatDateTime`, and the deck·subject chips with the "N / M decks deleted" treatment: extract that chip block from `PracticeSessionRow` into `SessionDeckChips` (props: `decks`, `deletedDeckCount`; no fetching) and use it in both places; if the status badge is currently inline in the row, extract it the same way, otherwise reuse the existing component.
- Active → a "Start practice" button, pure navigation (T1's invariant 2) to `/practice/:practiceSessionId/run`; add that route rendering `PracticeRunPage`, a stub with heading "Practice run" and body "Coming soon."
- Completed → no Start button; body text "A summary of this practice is coming later."
- Delete button opens the same `ConfirmDialog` copy the overview uses; on success navigate to `/practice`. Render the mutation's `error.message` inline in the dialog on failure, dialog stays open.
- Query error (404 / foreign id) → "Practice session not found.", the `SubjectDetailPage.tsx` pattern.

**Out of scope**

- Stats.
- Restart.
- Rename.
- Anything on the run surface beyond the stub.

**Done when**

- A test covers an active session showing Start, which navigates to the run stub.
- A test covers a completed session hiding Start and showing the summary line.
- A test covers the deleted-deck count rendering.
- A test covers delete confirm calling the API and navigating to `/practice`.
- A test covers the not-found state rendering.

**Debrief**

The status badge was indeed inline in `PracticeSessionRow`, so per Details it got the same extraction treatment as the deck chips: a new `frontend/src/components/practice/PracticeStatusBadge.tsx` (not listed under Files, but directly instructed by "extract it the same way"). `SessionDeckChips` renders its chips with no wrapping element (a Fragment), not its own flex container, so each caller can drop them into whatever row it's already building (the overview row also places a created-date chip alongside them; the detail page doesn't need to). "Error inline in the dialog, dialog stays open" needed a capability `ConfirmDialog` didn't have: a `children` slot rendered between the description and the button row, added as a purely additive optional prop so every existing caller (five of them) is unaffected. `PracticeDetailsPage` is split into an outer component (just the `useParams`/`useQuery` gate) and a `PracticeDetailsPageBody` that owns the mutation and dialog state, the same split `DeckConfigurationEditor` uses: the delete mutation can't be called conditionally after the not-found/loading early returns without breaking the Rules of Hooks. Also removed `PracticeDetailsPage` from `placeholderPages.test.tsx`'s stub-smoke-test list, since it's no longer a placeholder and crashed there once real data-fetching needed a `QueryClientProvider` that bare test didn't supply; its real behavior is now covered by the new dedicated test file.

### T6 — Pre-filter chain, end to end

**Status**

- [x]

**Goal**

The two context chains are proven to work as wholes, not per page.

**Dependencies**

- T3
- T4

**Files**

- `frontend/src/pages/practicePrefilterChain.test.tsx` (new)

**Details**

Wiring fixes are allowed only where a chain test finds a step dropping context.

MSW-backed tests walking each chain by simulated clicks: subject page → `/practice?subject=S` → New practice (subject filter applied) → New configuration (that subject's decks sorted first in the picker); deck page → `/practice?subject=S&deck=D` → New practice (both filters) → New configuration (deck pre-selected).

A third walk must cover the nested "New configuration" → "New deck…" round trip in both directions, Cancel and Save: from New practice, "New configuration" → "New deck…"; Cancel in the deck editor → back on New configuration with its `subject`/`deck` params and `returnTo` intact; Cancel again → back on `/practice/new` with the original filters. And the save direction: create the deck → back on New configuration with the new deck preselected → save the configuration → back on `/practice/new` with that configuration auto-selected. Any other deck's selection made before leaving `/practice/new` is expected to be gone, not preserved; the chain test asserts that explicitly (select two decks, leave via New configuration → New deck, return, assert only the auto-selected one is checked).

Then walk all three chains in the running app against the dev backend. A fix belongs here only if it is a context-passing bug surfaced by these tests; anything larger is reported in the Debrief, not built.

**Out of scope**

- New features.
- New params.
- Home-page launchers.
- Persisting `PracticeCreatePage`'s selection.

**Done when**

- All three chain tests pass, including the two nested-round-trip directions.
- The browser walk is done and its outcome written into the Debrief.

**Debrief**

One context-passing bug surfaced and fixed, exactly the class this task authorizes: `PracticeCreatePage`'s auto-select one-shot for `location.state.configurationId` consumed itself against the _stale cached_ config list on remount (the invalidated refetch still in flight), so a configuration created through the round trip was never auto-selected; the fix consumes the one-shot only when the returned id is actually found in the list (`PracticeCreatePage.tsx`). T3's own test missed it because its builder stub returned an id already present in the list. The browser walk WAS performed this time, resolving T4's open recommendation: the backend `DEV_AUTH_USER_ID` bypass authenticates token-less requests, so headless Chromium (playwright-core, scratchpad-installed, against the machine's ms-playwright browser) drove the real signed-out app at localhost:5173. All three chains passed, both nested directions included, zero console errors; T4's recommended manual repro (New practice → New configuration → New deck, Cancel, Cancel) is covered by the cancel-direction walk. The walk created "T6 Walk Deck" and "T6 Walk Config" in the dev database and left them in place (AGENTS.md: never bulk-delete dev data after a browser check).
