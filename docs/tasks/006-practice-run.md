# 006 — Practice run: the session experience

The run surface for a started practice session, per the 2026-08-26/27 /plan session: the card view with reveal and rating, live progress, the completion breakdown, and re-run. Builds on 004 (setup/creation) and 005 (breadcrumbs — its MD-2 left the run crumb static pending this work). Branch: `rewrite/practice-run`, after 004/005 land.

## ADRs

Decisions this file implements; full context and rejected alternatives live in the ADRs.

- **ADR 026 — Exclude blank-valued fields from practice card generation**: a field with no value on a card is never selected as that card's prompt or answer, fixed or pool, either side.
- **ADR 027 — Practice card presentation is a static two-zone reveal, media behind tap-to-open chips**: prompt zone always visible, one "Show answer" tap reveals the whole answer zone; no flip-card model; image/audio values never render inline.
- **ADR 028 — Live progress counts unique cards, not attempt rows**: the progress bar's total is fixed at session start (distinct `card_id`s), so it never regresses when a failure adds a new pending row.
- **ADR 029 — Retrospection lives only at session completion, grouped by outcome chain**: no mid-run back-navigation; a completed session's cards group by `card_id` into four buckets (first try / one retry / many retries / abandoned); one breakdown view, reached both right after finishing and by revisiting later.
- **ADR 030 — Re-run recreates a completed session from its own frozen snapshots**: no `deck_practice_config` lookup (none is retrievable); a deleted or now-stale deck is dropped, not blocking; refuses only if nothing survives; create-then-delete in one transaction.
- **ADR 031 — Practice run and breakdown reads are server-composed**: one payload each for `GET .../run` and `GET .../breakdown`, fully resolved server-side — no client-side id joins.

This file also consumes **ADR 032** (007 — Primary field): a deck's primary field, used to identify a card in the breakdown's compact row, is defined and owned by that file, not this one.

## Minor decisions

- **MD-1**: Rating selection uses a non-blocking Radix Popover anchored to the tapped chip, centered straight-pointer arrow, containing the four rating options — not a Dialog (blocks the rapid rate-several-fields flow), not inline chip expansion.
- **MD-2**: The popover's four options carry the same red→amber→lime→green ramp as the filled chip, so picking is a color-to-color match.
- **MD-3**: A small retry badge shows on the current card when `attempt > 1`, reusing the progress bar's retry color.
- **MD-4**: "Next card" is gated on every answer field having a rating; one batched `POST rate` submits them all, matching the backend's one-shot `RatingSubmission`.
- **MD-5**: Rating labels are Again / Hard / Good / Easy (1→4) — user-facing vocabulary per ADR 021, schema terms never appear.

## Contracts

### Chain and bucket rules (ADR 029, ADR 028)

A card's **chain** is its session's `practice_card` rows sharing `card_id`, ordered by `created_at` ascending (rows of one chain are written in distinct transactions, so no tiebreak is needed; a passed row is never followed by another row). Buckets, from the chain's last row:

- last `pending`, chain length 1 → **unseen** · last `pending`, length > 1 → **retry_pending** · last `passed` → **passed** · last `failed` → **still_failed**.
- Completed-session refinement (breakdown tabs): `passed` splits by chain length — 1 → `passed_first_try`, 2 → `passed_after_one_fail`, ≥3 → `passed_after_many_fails`; `still_failed` stays (displayed as "Abandoned", ADR 029).

### API — run state (ADR 031), replaces GET current_card

`GET /api/practice_sessions/{practice_session_id}/run` → 200 `PracticeRunState`; 404 unknown/foreign session. The old `/current_card` endpoint and `readCurrentPracticeCard` are removed. Keeps `get_current_practice_card`'s active→completed transition; after it, `session_status` reflects the post-transition value.

```python
class ResolvedFieldValue(AppModel):
    field_def_id: uuid.UUID
    name: str
    type: FieldType
    value: str            # "" when no card_field_value row exists

class SessionProgress(AppModel):
    total_cards: int      # distinct card_ids in the session (fixed, ADR 028)
    unseen: int
    retry_pending: int
    passed: int
    still_failed: int

class CurrentRunCard(AppModel):
    practice_card_id: uuid.UUID
    card_id: uuid.UUID
    attempt: int          # 1-based index of this row in its chain (MD-3: badge when > 1)
    prompts: list[ResolvedFieldValue]   # ordered by field_def.position asc
    answers: list[ResolvedFieldValue]   # same ordering

class PracticeRunState(AppModel):
    session_name: str     # for the crumb/title (005 MD-2 upgrade)
    session_status: SessionStatus
    progress: SessionProgress
    current_card: CurrentRunCard | None  # None ⇒ nothing pending (session completed)
```

Resolution: an id in `prompts`/`answers` with no surviving `field_def` row is omitted; archived fields still resolve (name/type live on the row).

### API — breakdown (ADR 029, ADR 031)

`GET /api/practice_sessions/{practice_session_id}/breakdown` → 200 `PracticeSessionBreakdown`; 404 unknown/foreign; 409 `{"code": "session_active", "message": ...}` while active.

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
    primary_field: ResolvedFieldValue   # deck's active field_def at position 0 (007, ADR 032)
    attempts: list[BreakdownAttempt]    # chronological; last is the determining attempt

class PracticeSessionBreakdown(AppModel):
    total_cards: int
    passed_first_try: int
    passed_after_one_fail: int
    passed_after_many_fails: int
    still_failed: int
    cards: list[BreakdownCard]          # ordered by first attempt's position asc
```

### API — re-run (ADR 030)

`POST /api/practice_sessions/{practice_session_id}/rerun` → 201 `PracticeSessionRead` (the new session). Errors, `detail` = `{"code": ..., "message": ...}`: 404 unknown/foreign; 400 `session_active` if the session isn't completed; 400 `nothing_to_rerun` when no snapshot survives (deleted + stale combined). One transaction: create new session (old name verbatim) + snapshots + cards from surviving frozen arrays, then delete the old session.

### Backend function surface

- `db_fetch_generation_candidates` gains the condition `CardFieldValue.value != ''` in its join (ADR 026).
- `db_read_practice_cards_for_session(db, practice_session_id) -> list[PracticeCard]` — all rows, `created_at` asc (new, `app/database_ops/practice_card.py`).
- `session_progress(cards: list[PracticeCard]) -> SessionProgress` — pure chain-bucket fold (new, `app/services/practice_session.py`), shared by run state and breakdown counts.

### Frontend — color tokens (added to `@theme` in `index.css`; placeholder palette)

`--color-success: #2e9e44` · `--color-warning: #d9a514` · `--color-pending: #a0a0ad` · `--color-rating-hard: #e08a2e` · `--color-rating-good: #9ec32f`. Ramp (MD-2): Again = `--color-danger`, Hard = `--color-rating-hard`, Good = `--color-rating-good`, Easy = `--color-success`. Chip/option text: white on Again, `#1a1a2e` on the other three. Progress bar (ADR 028): passed `--color-success`, still_failed `--color-danger`, retry_pending `--color-warning`, unseen `--color-pending`, segments in that left-to-right order, widths proportional to count / `total_cards`, zero-count segments not rendered.

### Frontend — components and API layer

- `src/api/practice_session.ts`: `readPracticeRunState(id)`, `readPracticeSessionBreakdown(id)`, `rerunPracticeSession(id)`; `readCurrentPracticeCard` deleted.
- `practice/FieldValue.tsx` — props `{ field: ResolvedFieldValue; labeled: boolean }`. Text renders as text; image/audio render as a chip `[icon] {field.name}` opening a Radix Dialog overlay (ADR 016) containing `<img src={value}>` / `<audio controls src={value}>` (ADR 027).
- `practice/RatingChip.tsx` — props `{ fieldName: string; rating: number | null; onSelect: (rating: number) => void }`. Unrated: outlined chip labeled "Rate". Rated: filled with the tier color, labeled with the tier name; tap reopens. Contains the Popover (MD-1/MD-2, new dependency `@radix-ui/react-popover`).
- `practice/RunProgressBar.tsx` — props `{ progress: SessionProgress }` (generated type).
- `practice/SessionBreakdown.tsx` — props `{ breakdown: PracticeSessionBreakdown }`; no fetching (pages own queries). Tabs labeled **First try / One retry / 2+ retries / Abandoned**, each with its count; row tap opens a `BottomSheet` detail (ADR 029).

## Tasks

### T1 — Blank-value generation filter (ADR 026)

- [ ] **Goal:** blank-valued fields can no longer become prompts or answers.
- **Files:** `app/database_ops/practice_generation.py`, `tests/api_tests/test_practice_session.py`.
- **Details:** Add `CardFieldValue.value != ''` to the join per the contract. The docstrings already describe this behavior and become true; do not reword them.
- **Out of scope:** any change to archived-field filtering, pool sampling weights, or the skip-card rule (`generate_practice_card_fields` returning None already covers all-blank sides).
- **Done when:** tests cover — a card whose pool field is blank never receives it; a blank fixed answer field is excluded while the card still generates from its remaining fields; a card blank on every answer field produces no practice_card; `pytest` clean.
- Notes:

### T2 — Run-state endpoint (ADR 028, ADR 031)

- [ ] **Goal:** one server-composed `GET .../run` replaces `GET .../current_card`.
- **Files:** `app/models/practice_card.py`, `app/database_ops/practice_card.py`, `app/services/practice_session.py`, `app/routers/api/practice_session.py`, `tests/api_tests/test_practice_session.py`, `frontend/src/api/practice_session.ts`, regenerated `frontend/src/api/openapi.json` + `types.ts`.
- **Details:** Implement the run-state contract: new models, `db_read_practice_cards_for_session`, `session_progress`, the route, removal of the old endpoint, and the `readPracticeRunState` swap (delete `readCurrentPracticeCard`; update any importer — the run page stub doesn't fetch yet). `attempt` = the current row's 1-based chain index. Resolution rules per contract.
- **Out of scope:** any frontend rendering; the breakdown endpoint; touching `RatingSubmissionResult` (its bare `PracticeCardRead` stays).
- **Done when:** tests cover — resolved names/types/values in `field_def.position` order; `""` value passthrough; archived-field resolution; attempt increments on a requeued row; progress counts across all four buckets (including still_failed via a mid-session archival that blocks requeue); `current_card: null` + `session_status: "completed"` once nothing is pending; 404 for foreign session; `pytest` clean, `npm run gen:api` run, frontend build clean.
- Notes:

### T3 — Breakdown endpoint (ADR 029, ADR 031) — after T2 (shares `session_progress`, generated API files)

- [ ] **Goal:** the completion dataset behind one `GET .../breakdown`.
- **Files:** `app/models/practice_card.py` (breakdown models), `app/database_ops/practice_card.py` (ratings lookup by `review_group_id`), `app/services/practice_session.py`, `app/routers/api/practice_session.py`, `tests/api_tests/test_practice_session.py`, `frontend/src/api/practice_session.ts`, regenerated API files.
- **Details:** Per the breakdown contract, including the 409 while active and the bucket refinement from the chain rules. Ratings join `review_log` on `review_group_id == practice_card.id` and `field_def_id`; a missing row yields `rating: None`. Each `BreakdownCard` resolves `primary_field` via the card's `deck_id` and the existing `db_read_field_defs` (active, position-ordered); index 0 is primary. Value `""` is passed through as-is — the client renders the fallback (T8), not this endpoint.
- **Out of scope:** any UI; re-run; pagination (a session's card count is bounded by its decks).
- **Done when:** tests cover — one session exercising all four buckets with correct counts and per-card `attempt_count`; a multi-attempt card's attempts in chronological order with per-answer ratings matching what was submitted; cards ordered by first-attempt position; a card with a blank primary field still returns `value: ""` (not a server-side fallback string); 409 with `code: "session_active"` on an active session; 404 foreign; `pytest` clean, `npm run gen:api` run, frontend build clean.
- Notes:

### T4 — Re-run endpoint (ADR 030) — after T3 (generated API files; reuses start-path internals)

- [ ] **Goal:** `POST .../rerun` recreates a completed session from its own frozen snapshots and deletes the original.
- **Files:** `app/services/practice_session.py`, `app/routers/api/practice_session.py`, `app/database_ops/practice_deck.py` (read a session's snapshots if no reader exists), `tests/api_tests/test_practice_session.py`, `frontend/src/api/practice_session.ts`, regenerated API files.
- **Details:** Per the re-run contract. Extract `start_practice_session`'s per-deck snapshot+generate loop into a helper both paths call; the re-run path feeds it the old `practice_deck` arrays, skipping deck_id-null rows and rows failing `validate_deck_practice_config` against the live deck (ADR 030). Create-then-delete inside one transaction; commit once.
- **Out of scope:** a zero-card guard (a valid config on a card-less deck creates an empty session today at create; re-run mirrors create, not fixes it); any UI.
- **Done when:** tests cover — re-run of a completed session returns 201 with the old name and `active` status, its cards regenerated and the old session gone; a deleted deck is dropped while others survive; a stale deck (field archived post-session) is dropped likewise; all-dropped → 400 `nothing_to_rerun` and the old session still exists; active session → 400 `session_active`; 404 foreign; `pytest` clean, `npm run gen:api` run, frontend build clean.
- Notes:

### T5 — Run page: card rendering and reveal (ADR 027) — after T2

- [ ] **Goal:** the run page renders the current card as the two-zone reveal with real data.
- **Files:** `frontend/src/pages/PracticeRunPage.tsx`, `frontend/src/pages/PracticeRunPage.test.tsx`, `frontend/src/components/practice/FieldValue.tsx` (new).
- **Details:** Fetch via `readPracticeRunState` (TanStack Query, key `['practice_run', id]`). Crumb label upgrades from the static "Practice session" to `session_name` (005 MD-2's promised upgrade; keep the crumb target). Card container fills the viewport below the crumb; portrait stacks prompt zone above answer zone, landscape side-by-side (CSS orientation media query or flex-direction breakpoint). Prompt zone: `FieldValue labeled` per entry. Answer zone: hidden behind a full-width "Show answer" button; on tap, answer entries appear in place (`labeled`), no rating UI yet (T6). Media chips open their overlay (ADR 027). `current_card: null` renders a plain "Practice complete" heading and a "Done" link to `/practice/{id}` — replaced by the breakdown in T8.
- **Out of scope:** rating chips/popover, progress bar, retry badge, breakdown, any swipe gesture (tap/button only).
- **Done when:** tests cover — prompt values and names render; answer values absent until "Show answer" is clicked, present after; an image field renders as a chip and its overlay opens on click with the value as `src`; the crumb shows the session name; the null-card state shows the completion heading and the link to `/practice/{id}`; `npx vitest run`, `npm run lint`, `npm run build` clean; dev-server check of both orientations noted in Notes.
- Notes:

### T6 — Rating interaction (MD-1, MD-2, MD-4, MD-5) — after T5

- [ ] **Goal:** every answer field rateable via chip + popover, one batched submit advancing to the next card.
- **Files:** `frontend/src/components/practice/RatingChip.tsx` (new), `frontend/src/pages/PracticeRunPage.tsx`, `frontend/src/pages/PracticeRunPage.test.tsx`, `frontend/src/index.css` (all five tokens from the contract), `frontend/package.json` (+ `@radix-ui/react-popover`).
- **Details:** Per the RatingChip contract and color-token contract. One popover open at a time (Radix handles via outside-dismiss). Ratings live in page state keyed by `field_def_id`, reset when `practice_card_id` changes. "Next card" button under the answer zone: disabled until every answer entry has a rating, then `ratePracticeCard(practice_card_id, { ratings })`; on success invalidate `['practice_run', id]`. On 400/404 from the submit, render the thrown error message under the button (ADR 022 gives a typed message) and leave chosen ratings intact.
- **Out of scope:** a post-submit green/red flash animation (never decided — do not add); progress bar and retry badge (T7); optimistic updates.
- **Done when:** tests cover — tapping a chip opens four labeled options; selecting fills the chip with the label; Next stays disabled until all fields are rated; submit posts the exact `{field_def_id: rating}` map and the next card renders after invalidation; submit failure shows the error and keeps the ratings; `npx vitest run`, `npm run lint`, `npm run build` clean.
- Notes:

### T7 — Progress bar and retry badge (ADR 028, MD-3) — after T6

- [ ] **Goal:** live session progress above the card, and a retry marker on requeued attempts.
- **Files:** `frontend/src/components/practice/RunProgressBar.tsx` (new), `frontend/src/pages/PracticeRunPage.tsx`, `frontend/src/pages/PracticeRunPage.test.tsx`.
- **Details:** Bar per the color/order contract, rendered between crumb and card, `role="img"` with an `aria-label` naming the four counts. It re-renders from the same run-state query T6 already invalidates — no extra fetch. Retry badge: when `attempt > 1`, a small `--color-warning` pill labeled "Retry" in the card's top corner.
- **Out of scope:** animating segment transitions; per-deck sub-bars; showing numeric counts inline (aria-label only).
- **Done when:** tests cover — segment widths reflect given counts and zero-count segments are absent; the badge renders at `attempt: 2` and not at `attempt: 1`; `npx vitest run`, `npm run lint`, `npm run build` clean.
- Notes:

### T8 — Completion breakdown view (ADR 029) — after T3 and T7

- [ ] **Goal:** the four-tab breakdown, shown in place when a run completes and embedded for any completed session.
- **Files:** `frontend/src/components/practice/SessionBreakdown.tsx` (new), `frontend/src/pages/PracticeRunPage.tsx`, `frontend/src/pages/PracticeDetailsPage.tsx`, tests for all three.
- **Details:** `SessionBreakdown` per its contract: summary counts line, four tabs labeled **First try / One retry / 2+ retries / Abandoned**, one row per card showing only `{primary_field.name}: {primary_field.value}` — or "Untitled card" if the value is blank, matching `CardSummaryRow.tsx`'s existing fallback copy — never prompt/answer content. Row tap opens a `BottomSheet` with the full detail: labeled prompts/answers, each answer's rating as a ramp-colored chip, and for multi-attempt cards every prior attempt in order (ADR 029). Run page: when `current_card` is null, fetch breakdown and render `SessionBreakdown` in place of T5's placeholder, keeping the "Done" link. Details page: for a `completed` session, fetch breakdown and render it where the stub paragraph sits (ADR 029); remove the stub text.
- **Out of scope:** the Re-run button (T9); editing anything from the detail sheet; virtualized lists; any change to `CardSummaryRow.tsx`/`CardTable.tsx` themselves (007's scope, not this task's).
- **Done when:** tests cover — tab counts match a breakdown fixture spanning all four buckets; a row shows the primary field's name and value, not prompt/answer content; a card with a blank primary field shows "Untitled card"; the sheet shows full labels, ratings, and both attempts for a two-attempt card; the run page swaps to the breakdown when run state reports no card; the details page renders the breakdown for a completed session and the Start button for an active one; `npx vitest run`, `npm run lint`, `npm run build` clean.
- Notes:

### T9 — Re-run action (ADR 030, ADR 029) — after T4 and T8

- [ ] **Goal:** a completed session can be re-run from its detail header.
- **Files:** `frontend/src/pages/PracticeDetailsPage.tsx`, `frontend/src/pages/PracticeDetailsPage.test.tsx`.
- **Details:** For `completed` sessions only, a "Re-run" button beside Delete (ADR 023). It opens a `ConfirmDialog` — title "Re-run this practice?", description "A new practice with the same decks is created, and this one is deleted. Reviews already logged stay on record.", confirm label "Re-run", not destructive-styled. Confirm calls `rerunPracticeSession`; on success invalidate `['practice_sessions']` and navigate to `/practice/{new_id}`. On 400, close the dialog and render the thrown message where the delete error renders.
- **Out of scope:** re-run from the overview list rows; any run-page change.
- **Done when:** tests cover — the button is absent on an active session, present on a completed one; confirm posts and navigates to the returned session's detail route; a `nothing_to_rerun` failure shows the message and the old session remains on screen; `npx vitest run`, `npm run lint`, `npm run build` clean.
- Notes:
