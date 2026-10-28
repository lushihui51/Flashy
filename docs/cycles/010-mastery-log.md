# 010 — Mastery log: the ledger, and session deltas in the breakdown

## Goal

Outcome: `mastery_log` replaces `card_field_mastery`, and the completion breakdown becomes a delta-ranked list.

Scope: The `mastery_log` ledger and every mastery read and write through it, its migration, card and field mastery and deltas in the breakdown payload, and the breakdown UI as one delta-ranked list with badges. Not covered: the mastery-browse and statistics surfaces, which are later cycles consuming the ledger.

Judgement: None.

## Records

- ADR 042: An append-only mastery_log in place of card_field_mastery

## Tasks

### T1 — The ledger swap

**Status**

- [x]

**Goal**

`mastery_log` exists and every mastery read and write in the app goes through it; `card_field_mastery` is gone from the code.

**Dependencies**

None.

**Files**

- `app/models/mastery_log.py` (new)
- `app/models/card_field_mastery.py` (deleted)
- `app/database_ops/mastery_log.py` (new, renamed from `app/database_ops/card_field_mastery.py` and rewritten)
- `app/database_ops/practice_generation.py`
- `app/services/mastery.py`
- `app/services/practice_run.py`
- `app/mastery/types.py`
- `tests/api_tests/`

**Details**

The model:

```python
class MasteryLog(AppModel, table=True):
    # BIGINT IDENTITY primary key — the ledger's total order. "Latest row" always
    # means max(id); reviewed_at is display data, never an ordering key.
    id: int                                   # Identity, primary key
    card_id: uuid.UUID                        # FK card.id, ON DELETE CASCADE, not null
    field_def_id: uuid.UUID                   # FK field_def.id, ON DELETE CASCADE, not null
    practice_run_id: uuid.UUID | None         # FK practice_run.id, ON DELETE SET NULL
    prompt_mastery: float                     # REAL, not null — post-blend state,
    answer_mastery: float                     #   FieldMasteryState's four values
    prompt_review_count: int
    answer_review_count: int
    reviewed_at: datetime                     # timestamptz, the group's reviewed_at
```

Indexes: `ix_mastery_log_card_field (card_id, field_def_id, id)` and `ix_mastery_log_run (practice_run_id, id)`. CASCADE on card/field mirrors `card_field_mastery`'s semantics.

Current state of (card, field) is the row with max `id` for that pair; no row means never reviewed. One row is appended per field in the group's update set (the same granularity `db_upsert_mastery_states` wrote), carrying the post-blend state.

Write path and concurrency (ADR 042): `apply_rating` and `record_review_group` gain a `practice_run_id: uuid.UUID | None` parameter; `submit_rating` passes the practice_card's run id; `rebuild_mastery` passes the reconstructed attribution (below). A RETRY outcome skips the append exactly as it skips the blend today. `apply_rating` takes `pg_advisory_xact_lock(hashtext(card_id::text))` before fetching latest states, the same advisory-lock pattern `db_log_review_group` already uses, scoped per card.

`app/database_ops/card_field_mastery.py` becomes `app/database_ops/mastery_log.py`:

- `db_fetch_latest_mastery_states(db, card_id, field_def_ids) -> dict[uuid, FieldMasteryState]` (replaces `db_fetch_mastery_states_for_update`; DISTINCT ON latest rows, no FOR UPDATE).
- `db_append_mastery_log(db, card_id, states, reviewed_at, practice_run_id)` (replaces `db_upsert_mastery_states`; plain bulk INSERT).
- `db_fetch_mastery_read_rows(...)`: same name, signature, and row shape; the CardFieldMastery outerjoin becomes a lateral/DISTINCT ON join to the latest row.
- `db_clear_mastery(...)`: same name and scoping semantics, deletes from mastery_log.
- `db_fetch_generation_candidates` (`practice_generation.py`) swaps its outerjoin the same way; signature and row shape unchanged.

`rebuild_mastery` reconstructs attribution by joining each group's `review_group_id` to a still-existing `practice_card.id` → `practice_run_id`, else null. Accepted asymmetry: live writes keep attribution when a card is later deleted; a rebuild loses it for deleted cards.

In `app/mastery/types.py` the change is `FieldMasteryState`'s docstring table reference.

This is the cycle's one large diff; reads must swap in the same commit that stops writing the old table. Behavior parity everywhere except the new append and attribution: every existing mastery-related test must pass with only mechanical updates (fixture and table references), no assertion weakening.

**Out of scope**

- The alembic migration: T2.
- Breakdown deltas: T3.
- Any read of `practice_run_id`: T3.

**Done when**

- `grep -ri card_field_mastery app tests` returns zero hits.
- A new test asserts a rating appends rows carrying the run id and a client retry of the same group appends nothing.
- A rebuild test asserts ledger row states equal the pre-rebuild latest states, and attribution survives for live cards and nulls for a deleted card's groups.

**Debrief**

`id` uses an explicit `sqlalchemy.Identity()` BIGINT column (not a bare autoincrement `Field`) to match the contract's "BIGINT IDENTITY" wording. `apply_rating`/`record_review_group` take `practice_run_id` as a required positional param (no default) so every call site is explicit about attribution; existing test call sites pass `None` where attribution isn't under test. `db_fetch_mastery_read_rows`/`db_fetch_generation_candidates` join to a `DISTINCT ON` subquery of `mastery_log`'s latest row instead of a bare table outerjoin, since the ledger now holds full history — same signature and row shape as before, per contract. The "attribution nulls for a deleted card's groups" done-when criterion is interpreted as a deleted _run_ (whose `practice_card` cascades away) while the reviewed `card` itself stays live — a genuinely deleted card's `review_log` rows are excluded from `rebuild_mastery`'s replay entirely (pre-existing `db_fetch_review_log_for_rebuild` filter), so there would be no ledger row to observe attribution on either way; this matches the contract text ("still-existing `practice_card.id`") and mirrors T3's own "deleted-run attribution" scenario. Also renamed `card_field_mastery`/`CardFieldMastery` in comments outside T1's file list (`app/database_ops/review_log.py`, `app/models/card.py`, `app/services/deck_batch_edit.py`, `app/services/deck_copy.py`) and in two more test files (`tests/api_tests/test_deck_copy.py`, `tests/api_tests/test_deck_delete_cascade.py`) to satisfy the literal `grep` done-when, which isn't scoped to the Files list.

### T2 — The migration

**Status**

- [x]

**Goal**

The dev database moves to the ledger with history intact.

**Dependencies**

- T1: the rebuild logic, `rebuild_mastery`

**Files**

- One new alembic revision (new)

**Details**

Upgrade: create `mastery_log` (columns and indexes per T1's model), populate it by replaying `review_log` through the app's strategy, importing and calling the T1 rebuild logic against the migration's connection (the repo's backfill-migration precedent, `cde8b1c9da00`), then drop `card_field_mastery`. Downgrade: recreate `card_field_mastery`, populate it from each (card, field)'s max-id ledger row through plain SQL (`DISTINCT ON`, no strategy math), drop `mastery_log`. Accepted coupling: the upgrade imports app code as of this revision; note it in the migration docstring.

**Out of scope**

- Anything beyond the one revision.
- Data checks outside Done when.

**Done when**

- On a copy of the dev DB, `alembic upgrade head` succeeds.
- On that copy, the latest ledger row per (card, field) matches the old `card_field_mastery` values exactly, verified by SQL before and after and noted in the Debrief.
- On that copy, downgrade then upgrade round-trips.
- CI is green on the PR.

**Debrief**

Revision `795ede6a41c4`. Generated via `alembic revision --autogenerate` against a scratch copy of the dev DB (`pg_dump`/`psql`, not `createdb ... TEMPLATE`, since the live dev DB had other idle connections), then hand-edited to insert the `rebuild_mastery` call and the downgrade's `DISTINCT ON` backfill per contract. Verified on that scratch copy, not the live dev DB (see below): `alembic upgrade head` succeeded; a `card_field_mastery` snapshot taken before the upgrade matched `mastery_log`'s latest-row-per-pair exactly on all 98 (card, field) pairs and every column, including `updated_at`/`reviewed_at` (the old column's `now()` server_default never actually fired on the live write path — the app always supplied `reviewed_at` explicitly — so this is a legitimate exact match, not a coincidence); downgrade recreated `card_field_mastery` byte-identical to that same snapshot; re-upgrading after the downgrade reproduced `mastery_log` byte-identical again (full round trip). Also ran the complete chain from an empty database (base → head, then head → base → head), matching CI's own check, plus `alembic check` for zero drift against current `SQLModel.metadata` — both clean. Did not open a PR from this session, so "CI green on the PR" itself is unverified; everything CI's alembic-chain step checks was reproduced locally and passed. **Environment note, not part of this task's diff:** the live local dev database (`flashy`) already has an empty `mastery_log` table that `app/main.py`'s `init_db()` (`create_all`) silently created during a prior `fastapi dev` run against T1's already-changed models, while `card_field_mastery` (98 real rows) and `alembic_version` (still at the pre-T2 head) are untouched — so a real `alembic upgrade head` against `flashy` itself will fail on `CREATE TABLE mastery_log` until that stray empty table is dropped by hand first. Left the live dev DB untouched pending confirmation; all verification above ran against disposable copies instead.

### T3 — Breakdown deltas, backend

**Status**

- [x]

**Goal**

The breakdown payload carries card and field mastery and deltas.

**Dependencies**

- T1: `mastery_log` and its `practice_run_id` attribution

**Files**

- `app/models/practice_card.py`
- `app/database_ops/mastery_log.py`
- `app/services/practice_run.py`
- `tests/conftest.py`
- `tests/api_tests/test_practice_run.py`
- `frontend/src/api/practice_run.ts`
- Regenerated API files

**Details**

Delta semantics: for run R, over the domain every card in R's breakdown × every _active_ field of that card's deck. Let `attributed(c,f)` be R's mastery_log rows for (c,f), and `first_id(R)` the min id over all of R's rows (if R has no rows at all, every delta is 0 and `before` is the overall latest row per pair):

- bound(c,f) = min id of `attributed(c,f)` if non-empty, else `first_id(R)`
- before(c,f) = latest row with id < bound(c,f); absent → unreviewed (score None)
- after(c,f) = max-id row of `attributed(c,f)` if non-empty, else before(c,f)

Field score is `strategy.field_score` (the existing (prompt+answer)/2); a field first reviewed inside R has delta = after_score − prior (50.0), matching what the card fold sees. Card level: `strategy.card_score` over all active fields' before scores and after scores respectively; card delta = after.mastery − before.mastery. The API returns exact floats; the client formats them. The whole computation must read only R's own rows plus one latest-row-below-bound lookup per pair, never a history replay.

API additions: `GET /api/practice_runs/{practice_run_id}/state|/breakdown` paths, statuses, and every existing field are unchanged. Additions:

```python
class FieldMasteryDelta(AppModel):
    field_def_id: uuid.UUID
    name: str
    type: FieldType
    mastery: float | None      # after-state field score; None = never reviewed
    delta: float               # 0.0 for untouched fields

class BreakdownCard(AppModel):
    ...existing fields...
    mastery: float             # card fold, after-state
    delta: float               # after - before, exact
    fields: list[FieldMasteryDelta]   # every active field, field_def.position asc
```

Sorting is client-side; the server keeps returning cards in first-attempt position order.

The breakdown's delta computation must be bounded in round trips, not just in rows: the number of statements it issues against `mastery_log` must be fixed, independent of the run's card count and the decks' active-field count, verified by a statement-count test. R's attributed rows are one statement (`ix_mastery_log_run`); the per-pair before-lookup is one statement carrying every pair's own bound: a `LATERAL` subquery over a `VALUES` list of `(card_id, field_def_id, bound)`, or `DISTINCT ON` joined to that bounds relation; either is acceptable, a loop issuing one statement per pair is not. Each before-lookup is an index-bounded `id < bound ORDER BY id DESC LIMIT 1` probe on `ix_mastery_log_card_field`, never a scan of a pair's full history. Buckets, attempts, ordering, and every pre-existing field are byte-identical.

The statement counter is a fixture in `tests/conftest.py` over the module-level test `engine`, through SQLAlchemy's `before_cursor_execute` event. Touch `frontend/src/api/practice_run.ts` only if exports change.

**Out of scope**

- Any UI.
- Sorting server-side.
- Exposing before-values as separate fields (delta and after only).

**Done when**

- A test covers a run where one card's field goes from unreviewed to rated (delta against the 50 prior).
- A test covers a card with an untouched active field showing that field at delta 0 while the card fold dilutes accordingly.
- A test covers a field touched by a _different_ run between this run's rows contributing only this run's own movement (per-field bound).
- A test covers a deleted-run attribution (`practice_run_id` null) yielding delta 0 rather than an error.
- A test covers `fields` ordered by position.
- A statement-count test: the counter counts statements whose compiled SQL names `mastery_log`, is reset immediately before the `GET .../breakdown` request and read immediately after it, and reports the same nonzero count for two completed runs that differ in both dimensions: one card on the two-field `existing_field_defs` deck (the shape `TestBreakdown._setup_deck` + `_make_card` already build) and three cards on the eight-field `session_fields` deck (`session_cards` + `session_config`).
- Existing breakdown tests are unmodified.
- `npm run gen:api` is clean.

**Debrief**

`db_fetch_mastery_before_bound` uses the `DISTINCT ON` joined-to-bounds-relation shape, not `LATERAL` — a plain inner join naturally omits a pair with no row below its bound (no left join / null-row handling needed), and the caller already knows the full domain independently, so absence from the returned dict is enough. Measured (and asserted in the statement-count test) at exactly 2 statements per breakdown request regardless of run shape: R's own rows, then the bounds lookup. The per-field-bound test was mutation-tested — forcing a single run-wide bound instead of each pair's own makes it fail with the wrong number, confirming it's a real regression guard, not vacuous. `app/routers/api/practice_run.py` needed a matching one-line change (`get_practice_run_breakdown` gained a required `strategy` parameter, so its one call site needed `get_mastery_strategy()` threaded through) — mechanically necessary, not a design choice, so not called out as its own decision. The delta-semantics tests (`TestBreakdownMastery`) build `practice_run`/`practice_card`/`mastery_log` rows directly rather than through the generation/rating HTTP flow, for exact control over row ordering and attribution — the thing the contract is actually about — with expected mastery values computed via the same `MasteryStrategy.expand`/`apply_review` calls `apply_rating` itself makes (an independent oracle for the bound/attribution logic under test, without hand-computing EMA arithmetic). The "one card on the two-field `existing_field_defs` deck" phrasing is read as describing that _shape_ (2 active fields, 1 card), not literally reusing the fixture: `existing_field_defs` and `session_cards`/`session_config` both depend on `existing_deck`, so using both fixtures in one test would merge onto a single 10-field deck instead of two separate ones: `test_delta_computation_statement_count_is_fixed` instead builds its own fresh 2-field deck via `POST /api/decks` (`multi_subject_library`'s own pattern for a second deck), and reuses `session_cards`/`session_config` as-is for the 8-field side. `npm run gen:api`, `npx vitest run`, and `npm run lint` are all clean; `npm run build`'s `tsc -b` step is not — `RunBreakdown.test.tsx`'s existing fixtures (T4's own file) don't yet supply the newly-required `mastery`/`delta`/`fields` fields, and T4's Done-when (unlike T3's) explicitly requires a clean build, so it's the task that resolves this. Full `pytest`: 280 passed.

### T4 — Breakdown UI: ranked list

**Status**

- [x]

**Goal**

The breakdown renders as one delta-ranked list with badges, and the detail sheet shows per-field mastery and deltas.

**Dependencies**

- T3: `BreakdownCard`'s `mastery`, `delta` and `fields`, and `FieldMasteryDelta`

**Files**

- `frontend/src/components/practice/RunBreakdown.tsx`
- `frontend/src/components/practice/RunBreakdown.test.tsx`
- `frontend/src/pages/PracticeRunPage.test.tsx`
- `frontend/src/pages/PracticeDetailsPage.test.tsx`

**Details**

The sort control's options must be exactly `Gains first` (delta descending, the default), `Drops first` (delta ascending), `Mastery` (mastery ascending, weakest first). No tie-breaking rule is defined: equal values stay in whatever order the sort implementation leaves them.

Mastery must render as a rounded integer 0–100, `—` when the field has never been reviewed; delta must be the exact difference rounded to a signed integer, rendered `+N` / `−N` / `±0`.

The tabs are removed. In their place a three-option sort control labeled exactly as above, defaulting to `Gains first`. The summary counts line above it is unchanged. Each row keeps `{primary_field.name}: {value}` (and the "Untitled card" fallback) and gains: an outcome badge reusing the bucket labels `First try` / `One retry` / `2+ retries` / `Abandoned`, the card's mastery as an integer, and its delta. The detail BottomSheet keeps its attempts section and gains a "Fields" section listing every entry of `fields`: name, mastery integer or `—`, delta.

The tab markup, the per-bucket empty-state message, and the nonzero-default-tab logic are removed with the tabs; rows render in the selected sort order. Number formatting: `Math.round`; the sign rendered from the rounded value, `±0` at zero.

Touch `PracticeRunPage.test.tsx` and `PracticeDetailsPage.test.tsx` only if selectors need adjusting.

**Out of scope**

- Filtering by badge or bucket.
- Server round trips on sort change (all data is present).
- Animating reorder.
- Any change to `BottomSheet`, `RatingBadge`, or attempt rendering beyond adding the Fields section.

**Done when**

- A test asserts the default order is delta descending on a fixture with distinct known deltas.
- A test asserts each sort option reorders correctly.
- Tests assert a row shows the badge label, rounded mastery, and `+N`, `−N` and `±0` rendering, one case each.
- A test asserts `—` for a never-reviewed field in the sheet's Fields section.
- A test asserts the counts line persists.
- A dev-server screenshot check of both call sites, noted in the Debrief.

**Debrief**

The sort control isn't specified down to markup, so two judgment calls: it's a `role="radiogroup"`/`role="radio"` button group (not `role="tablist"`, since a persistent sort choice isn't a content-swapping tab, and not a native `<select>`, since no such precedent exists anywhere in this app and the three labels stay visibly scannable as buttons — matching this codebase's own established hand-rolled-button-group style, used identically in four other places); the outcome badge is a plain neutral bordered pill (no per-bucket color-coding), and mastery/delta render in the row's default text color with no added color-by-sign — both to avoid inventing a color semantic the contract doesn't specify, given Done-when only checks label/number text, not color. `PracticeRunPage.test.tsx`/`PracticeDetailsPage.test.tsx` needed both: their `getByRole('tab', ...)` selectors (removed with the tabs) and their `breakdownState()`/`breakdown()` fixtures, which lacked the now-required `mastery`/`delta`/`fields` fields and would otherwise render `NaN`/crash at runtime (MSW doesn't type-check its mocked JSON, so this only surfaces at test run time, not compile time) — the task's Files line anticipated only "selectors," so the fixture-completeness fix is noted here as the same kind of mechanical necessity, not a design choice. Verified against the dev server with a real, already-completed 20-card run already in the dev database (no data seeded or mutated — only GET requests and read-only UI interaction): screenshots of both call sites (`/practice/{id}` and `/practice/{id}/run`), the sort control switching from Gains-first to Mastery and correctly re-ordering, and the detail sheet's new Fields section, all sent to the user; zero browser console errors. `npx vitest run` (418 passed), `npm run lint`, and `npm run build` are all clean. Full backend `pytest` (282 passed) reconfirmed unaffected, since this task touched frontend only.
