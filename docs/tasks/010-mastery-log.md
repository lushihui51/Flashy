# 010 — Mastery log: the ledger, and session deltas in the breakdown

The mastery ledger cycle from the 2026-08-28/29 /plan session: `mastery_log` replaces `card_field_mastery`, and the completion breakdown becomes a delta-ranked list. Branch: `feat/mastery-log`, after 009 lands (all names below are post-rename; this file builds on 009's ADR 038 rename and ADR 039/040 run semantics).

## ADRs

Decisions this file implements; full context and rejected alternatives live in the ADRs.

- **ADR 042 — An append-only mastery_log replaces card_field_mastery**: one row per (card, field) state change with full post-blend state and nullable run attribution; current mastery = latest row per pair; run deltas by attribution; `rebuild_mastery` regenerates (and retroactively backfills) the whole ledger. `review_log` stays the sole source of truth (ADR 011 intact).
- **ADR 043 — A card's display mastery is the fold over all its deck's active fields**: unreviewed fields at the prior; one config-independent definition for every display surface, reused by the later browse/statistics cycles.
- **ADR 044 — The breakdown is a delta-ranked list with outcome badges**: the four tabs (ADR 029) become one sorted list; buckets survive as badges; the detail sheet gains per-field mastery/deltas for every active field.

## Minor decisions

- **MD-1**: Sort control options exactly `Gains first` (delta descending, the default), `Drops first` (delta ascending), `Mastery` (mastery ascending — weakest first). No tie-breaking rule is defined: equal values stay in whatever order the sort implementation leaves them.
- **MD-2**: Mastery renders as a rounded integer 0–100, `—` when the field has never been reviewed; delta is the exact difference rounded to a signed integer, rendered `+N` / `−N` / `±0`.
- **MD-3**: This cycle ships before the mastery-browse and statistics surfaces, which are separate later /plan cycles consuming the ledger and ADR 043's definition.
- **MD-4**: The breakdown's delta computation is bounded in round trips, not just in rows: the number of statements it issues against `mastery_log` is fixed — independent of the run's card count and the decks' active-field count — and T3 verifies it with a statement-count test. ADR 042's "never a history replay" said nothing about round trips, and no correctness test can tell two from a hundred; the SQL shape itself (a `LATERAL` over a `VALUES` bounds list, or `DISTINCT ON` joined to a bounds relation) is deliberately not pinned.

## Contracts

### mastery_log (ADR 042)

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

Indexes: `ix_mastery_log_card_field (card_id, field_def_id, id)` and `ix_mastery_log_run (practice_run_id, id)`. CASCADE on card/field mirrors `card_field_mastery`'s semantics: a deleted card's practice_cards cascade away and it leaves every breakdown anyway, so its ledger rows are cache-for-nothing (the raw rating history survives in `review_log` regardless).

Current state of (card, field) = the row with max `id` for that pair; no row = never reviewed. One row is appended per field in the group's update set (the same granularity `db_upsert_mastery_states` wrote), carrying the post-blend state.

### Write path and concurrency (ADR 042)

`apply_rating` and `record_review_group` gain a `practice_run_id: uuid.UUID | None` parameter; `submit_rating` passes the practice_card's run id; `rebuild_mastery` passes the reconstructed attribution (below). RETRY outcome skips the append exactly as it skips the blend today. Because append-only rows cannot serialize read-modify-append the way the old row lock did, `apply_rating` takes `pg_advisory_xact_lock(hashtext(card_id::text))` before fetching latest states — the same advisory-lock pattern `db_log_review_group` already uses, scoped per card.

`app/database_ops/card_field_mastery.py` becomes `app/database_ops/mastery_log.py`:

- `db_fetch_latest_mastery_states(db, card_id, field_def_ids) -> dict[uuid, FieldMasteryState]` (replaces `db_fetch_mastery_states_for_update`; DISTINCT ON latest rows, no FOR UPDATE).
- `db_append_mastery_log(db, card_id, states, reviewed_at, practice_run_id)` (replaces `db_upsert_mastery_states`; plain bulk INSERT).
- `db_fetch_mastery_read_rows(...)` — same name, signature, and row shape; the CardFieldMastery outerjoin becomes a lateral/DISTINCT ON join to the latest row.
- `db_clear_mastery(...)` — same name and scoping semantics, deletes from mastery_log.
- `db_fetch_generation_candidates` (`practice_generation.py`) swaps its outerjoin the same way; signature and row shape unchanged.

`rebuild_mastery` reconstructs attribution by joining each group's `review_group_id` to a still-existing `practice_card.id` → `practice_run_id`, else null. Accepted asymmetry: live writes keep attribution when a card is later deleted; a rebuild loses it for deleted cards — which no breakdown can show anyway.

### Delta semantics (ADR 042, ADR 043)

For run R, over the domain: every card in R's breakdown × every _active_ field of that card's deck. Let `attributed(c,f)` = R's mastery_log rows for (c,f), and `first_id(R)` = min id over all of R's rows (if R has no rows at all, every delta is 0 and `before` = the overall latest row per pair):

- bound(c,f) = min id of `attributed(c,f)` if non-empty, else `first_id(R)`
- before(c,f) = latest row with id < bound(c,f); absent → unreviewed (score None)
- after(c,f) = max-id row of `attributed(c,f)` if non-empty, else before(c,f)

Field score = `strategy.field_score` (the existing (prompt+answer)/2); a field first reviewed inside R has delta = after_score − prior (50.0), matching what the card fold sees. Card level (ADR 043): `strategy.card_score` over all active fields' before scores and after scores respectively; card delta = after.mastery − before.mastery. The API returns exact floats; the client formats per MD-2. The whole computation reads only R's own rows plus one latest-row-below-bound lookup per pair — never a history replay.

### API — breakdown additions (ADR 044, ADR 043)

`GET /api/practice_runs/{practice_run_id}/state|/breakdown` paths, statuses, and every existing field are unchanged. Additions:

```python
class FieldMasteryDelta(AppModel):
    field_def_id: uuid.UUID
    name: str
    type: FieldType
    mastery: float | None      # after-state field score; None = never reviewed
    delta: float               # 0.0 for untouched fields

class BreakdownCard(AppModel):
    ...existing fields...
    mastery: float             # ADR 043 card fold, after-state
    delta: float               # after - before, exact
    fields: list[FieldMasteryDelta]   # every active field, field_def.position asc
```

Sorting is client-side (MD-1) — the server keeps returning cards in first-attempt position order.

### Frontend — RunBreakdown (ADR 044, MD-1, MD-2)

The tabs are removed. In their place a three-option sort control labeled exactly per MD-1, defaulting to `Gains first`. The summary counts line above it is unchanged. Each row keeps `{primary_field.name}: {value}` (and the "Untitled card" fallback) and gains: an outcome badge reusing the bucket labels `First try` / `One retry` / `2+ retries` / `Abandoned`, the card's mastery as an integer, and its delta per MD-2. The detail BottomSheet keeps its attempts section and gains a "Fields" section listing every entry of `fields`: name, mastery integer or `—`, delta per MD-2.

## Tasks

### T1 — The ledger swap (ADR 042)

- [x] **Goal:** `mastery_log` exists and every mastery read and write in the app goes through it; `card_field_mastery` is gone from the code.
- **Files:** `app/models/mastery_log.py` (new), `app/models/card_field_mastery.py` (deleted), `app/database_ops/mastery_log.py` (renamed + rewritten per contract), `app/database_ops/practice_generation.py`, `app/services/mastery.py`, `app/services/practice_run.py` (submit_rating threads the run id), `app/mastery/types.py` (FieldMasteryState docstring's table reference), `tests/api_tests/` (mastery + practice tests).
- **Details:** Per the mastery_log, write-path, and concurrency contracts. This is the cycle's one large diff: it cannot be split without dual-write scaffolding, because reads must swap in the same commit that stops writing the old table. Behavior parity everywhere except the new append+attribution: every existing mastery-related test must pass with only mechanical updates (fixture/table references), no assertion weakening.
- **Out of scope:** the alembic migration (T2 — pytest builds schema via create_all, so this task is testable without it); breakdown deltas (T3); any read of `practice_run_id` (T3 is its first consumer).
- **Done when:** `grep -ri card_field_mastery app tests` returns zero hits; a new test asserts a rating appends rows carrying the run id and a client retry of the same group appends nothing; a rebuild test asserts ledger row states equal the pre-rebuild latest states and attribution survives for live cards and nulls for a deleted card's groups; full `pytest` clean.
- Notes: `id` uses an explicit `sqlalchemy.Identity()` BIGINT column (not a bare autoincrement `Field`) to match the contract's "BIGINT IDENTITY" wording. `apply_rating`/`record_review_group` take `practice_run_id` as a required positional param (no default) so every call site is explicit about attribution; existing test call sites pass `None` where attribution isn't under test. `db_fetch_mastery_read_rows`/`db_fetch_generation_candidates` join to a `DISTINCT ON` subquery of `mastery_log`'s latest row instead of a bare table outerjoin, since the ledger now holds full history — same signature and row shape as before, per contract. The "attribution nulls for a deleted card's groups" done-when criterion is interpreted as a deleted _run_ (whose `practice_card` cascades away) while the reviewed `card` itself stays live — a genuinely deleted card's `review_log` rows are excluded from `rebuild_mastery`'s replay entirely (pre-existing `db_fetch_review_log_for_rebuild` filter), so there would be no ledger row to observe attribution on either way; this matches the contract text ("still-existing `practice_card.id`") and mirrors T3's own "deleted-run attribution" scenario. Also renamed `card_field_mastery`/`CardFieldMastery` in comments outside T1's file list (`app/database_ops/review_log.py`, `app/models/card.py`, `app/services/deck_batch_edit.py`, `app/services/deck_copy.py`) and in two more test files (`tests/api_tests/test_deck_copy.py`, `tests/api_tests/test_deck_delete_cascade.py`) to satisfy the literal `grep` done-when, which isn't scoped to the Files list.

### T2 — The migration (ADR 042) — after T1

- [x] **Goal:** the dev database moves to the ledger with history intact.
- **Files:** one new alembic revision.
- **Details:** Upgrade: create `mastery_log` (columns/indexes per contract), populate it by replaying `review_log` through the app's strategy — import and call the T1 rebuild logic against the migration's connection (the repo's backfill-migration precedent, `cde8b1c9da00`) — then drop `card_field_mastery`. Downgrade: recreate `card_field_mastery`, populate it from each (card, field)'s max-id ledger row via plain SQL (`DISTINCT ON` — no strategy math), drop `mastery_log`. Accepted coupling: the upgrade imports app code as of this revision; note it in the migration docstring.
- **Out of scope:** anything beyond the one revision; data checks outside Done-when.
- **Done when:** on a copy of the dev DB — `alembic upgrade head` succeeds; latest ledger row per (card, field) matches the old `card_field_mastery` values exactly (verify by SQL before/after, noted in Notes); downgrade then upgrade round-trips; CI (009 T1) green on the PR.
- Notes: Revision `795ede6a41c4`. Generated via `alembic revision --autogenerate` against a scratch copy of the dev DB (`pg_dump`/`psql`, not `createdb ... TEMPLATE`, since the live dev DB had other idle connections), then hand-edited to insert the `rebuild_mastery` call and the downgrade's `DISTINCT ON` backfill per contract. Verified on that scratch copy, not the live dev DB (see below): `alembic upgrade head` succeeded; a `card_field_mastery` snapshot taken before the upgrade matched `mastery_log`'s latest-row-per-pair exactly on all 98 (card, field) pairs and every column, including `updated_at`/`reviewed_at` (the old column's `now()` server_default never actually fired on the live write path — the app always supplied `reviewed_at` explicitly — so this is a legitimate exact match, not a coincidence); downgrade recreated `card_field_mastery` byte-identical to that same snapshot; re-upgrading after the downgrade reproduced `mastery_log` byte-identical again (full round trip). Also ran the complete chain from an empty database (base → head, then head → base → head), matching CI's own check, plus `alembic check` for zero drift against current `SQLModel.metadata` — both clean. Did not open a PR from this session, so "CI green on the PR" itself is unverified; everything CI's alembic-chain step checks was reproduced locally and passed. **Environment note, not part of this task's diff:** the live local dev database (`flashy`) already has an empty `mastery_log` table that `app/main.py`'s `init_db()` (`create_all`) silently created during a prior `fastapi dev` run against T1's already-changed models, while `card_field_mastery` (98 real rows) and `alembic_version` (still at the pre-T2 head) are untouched — so a real `alembic upgrade head` against `flashy` itself will fail on `CREATE TABLE mastery_log` until that stray empty table is dropped by hand first. Left the live dev DB untouched pending confirmation; all verification above ran against disposable copies instead.

### T3 — Breakdown deltas, backend (ADR 043, ADR 044) — after T1, parallel-safe with T2

- [ ] **Goal:** the breakdown payload carries card and field mastery/deltas per the delta-semantics contract.
- **Files:** `app/models/practice_card.py`, `app/database_ops/mastery_log.py` (the attribution/bound fetches), `app/services/practice_run.py` (`get_practice_run_breakdown`), `tests/conftest.py` (a statement-counting fixture over the module-level test `engine`, via SQLAlchemy's `before_cursor_execute` event), `tests/api_tests/test_practice_run.py`, `frontend/src/api/practice_run.ts` (touch only if exports change), regenerated API files.
- **Details:** Per the delta-semantics and API contracts. Per MD-4, the number of statements the breakdown issues against `mastery_log` is fixed — it must not grow with the run's card count or the decks' active-field count. R's attributed rows are one statement (`ix_mastery_log_run`); the per-pair before-lookup is one statement carrying every pair's own bound — a `LATERAL` subquery over a `VALUES` list of `(card_id, field_def_id, bound)`, or `DISTINCT ON` joined to that bounds relation; either is acceptable, a loop issuing one statement per pair is not. Each before-lookup is an index-bounded `id < bound ORDER BY id DESC LIMIT 1` probe on `ix_mastery_log_card_field`, never a scan of a pair's full history. Buckets, attempts, ordering, and every pre-existing field are byte-identical.
- **Out of scope:** any UI; sorting server-side; exposing before-values as separate fields (delta and after only).
- **Done when:** tests cover — a run where one card's field goes from unreviewed to rated (delta vs the 50 prior); a card with an untouched active field showing that field at delta 0 while the card fold dilutes accordingly (ADR 043); a field touched by a _different_ run between this run's rows contributing only this run's own movement (per-field bound); a deleted-run attribution (`practice_run_id` null) yielding delta 0 rather than an error; `fields` ordered by position; per MD-4, a statement-count test: the counter counts statements whose compiled SQL names `mastery_log`, is reset immediately before the `GET .../breakdown` request and read immediately after it, and reports the same nonzero count for two completed runs that differ in both dimensions — one card on the two-field `existing_field_defs` deck (the shape `TestBreakdown._setup_deck` + `_make_card` already build) and three cards on the eight-field `session_fields` deck (`session_cards` + `session_config`); existing breakdown tests unmodified; `pytest` + `npm run gen:api` clean.
- Notes:

### T4 — Breakdown UI: ranked list (ADR 044, MD-1, MD-2) — after T3

- [ ] **Goal:** the breakdown renders as one delta-ranked list with badges, and the detail sheet shows per-field mastery/deltas.
- **Files:** `frontend/src/components/practice/RunBreakdown.tsx` + `.test.tsx`; `frontend/src/pages/PracticeRunPage.test.tsx` / `frontend/src/pages/PracticeDetailsPage.test.tsx` only if selectors need adjusting.
- **Details:** Per the frontend contract. The tab markup, the per-bucket empty-state message, and the nonzero-default-tab logic are removed with the tabs; rows render in the selected sort order per MD-1. Number formatting per MD-2 (`Math.round`; the sign rendered from the rounded value, `±0` at zero).
- **Out of scope:** filtering by badge/bucket; server round trips on sort change (all data is present); animating reorder; any change to `BottomSheet`, `RatingBadge`, or attempt rendering beyond adding the Fields section.
- **Done when:** tests cover — default order is delta descending on a fixture with distinct known deltas; each sort option reorders correctly; a row shows badge label, rounded mastery, and `+N`/`−N`/`±0` rendering (one case each); `—` for a never-reviewed field in the sheet's Fields section; the counts line persists; `npx vitest run`, `npm run lint`, `npm run build` clean; dev-server screenshot check of both call sites noted in Notes.
- Notes:
