# 006 — Practice run

## Goal

Outcome: A started practice session has its run surface: the card view with reveal and rating, live progress, the completion breakdown, and re-run.

Scope: The card view with reveal and rating, live progress, the completion breakdown, and re-run.

Judgement: None.

## Records

- ADR 026: Exclusion of blank-valued fields from practice card generation
- ADR 031: Server-composed reads for the practice run and its breakdown

## Tasks

### T1 — Blank-value generation filter

**Status**

- [x]

**Goal**

Blank-valued fields can no longer become prompts or answers.

**Dependencies**

None.

**Files**

- `app/database_ops/practice_generation.py`
- `tests/api_tests/test_practice_session.py`

**Details**

Add the condition `CardFieldValue.value != ''` to `db_fetch_generation_candidates`'s join (ADR 026). The docstrings already describe this behavior and become true; do not reword them.

**Out of scope**

- Any change to archived-field filtering.
- Pool sampling weights.
- The skip-card rule.

**Done when**

- A test covers a card whose pool field is blank never receiving it.
- A test covers a blank fixed answer field being excluded while the card still generates from its remaining fields.
- A test covers a card blank on every answer field producing no practice_card.

**Debrief**

No departures from Details. New `TestBlankValueGenerationFilter` class added to `tests/api_tests/test_practice_session.py` (3 tests, calling `resolve_prompts_or_answers`/`generate_practice_card_fields` directly rather than through full session start, for deterministic coverage independent of RNG). Full suite: 236 passed.

### T2 — Run-state endpoint

**Status**

- [x]

**Goal**

One server-composed `GET .../run` replaces `GET .../current_card`.

**Dependencies**

None.

**Files**

- `app/models/practice_card.py`
- `app/database_ops/practice_card.py`
- `app/services/practice_session.py`
- `app/routers/api/practice_session.py`
- `tests/api_tests/test_practice_session.py`
- `frontend/src/api/practice_session.ts`
- `frontend/src/api/openapi.json` (regenerated)
- `frontend/src/api/types.ts` (regenerated)

**Details**

A card's chain is its session's `practice_card` rows sharing `card_id`, ordered by `created_at` ascending (rows of one chain are written in distinct transactions, so no tiebreak is needed; a passed row is never followed by another row). Buckets, from the chain's last row:

- last `pending`, chain length 1 → **unseen** · last `pending`, length > 1 → **retry_pending** · last `passed` → **passed** · last `failed` → **still_failed**.
- Completed-session refinement (breakdown tabs): `passed` splits by chain length: 1 → `passed_first_try`, 2 → `passed_after_one_fail`, ≥3 → `passed_after_many_fails`; `still_failed` stays (displayed as "Abandoned").

The run-state API (ADR 031), replacing `GET current_card`: `GET /api/practice_sessions/{practice_session_id}/run` → 200 `PracticeRunState`; 404 unknown/foreign session. The old `/current_card` endpoint and `readCurrentPracticeCard` are removed. Keep `get_current_practice_card`'s active→completed transition; after it, `session_status` reflects the post-transition value.

```python
class ResolvedFieldValue(AppModel):
    field_def_id: uuid.UUID
    name: str
    type: FieldType
    value: str            # "" when no card_field_value row exists

class SessionProgress(AppModel):
    total_cards: int      # distinct card_ids in the session (fixed)
    unseen: int
    retry_pending: int
    passed: int
    still_failed: int

class CurrentRunCard(AppModel):
    practice_card_id: uuid.UUID
    card_id: uuid.UUID
    attempt: int          # 1-based index of this row in its chain (badge when > 1)
    prompts: list[ResolvedFieldValue]   # ordered by field_def.position asc
    answers: list[ResolvedFieldValue]   # same ordering

class PracticeRunState(AppModel):
    session_name: str     # for the crumb/title
    session_status: SessionStatus
    progress: SessionProgress
    current_card: CurrentRunCard | None  # None ⇒ nothing pending (session completed)
```

Resolution: an id in `prompts`/`answers` with no surviving `field_def` row is omitted; archived fields still resolve (name/type live on the row).

The backend functions:

- `db_read_practice_cards_for_session(db, practice_session_id) -> list[PracticeCard]`: all rows, `created_at` asc (new, `app/database_ops/practice_card.py`).
- `session_progress(cards: list[PracticeCard]) -> SessionProgress`: pure chain-bucket fold (new, `app/services/practice_session.py`), shared by run state and breakdown counts.

In `frontend/src/api/practice_session.ts`: add `readPracticeRunState(id)`; delete `readCurrentPracticeCard`.

Implement the run-state contract: new models, `db_read_practice_cards_for_session`, `session_progress`, the route, removal of the old endpoint, and the `readPracticeRunState` swap (delete `readCurrentPracticeCard`; update any importer). `attempt` = the current row's 1-based chain index. Resolution rules per the contract.

**Out of scope**

- Any frontend rendering.
- The breakdown endpoint.
- Touching `RatingSubmissionResult`; its bare `PracticeCardRead` stays.

**Done when**

- A test covers resolved names/types/values in `field_def.position` order.
- A test covers `""` value passthrough.
- A test covers archived-field resolution.
- A test covers attempt incrementing on a requeued row.
- A test covers progress counts across all four buckets, including still_failed via a mid-session archival that blocks requeue.
- A test covers `current_card: null` + `session_status: "completed"` once nothing is pending.
- A test covers 404 for a foreign session.

**Debrief**

No departures from Details. Field/value resolution reuses the existing `db_read_field_defs(..., include_archived=True)` and the `Card.values` relationship rather than new `database_ops` functions, since every practice_card's ids already belong to one already-ownership-checked card/deck. Removing `GET .../current_card` also required updating its other callers outside this task's declared file list, `tests/api_tests/test_deck_delete_cascade.py` and `tests/api_tests/test_auth_scoping.py`, to hit `/run` instead, since leaving them on the deleted route would fail `pytest clean`. New tests: `TestSessionProgressFold` (pure fold, no DB) and `TestRunState` (endpoint contract, including an end-to-end still_failed case via mid-session field archival) in `tests/api_tests/test_practice_session.py`; the four HTTP-flow tests that used to call `/current_card` were updated in place to call `/run`. Full suite: 247 passed backend, 379 passed frontend (`npx vitest run`, `npm run lint`, `npm run build` all clean).

### T3 — Breakdown endpoint

**Status**

- [x]

**Goal**

The completion dataset stands behind one `GET .../breakdown`.

**Dependencies**

- T2: `session_progress`, the generated API files.

**Files**

- `app/models/practice_card.py` (breakdown models)
- `app/database_ops/practice_card.py` (ratings lookup by `review_group_id`)
- `app/services/practice_session.py`
- `app/routers/api/practice_session.py`
- `tests/api_tests/test_practice_session.py`
- `frontend/src/api/practice_session.ts`
- `frontend/src/api/openapi.json` (regenerated)
- `frontend/src/api/types.ts` (regenerated)

**Details**

The breakdown API (ADR 031): `GET /api/practice_sessions/{practice_session_id}/breakdown` → 200 `PracticeSessionBreakdown`; 404 unknown/foreign; 409 `{"code": "session_active", "message": ...}` while active.

```python
class RatedFieldValue(ResolvedFieldValue):
    rating: int | None    # review_log row where review_group_id == practice_card.id
                          # and field_def_id matches; None only if that row was orphaned

class BreakdownAttempt(AppModel):
    practice_card_id: uuid.UUID
    status: PracticeCardStatus          # passed | failed, never pending
    created_at: datetime
    prompts: list[ResolvedFieldValue]
    answers: list[RatedFieldValue]

class BreakdownCard(AppModel):
    card_id: uuid.UUID
    bucket: BreakdownBucket             # str enum: passed_first_try | passed_after_one_fail
                                        #   | passed_after_many_fails | still_failed
    attempt_count: int
    primary_field: ResolvedFieldValue   # deck's active field_def at position 0
    attempts: list[BreakdownAttempt]    # chronological; last is the determining attempt

class PracticeSessionBreakdown(AppModel):
    total_cards: int
    passed_first_try: int
    passed_after_one_fail: int
    passed_after_many_fails: int
    still_failed: int
    cards: list[BreakdownCard]          # ordered by first attempt's position asc
```

In `frontend/src/api/practice_session.ts`: add `readPracticeSessionBreakdown(id)`.

Build the breakdown contract, including the 409 while active and the bucket refinement from T2's chain rules. Ratings join `review_log` on `review_group_id == practice_card.id` and `field_def_id`; a missing row yields `rating: None`. Each `BreakdownCard` resolves `primary_field` via the card's `deck_id` and the existing `db_read_field_defs` (active, position-ordered); index 0 is primary. Value `""` is passed through as-is; the client renders the fallback (T9), not this endpoint.

**Out of scope**

- Any UI.
- Re-run.
- Pagination.

**Done when**

- A test covers one session exercising all four buckets with correct counts and per-card `attempt_count`.
- A test covers a multi-attempt card's attempts in chronological order with per-answer ratings matching what was submitted.
- A test covers cards ordered by first-attempt position.
- A test covers a card with a blank primary field still returning `value: ""`, not a server-side fallback string.
- A test covers 409 with `code: "session_active"` on an active session.
- A test covers 404 for a foreign session.

**Debrief**

No departures from Details. `_breakdown_bucket` and `get_practice_session_breakdown` reuse T2's `_chains_by_card_id`/`_resolve_field_values` helpers rather than duplicating the chain fold; a new `db_read_ratings_by_review_group` (`app/database_ops/practice_card.py`, as the contract specifies) batches the `review_log` join for a whole session in one query. `SessionActiveError` (new, mirrors `SessionStartError`'s `.detail` shape) carries the 409. Per-deck field_def lookups are cached across a session's cards to avoid an N+1 pattern when several cards share a deck. Also added a frontend unit test for `readPracticeSessionBreakdown` in `frontend/src/test/practice_session.test.ts` (not in this task's declared file list, but a direct parity addition alongside T2's `readPracticeRunState` coverage; `npx vitest run`/`npm run lint` still pass). One tooling note: the harness's Read/Edit/Write tools became unresponsive ("PreToolUse hook did not respond") partway through this session for several files across both languages; those edits were made via `cat`/Python scripts through the Bash tool instead, then verified with `pytest`/`ast.parse`/`tsc`/`vitest`/`eslint`; no code was written blind. Full suite: 251 passed backend, 382 passed frontend (`npx vitest run`, `npm run lint`, `npm run build` all clean).

### T4 — Re-run endpoint

**Status**

- [x]

**Goal**

`POST .../rerun` recreates a completed session from its own frozen snapshots and deletes the original.

**Dependencies**

- T3: the generated API files.

**Files**

- `app/services/practice_session.py`
- `app/routers/api/practice_session.py`
- `app/database_ops/practice_deck.py` (read a session's snapshots if no reader exists)
- `tests/api_tests/test_practice_session.py`
- `frontend/src/api/practice_session.ts`
- `frontend/src/api/openapi.json` (regenerated)
- `frontend/src/api/types.ts` (regenerated)

**Details**

The re-run API: `POST /api/practice_sessions/{practice_session_id}/rerun` → 201 `PracticeSessionRead` (the new session). Errors, `detail` = `{"code": ..., "message": ...}`: 404 unknown/foreign; 400 `session_active` if the session isn't completed; 400 `nothing_to_rerun` when no snapshot survives (deleted + stale combined). One transaction: create new session (old name verbatim) + snapshots + cards from surviving frozen arrays, then delete the old session.

In `frontend/src/api/practice_session.ts`: add `rerunPracticeSession(id)`.

Extract `start_practice_session`'s per-deck snapshot+generate loop into a helper both paths call; the re-run path feeds it the old `practice_deck` arrays, skipping deck_id-null rows and rows failing `validate_deck_practice_config` against the live deck. Create-then-delete inside one transaction; commit once.

**Out of scope**

- A zero-card guard; re-run mirrors create.
- Any UI.

**Done when**

- A test covers re-run of a completed session returning 201 with the old name and `active` status, its cards regenerated and the old session gone.
- A test covers a deleted deck being dropped while others survive.
- A test covers a stale deck (field archived post-session) being dropped likewise.
- A test covers all-dropped → 400 `nothing_to_rerun` with the old session still existing.
- A test covers an active session → 400 `session_active`.
- A test covers 404 for a foreign session.

**Debrief**

No departures from Details. Extracted `_snapshot_and_generate_deck` (new, `app/services/practice_session.py`) from `start_practice_session`'s per-deck loop; it takes a plain `array_values` dict rather than a config-shaped object, so both `start_practice_session` (fed from a live `DeckPracticeConfig`) and the new `rerun_practice_session` (fed from a completed session's own frozen `PracticeDeck` rows) can call it identically. `db_read_practice_decks_for_session` added to `app/database_ops/practice_deck.py` per the file list. "Create-then-delete in one transaction, commit once" falls out for free: every create in the shared helper only flushes (never commits), so calling the existing `db_delete_practice_session` (which does commit) as the last step commits the whole transaction (new session, its snapshots, its cards, and the old session's deletion) atomically in one round trip, with no new commit-avoiding variant needed. New `RerunError(code, message)` exception (mirrors `SessionStartError`'s shape) carries the two `400` cases. New `TestRerun` class in `tests/api_tests/test_practice_session.py` (7 tests) plus a shared `_finish_session` test helper that drives a session to completion via `/run` + rate-4 loops, reused across the new tests. Full suite: 258 passed backend, 385 passed frontend (`npx vitest run`, `npm run lint`, `npm run build` all clean).

### T5 — Rating interaction

**Status**

- [x]

**Goal**

Every answer field is rateable via chip + popover, with one batched submit advancing to the next card.

**Dependencies**

- T6

**Files**

- `frontend/src/components/practice/RatingChip.tsx` (new)
- `frontend/src/pages/PracticeRunPage.tsx`
- `frontend/src/pages/PracticeRunPage.test.tsx`
- `frontend/src/index.css` (all five tokens from the contract)
- `frontend/package.json` (+ `@radix-ui/react-popover`)

**Details**

Rating selection must use a non-blocking Radix Popover anchored to the tapped chip, centered straight-pointer arrow, containing the four rating options.

The popover's four options must carry the same red→amber→lime→green ramp as the filled chip.

"Next card" must be gated on every answer field having a rating; one batched `POST rate` submits them all.

Rating labels must be Again / Hard / Good / Easy (1→4); schema terms never appear.

Color tokens, added to `@theme` in `index.css` (placeholder palette): `--color-success: #2e9e44` · `--color-warning: #d9a514` · `--color-pending: #a0a0ad` · `--color-rating-hard: #e08a2e` · `--color-rating-good: #9ec32f`. Ramp: Again = `--color-danger`, Hard = `--color-rating-hard`, Good = `--color-rating-good`, Easy = `--color-success`. Chip/option text: white on Again, `#1a1a2e` on the other three. Progress bar: passed `--color-success`, still_failed `--color-danger`, retry_pending `--color-warning`, unseen `--color-pending`, segments in that left-to-right order, widths proportional to count / `total_cards`, zero-count segments not rendered.

`practice/RatingChip.tsx`: props `{ fieldName: string; rating: number | null; onSelect: (rating: number) => void }`. Unrated: outlined chip labeled "Rate". Rated: filled with the tier color, labeled with the tier name; tap reopens. Contains the Popover (new dependency `@radix-ui/react-popover`).

Build the RatingChip and color-token contracts. One popover open at a time (Radix handles via outside-dismiss). Ratings live in page state keyed by `field_def_id`, reset when `practice_card_id` changes. "Next card" button under the answer zone: disabled until every answer entry has a rating, then `ratePracticeCard(practice_card_id, { ratings })`; on success invalidate `['practice_run', id]`. On 400/404 from the submit, render the thrown error message under the button (ADR 022 gives a typed message) and leave chosen ratings intact.

**Out of scope**

- A post-submit green/red flash animation, never decided: do not add.
- Progress bar and retry badge: T8.
- Optimistic updates.

**Done when**

- A test covers tapping a chip opening four labeled options.
- A test covers selecting filling the chip with the label.
- A test covers Next staying disabled until all fields are rated.
- A test covers submit posting the exact `{field_def_id: rating}` map and the next card rendering after invalidation.
- A test covers a submit failure showing the error and keeping the ratings.

**Debrief**

No departures from Details. `@radix-ui/react-popover` installed at the same `^1.1.23` as the existing `@radix-ui/react-dialog`. "Ratings reset when `practice_card_id` changes" falls out of T6's existing `key={practice_card_id}` on `PracticeCardView`: ratings are plain `useState` there alongside `showAnswer`, no separate reset logic needed. `RatingChip`'s trigger `aria-label` is state-dependent (`Rate {name}` unrated, `{name}: {tier label}` rated) rather than a static "Rate {name}" throughout: a static label would leave the button's accessible name unchanged after rating, which is both a worse screen-reader experience (no confirmation of the chosen tier) and untestable by role/name. One tooling gap found and fixed: jsdom has no `ResizeObserver`, which `@radix-ui/react-popover`'s Arrow needs merely to exist (via `@radix-ui/react-use-size`) even though it never fires under jsdom's no-real-layout; added a no-op polyfill to `frontend/src/test/setup.ts` (not in this task's declared file list, but required for any Popover-based component's tests to run at all, present or future). Also did a real dev-server browser check (backend + Vite already running from a prior session's check; screenshots via the same scratch Playwright driver) of the full flow against a live 2-answer-field card: chip colors match the red→amber→lime→green ramp, the popover arrow anchors correctly, Next stays visibly disabled (muted) until both fields are rated then enables, and submitting genuinely advances to a fresh unrevealed next card via real invalidation; no console errors. Full suite: 258 passed backend (unaffected), 395 passed frontend (`npx vitest run`, `npm run lint`, `npm run build` all clean).

### T6 — Run page: card rendering and reveal

**Status**

- [x]

**Goal**

Pre-reveal, the answer zone shows what is being asked, zone headers plus per-field "Hidden" markers, and reveal fills values in place.

**Dependencies**

- T5

**Files**

- `frontend/src/pages/PracticeRunPage.tsx`
- `frontend/src/pages/PracticeRunPage.test.tsx`
- `frontend/src/components/practice/FieldValue.tsx`

**Details**

Pre-reveal, both zones must show a small "Prompt"/"Answer" header and each answer field must show its name with the word "Hidden" (plain italic `--color-text-muted`, non-interactive) in place of its value; `FieldValue.tsx` gains an additive `hidden?: boolean` prop.

`practice/FieldValue.tsx`: props `{ field: ResolvedFieldValue; labeled: boolean; hidden?: boolean }`. Text renders as text; image/audio render as a chip `[icon] {field.name}` opening a Radix Dialog overlay (ADR 016) containing `<img src={value}>` / `<audio controls src={value}>`. When `hidden`: the name label still renders per `labeled`, and in place of the value or media chip renders the literal word "Hidden" in italic `--color-text-muted` plain text; the value and any chip/button stay out of the DOM entirely. Default `false` preserves prior behavior; it is additive, and T5 (already built against the old shape) and the breakdown detail (T9) are unaffected.

The original scope of this task shipped (first-completion Debrief below) and T5's rating UI now lives in the answer zone; preserve both. This task changes only the pre-reveal presentation. Render the answer zone unconditionally in both orientations (in landscape it occupies its column pre-reveal too, not just after tapping "Show answer"), each answer entry as `FieldValue hidden` per the amended contract until reveal; no `RatingChip` renders for a hidden entry, since there is nothing to rate yet. Add a section header to each zone, exactly "Prompt" and "Answer", styled distinct from the per-field name labels (uppercase, no larger than a field-name label, `--color-text-muted`). After "Show answer", each entry renders exactly as it does today (value or media chip + `RatingChip`, `hidden={false}` or omitted). Implement the `hidden` prop in `FieldValue` per the amended contract entry. Pre-reveal, no answer field's value text and no media chip/button may be present in the DOM: not hidden via CSS, absent.

**Out of scope**

- Any change to the rating flow, ratings state, or Next-card gating; T5's behavior stays untouched.
- Progress bar and retry badge: T8.
- Breakdown: T9.
- Animating the reveal transition.
- Headers on any surface other than the run page.

**Done when**

- A test covers "Prompt" and "Answer" headers rendering pre-reveal, in both the initial and revealed states.
- A test covers, pre-reveal, each answer field's name being visible together with an italic "Hidden" marker, its real value absent from the DOM, and an image/audio answer field rendering no chip button.
- A test covers the "Hidden" markers being gone after "Show answer", and every existing reveal and rating test of this task and T5 still passes unmodified in behavior.
- A dev-server screenshot check of pre-reveal and post-reveal is noted in the Debrief.

**Debrief**

First completion: Landscape/portrait done via Tailwind's `landscape:` variant (flex-col by default, `landscape:flex-row` on the zones container) rather than a manual breakpoint, per the contract's either/or. The "reset reveal state per card" need (for T5, which advances via query invalidation rather than remounting the page) is handled by keying a `PracticeCardView` subcomponent on `practice_card_id` rather than a `useEffect`+`setState`; the latter tripped the `react-hooks` plugin's `set-state-in-effect` rule; the key approach is React's own documented idiom for this and needs no effect at all. Dev-server check (real backend + Vite dev server, headless-Chromium screenshots via a scratch Playwright install since `chromium-cli` wasn't available) against a live dev-DB session at 390×844 and 844×390, confirmed against real device screenshots the user shared mid-review. This surfaced two real layout bugs, both fixed: (1) both zones originally carried an unconditional `flex-1`, which in portrait's `flex-col` stretched each zone to fill leftover vertical space instead of sizing to content, opening a large blank gap between the prompt and answer zones once revealed; (2) the card/button container was also `flex-1` inside the page's `min-h-dvh` wrapper, which, combined with the shared `AppShell`'s own sticky header consuming real space above this page's content, pinned "Show answer" to the bottom of a box that was always at least one header-height taller than the visible viewport, so the button sat just past the fold even for a two-field card. Fixed by dropping the forced-full-height stretch entirely: the zones/button block now sizes to its own content and simply flows below the crumb, `landscape:flex-1` still equalizes the two zones' widths in the side-by-side layout, and the page only scrolls when a card's content genuinely exceeds the viewport rather than as a fixed tax on every card. That fix left a third, smaller artifact the user also caught from a screenshot: the page's own root div still carried `min-h-dvh` (kept only so the empty "Practice complete" state would center vertically), which, for the same reason as bug (2), the page renders below the shared shell's own sticky header rather than starting at the true viewport top, forced the document to be exactly one header-height taller than the viewport on every view, so a page with no overflowing content was still technically scrollable into dead space below it. Fixed by dropping `min-h-dvh` and the completion state's vertical-centering flexbox too (never a contract requirement, just an embellishment not worth a permanent phantom scrollbar); confirmed via `document.documentElement.scrollHeight === clientHeight` in the browser check that the page is genuinely non-scrollable now for a short card, the revealed state, and the completion state alike. `pytest` unaffected (258 passed, no backend touched). Full frontend suite: 390 passed (`npx vitest run`, `npm run lint`, `npm run build` all clean).

Reopened: No departures from Details. `FieldValue` gained the additive `hidden?: boolean` prop exactly per the amended contract: when set, the value/media branch is replaced by a plain italic `--color-text-muted` "Hidden" paragraph, independent of the `labeled` name-label branch. `PracticeRunPage`'s answer `<section>` now always renders (no `{showAnswer && ...}` gate), mapping each answer field to either the revealed `FieldValue + RatingChip` row or a bare `FieldValue hidden`; the `RatingChip` genuinely never mounts for a hidden field, matching "nothing to rate yet." Both zone headers are plain `<h2>`s (`text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)`, i.e. no larger than a field-name label per the contract) rendered unconditionally, so they're identical pre- and post-reveal, with no separate "collapsed" vs "revealed" header state to keep in sync. No `useEffect`/extra reset logic needed: `hidden` is derived straight from the existing `showAnswer` boolean already local to `PracticeCardView`. New tests: 4 added to `PracticeRunPage.test.tsx` (headers present pre-reveal, name+"Hidden" marker with value absent, no chip button for a hidden image field, headers persist and markers clear post-reveal); all 12 pre-existing tests in that file passed unmodified against the new markup, confirming the change didn't alter any already-decided behavior. Dev-server screenshot check (same live "Noob Practice" dev-DB session used in the earlier checks) at 390×844 portrait pre-reveal and post-reveal, and 844×390 landscape pre-reveal: headers, per-field "Hidden" markers, and the reveal transition all match the design with no console errors and no layout regressions from the first completion's landscape/portrait fixes. Full suite: 258 passed backend (unaffected), 399 passed frontend (`npx vitest run`, `npm run lint`, `npm run build` all clean).

### T7 — Run page card restyle

**Status**

- [x]

**Goal**

The run page's two zones render as Direction B's two card surfaces, with the answer card's container reflecting reveal state.

**Dependencies**

- T6

**Files**

- `frontend/src/pages/PracticeRunPage.tsx`
- `frontend/src/components/practice/FieldValue.tsx`
- `frontend/src/pages/PracticeRunPage.test.tsx` (only if selectors need adjusting; behavior assertions must not change)

**Details**

The run page's two zones must render as two separate card surfaces (`rounded-2xl bg-(--color-surface) p-5 shadow-lg`, 16px gaps between crumb, cards, and button); the Answer card is flat with a `border-2 border-dashed border-(--color-text-muted)` while sealed, then borderless and `shadow-lg` once revealed, while the Prompt card stays constant; `FieldValue` values become `text-lg font-semibold` (labels unchanged, 2px label-to-value gap), and revealed answer rows top-align with the rating chip offset 16px so chip position never depends on value length. This is Direction B of the "Practice Run Card Redesign" canvas (https://claude.ai/code/artifact/0328aff8-0e73-45ea-8816-17ccbc53a103).

Match the canvas's Direction B artboards. Prompt card: `rounded-2xl bg-(--color-surface) p-5 shadow-lg`, constant across states, containing its existing header and fields. Answer card: same shape and padding; pre-reveal `border-2 border-dashed border-(--color-text-muted)` with no shadow, revealed no border with `shadow-lg`. 16px between crumb and first card, between the cards, and between the last card and the button. In `FieldValue`, value text becomes `text-lg font-semibold` with 2px between a label and its value; labels, the "Hidden" marker, and the media chip are unchanged. Since `FieldValue` is shared, T9's breakdown detail will inherit this value styling, which is intended. Revealed answer rows: `items-start`, rating chip offset 16px from the row top, identical for every row regardless of value length; `RatingChip` itself is not modified; alignment lives in the row markup around it. Landscape keeps the existing side-by-side split, now as two cards. Reveal state, ratings state, and all T5 behavior are untouched.

**Out of scope**

- Any palette change; this task is structure-only.
- Expand/collapse for long values, explicitly deferred.
- `RatingChip` internals.
- Progress bar and retry badge: T8.
- Breakdown UI: T9.
- Animating the sealed→opened transition.
- Direction A's recessed-band treatment.

**Done when**

- All existing `PracticeRunPage.test.tsx` tests pass with behavior assertions unmodified; this change is visual-only, so no new jsdom tests are required, and none may be weakened.
- A dev-server screenshot check in portrait (pre-reveal and revealed) and landscape (pre-reveal) confirms the rendered page matches the canvas's Direction B artboards (dashed flat answer card pre-reveal, elevated card revealed, semibold values, level chips), noted in the Debrief.

**Debrief**

No departures from Details. Both zone `<section>`s already existed from T6; this task only added surface classes on top of them (`rounded-2xl bg-(--color-surface) p-5`, plus `shadow-lg` or the state-conditional dashed border), so the header/field markup and `space-y-3` internal rhythm carried over untouched, with no structural rework needed. The zones-row's gap changed from `gap-6 landscape:gap-4` to a uniform `gap-4` (16px) in both orientations, per the single 16px figure in Details with no orientation carve-out. `FieldValue`'s root div became `flex flex-col gap-0.5` (2px) to make the label-to-value gap explicit; previously it was two block children with no declared gap, which happened to render at 0px; also added `min-w-0` so a long value can wrap/shrink correctly now that `FieldValue` sometimes sits inside a flex row (the revealed answer row) alongside a `RatingChip`. The 16px chip offset is a wrapping `<div className="mt-4 shrink-0">` around `<RatingChip>` in the row markup, not a `RatingChip` prop; `RatingChip.tsx` itself is untouched, matching its Out-of-scope. No test file changes were needed: all 16 existing `PracticeRunPage.test.tsx` tests (role/text queries, no class or DOM-shape assertions) passed unmodified against the new markup, confirming the change is genuinely visual-only. Dev-server screenshot check against the same live "Noob Practice" dev-DB session used in prior checks, at 390×844 portrait (pre-reveal and revealed) and 844×390 landscape (pre-reveal): matches the approved Direction B canvas artboards (dashed flat Answer card pre-reveal, solid elevated Answer card revealed, semibold values, rating chips level with their value's first line), no console errors. `pytest` unaffected (258 passed, no backend touched). Full frontend suite: 399 passed (`npx vitest run`, `npm run lint`, `npm run build` all clean).

### T8 — Progress bar and retry badge

**Status**

- [x]

**Goal**

Live session progress shows above the card, and a retry marker shows on requeued attempts.

**Dependencies**

- T7: shares `PracticeRunPage.tsx`.

**Files**

- `frontend/src/components/practice/RunProgressBar.tsx` (new)
- `frontend/src/pages/PracticeRunPage.tsx`
- `frontend/src/pages/PracticeRunPage.test.tsx`

**Details**

A small retry badge must show on the current card when `attempt > 1`, reusing the progress bar's retry color.

`practice/RunProgressBar.tsx`: props `{ progress: SessionProgress }` (generated type).

Bar per the color/order contract in T5's Details, rendered between crumb and card, `role="img"` with an `aria-label` naming the four counts. It re-renders from the same run-state query T5 already invalidates; no extra fetch. Retry badge: when `attempt > 1`, a small `--color-warning` pill labeled "Retry" in the card's top corner.

**Out of scope**

- Animating segment transitions.
- Per-deck sub-bars.
- Showing numeric counts inline; aria-label only.

**Done when**

- A test covers segment widths reflecting given counts, with zero-count segments absent.
- A test covers the badge rendering at `attempt: 2` and not at `attempt: 1`.

**Debrief**

One gap not covered by any ADR/contract, confirmed with the user before implementing: "in the card's top corner" predates T7, which split the single card into two surfaces, leaving unclear which one the badge belongs to. Resolved as page-level: the badge sits between the progress bar and the two-card row, attached to neither card, rather than picking one card's corner. Implementation: `RunProgressBar` renders unconditionally once `runQuery.data` resolves, positioned in `PracticeRunPage` itself (not inside `PracticeCardView`), so it shows in both the active-card and the completed "Practice complete" states, per "rendered between crumb and card" read literally regardless of what "the card" turns out to be. The retry badge lives in `PracticeCardView`, gated on `currentCard.attempt > 1`, as the first child before the two-card row, picking up the container's own `gap-4` with no extra margin needed. Segment order/colors and the "Hidden" marker's design are untouched; `RunProgressBar` is a pure function of `progress`, no local state. One real test collision found and fixed: the bar's `role="img"` collided with an existing test's unscoped `queryByRole('img')` (checking no media image was open yet); since every render now has an `img`-role element by design, that assertion was tightened to `queryByRole('img', { name: 'Photo' })`, scoping it to the actual media chip rather than any element with the role. Dev-server check (not required by this task's Done when, but touches shared layout) against the same live "Noob Practice" dev-DB session: progress bar renders with correct colors/order/proportions against real data (green passed, warning-yellow retry_pending, gray unseen; still_failed was 0 and correctly omitted), no console errors; the live session's current card was attempt 1, so the retry badge's real-browser appearance wasn't observable there, but is covered directly by two jsdom tests (present at `attempt: 2`, absent at `attempt: 1`). Full suite: 258 passed backend (unaffected), 403 passed frontend (`npx vitest run`, `npm run lint`, `npm run build` all clean).

### T9 — Completion breakdown view

**Status**

- [x]

**Goal**

The four-tab breakdown shows in place when a run completes and is embedded for any completed session.

**Dependencies**

- T3
- T8

**Files**

- `frontend/src/components/practice/SessionBreakdown.tsx` (new)
- `frontend/src/components/practice/SessionBreakdown.test.tsx` (new)
- `frontend/src/pages/PracticeRunPage.tsx`
- `frontend/src/pages/PracticeRunPage.test.tsx`
- `frontend/src/pages/PracticeDetailsPage.tsx`
- `frontend/src/pages/PracticeDetailsPage.test.tsx`

**Details**

`practice/SessionBreakdown.tsx`: props `{ breakdown: PracticeSessionBreakdown }`; no fetching (pages own queries). Tabs labeled **First try / One retry / 2+ retries / Abandoned**, each with its count; row tap opens a `BottomSheet` detail.

`SessionBreakdown` per its contract: summary counts line, four tabs labeled **First try / One retry / 2+ retries / Abandoned**, one row per card showing only `{primary_field.name}: {primary_field.value}`, or "Untitled card" if the value is blank, matching `CardSummaryRow.tsx`'s existing fallback copy; never prompt/answer content. Row tap opens a `BottomSheet` with the full detail: labeled prompts/answers, each answer's rating as a ramp-colored chip, and for multi-attempt cards every prior attempt in order. Run page: when `current_card` is null, fetch breakdown and render `SessionBreakdown` in place of T6's placeholder, keeping the "Done" link. Details page: for a `completed` session, fetch breakdown and render it where the stub paragraph sits; remove the stub text.

**Out of scope**

- The Re-run button: T10.
- Editing anything from the detail sheet.
- Virtualized lists.
- Any change to `CardSummaryRow.tsx`/`CardTable.tsx` themselves.

**Done when**

- A test covers tab counts matching a breakdown fixture spanning all four buckets.
- A test covers a row showing the primary field's name and value, not prompt/answer content.
- A test covers a card with a blank primary field showing "Untitled card".
- A test covers the sheet showing full labels, ratings, and both attempts for a two-attempt card.
- A test covers the run page swapping to the breakdown when run state reports no card.
- A test covers the details page rendering the breakdown for a completed session and the Start button for an active one.

**Debrief**

No departures from Details, plus a few builder judgment calls that contradict no ADR/contract. `SessionBreakdown` doesn't fetch (props only, per its contract) and is shared verbatim by both pages: `PracticeRunPage`'s new `RunCompletion` component and `PracticeDetailsPage`'s body each own an independent `useQuery(['practice_breakdown', id], ...)`, mirroring how every other page here owns its query (ADR 033). `RunCompletion` replaces T6's plain placeholder entirely rather than layering the breakdown alongside it, but keeps its own "Practice complete" heading above the shared `SessionBreakdown` (that heading is specific to "you just finished," which doesn't belong in the same component `PracticeDetailsPage` reuses for a session completed days ago; the two call sites render identical underlying data). The tab default is the first bucket with a nonzero count (falling back to `passed_first_try` if all four are empty) rather than always defaulting to the first tab, so a session with nothing in "First try" doesn't open on an empty list. The row list reuses `ListRow`'s visual grammar but not the component itself: `BottomSheet`'s `triggerRef` needs the actual clicked `<button>` element for focus restoration, which `ListRow`'s event-less `onClick` can't supply, so each row is a plain button mirroring `FieldAssignmentBoard.tsx`'s identical existing precedent for "list of taps that open a BottomSheet." The detail sheet labels an attempt ("Attempt N of M · Passed/Failed") only when a card has more than one attempt; a single-attempt card's fields render with no extra header, since there's nothing to disambiguate. Ratings render as a new read-only `RatingBadge`, drawing its label/color from `RatingChip`'s own tier ramp rather than a second hand-copied one; that ramp had to move out of `RatingChip.tsx` into a new `src/components/practice/ratingTiers.ts` (not in this task's declared file list) because exporting a plain constant from a component file trips this repo's `react-refresh/only-export-components` ESLint rule; `RatingChip.tsx` now imports it too, behavior unchanged. One real bug found and fixed via a dev-server check: the four labeled, counted tabs ("First try (9)", "2+ retries (4)") are wider than a phone viewport, and with no scroll container of their own, tapping a tab near the edge scrolled the _entire page_ sideways instead of just the tab strip; fixed by adding `overflow-x-auto` directly to the tablist row, confirmed fixed by re-running the same check. That check ran against the real dev-DB "Noob Practice" session (20 cards spanning three of the four buckets, one chain five attempts long with real per-attempt pool-sampled fields) at 390×844: the run page's post-completion swap, tab switching, the detail sheet's chronological attempts with correctly colored rating badges, the empty "Abandoned" bucket's message, and the details page rendering the identical breakdown for the same session all matched expectations with no console errors. `pytest` unaffected (258 passed, no backend touched). Full frontend suite: 410 passed (`npx vitest run`, `npm run lint`, `npm run build` all clean).

### T10 — Re-run action

**Status**

- [x]

**Goal**

A completed session can be re-run from its detail header.

**Dependencies**

- T4: `rerunPracticeSession`.
- T9

**Files**

- `frontend/src/pages/PracticeDetailsPage.tsx`
- `frontend/src/pages/PracticeDetailsPage.test.tsx`

**Details**

For `completed` sessions only, a "Re-run" button beside Delete. It opens a `ConfirmDialog`: title "Re-run this practice?", description "A new practice with the same decks is created, and this one is deleted. Reviews already logged stay on record.", confirm label "Re-run", not destructive-styled. Confirm calls `rerunPracticeSession`; on success invalidate `['practice_sessions']` and navigate to `/practice/{new_id}`. On 400, close the dialog and render the thrown message where the delete error renders.

**Out of scope**

- Re-run from the overview list rows.
- Any run-page change.

**Done when**

- A test covers the button being absent on an active session and present on a completed one.
- A test covers confirm posting and navigating to the returned session's detail route.
- A test covers a `nothing_to_rerun` failure showing the message with the old session remaining on screen.

**Debrief**

No departures from Details, with one judgment call on the ambiguous "render the thrown message where the delete error renders" phrase. The delete error only ever renders _inside_ the (still-open) delete `ConfirmDialog`, but this task explicitly has the rerun dialog _close_ on a 400, so literally the same DOM slot isn't visible once closed. Read it as "the same alert styling and page region, not the same dialog": the rerun error renders as a page-level `role="alert"` paragraph (identical classes to the delete error) right below the header actions that triggered it. The Re-run button is a second icon button beside Delete (a `RotateCcw` glyph, same `h-11 w-11` treatment), shown only for a `completed` session; its `ConfirmDialog` omits `destructive` (default is the primary palette) per the contract. Verified with a real dev-server check against the repo's one real completed session ("Noob Practice"): both header icons render correctly spaced, the confirm dialog's copy matches the contract verbatim and is styled non-destructive (blue, not red), and Cancel closes cleanly with no leftover state. The check stopped at Cancel rather than Confirm so as not to consume that session (re-running it for real would delete it, and it's the anchor data the earlier tasks' checks and this one all used); the actual confirm→POST→navigate and 400→error-and-stay paths are covered directly by the new jsdom tests instead, which mock the API and assert the exact request/response contract. `pytest` unaffected (258 passed, no backend touched). Full frontend suite: 415 passed (`npx vitest run`, `npm run lint`, `npm run build` all clean).
