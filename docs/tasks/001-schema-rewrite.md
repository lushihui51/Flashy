# 001 — Schema rewrite

Covers the full backend schema rewrite: field-based cards, the append-only review log, mastery behind a strategy interface, practice configuration with immutable snapshots, auth scoping, deck copy, and the contract-validation pass that seeded the frontend rebuild.

Branch: `refactor/schema-rewrite`, merged via PR #10. **Status: every task below is executed.** This file is the pre-workflow phase plan reformatted into the standard task-file structure (2026-08-25); content is unchanged, only presentation. The original wording is in git history as `docs/plans/001-schema-rewrite.md`.

Execution protocol (as run): one task per session, in order, never running ahead; at the end of each task, stop and report against "Done when" and wait for confirmation. The database was empty — no data to preserve, no backward compatibility to maintain; the correct shape was always preferred over the compatible one. Commits at each task boundary with the message given in the task.

## ADRs

Recorded by T10 (commit `b701fb1`) plus later amendments. The invariants these ADRs record are restated in full under Contracts, because every task references them.

- **ADR 009 — `field_def` as the sole source of truth for fields** (invariant 1).
- **ADR 010 — archive fields instead of hard-deleting** (invariant 6).
- **ADR 011 — append-only `review_log` as the mastery source of truth** (invariants 2 and 3, and the build-the-log-before-mastery ordering of T3/T4).
- **ADR 012 — confine mastery arithmetic to a strategy pattern** (invariant 8: SQL fetches state, Python computes).
- **ADR 013 — snapshot practice config at session start** (invariant 5).
- **ADR 014 — copy decks before building share links** (T8).
- **ADR 008 — sparse positions for practice-card ordering** (T6's position scheme; amended by `9e9401f` to state the exact requeue-position guarantee).
- **ADR 007 — Clerk for authentication** (pre-existing; T7 wired it with query-level ownership scoping, invariant 7).

## Minor decisions

- **Naming.** The user table is `app_user`, not `user` (`user` is reserved in Postgres). `field_def.type`, `practice_card.status`, `practice_session.status` are Python enums backed by CHECK constraints, not free strings.
- **No `direction` column on `review_log`.** The prompt side is recorded entirely by `shown_prompt_ids`. One row per rated answer field.
- **`review_group_id` is the durable appearance identifier.** Grouping must never depend on `practice_card_id` (which is nullable).
- **The current card of a session is derived, not stored.** `practice_session` has no `deck_id` and no `curr`; the current card is `WHERE session_id = ? AND status = 'pending' ORDER BY position LIMIT 1`.
- **Row locks replace the atomic SQL blend** in the mastery write path. Contention is one user rating one card; this is fine. Do not "optimize" back into SQL expressions.
- **`EmaStrategy` is the default mastery strategy.** Its constants (`MASTERY_PRIOR`, `EMA_ALPHA`, the rating → normalized score mapping 1→0, 2→33, 3→67, 4→100 unless changed) live on the strategy or its config, not in a shared constants module; no other module may import them — consumers go through the strategy. One place constructs the active strategy (settings-driven or a module-level default); repositories and services receive it as a dependency; nothing instantiates `EmaStrategy` inline.
- **Practice selection is weighted, not pure argmin.** Sampling is biased toward low mastery so a requeued card doesn't reliably repeat the combination it just failed. The weighting lives in one function so it can be tuned.
- **Changing strategies is a rebuild, not a migration** — `rebuild_mastery` takes the strategy as a parameter.
- **A foreign id returns 404, not 403.**
- **`practice_session.user_id` and `review_log.user_id` are set on write**, not derived per read.

## Contracts

### Non-negotiable invariants

Decisions made after long deliberation. Do not "improve" them without asking; if an implementation seems to require breaking one, stop and raise it.

1. **`field_def` is the only source of truth for what a field is.** Names are display-only. Every reference to a field anywhere is `field_def.id` (uuid), never a name string.
2. **`card_field_mastery` is a disposable cache**, fully rebuildable from `review_log`. Nothing may be true of mastery that isn't derivable from the log.
3. **`review_log` is append-only.** No UPDATE, no DELETE, ever. Not in application code, not in tests, not in fixtures.
4. **Mastery rows are created lazily** — only on first review of a (card, field). Any query that needs "all fields of this card" must drive from `field_def` and LEFT JOIN mastery. Driving a query _from_ `card_field_mastery` is a bug.
5. **Config snapshots are immutable.** `practice_deck` holds a copy of the config taken at session start. Editing or deleting a `deck_practice_config` must never affect a session.
6. **Field deletion is archival** (`archived_at`), not destruction. Hard delete only when values, mastery, config references, and review logs are all empty.
7. **Ownership is enforced in the query**, not in Python after the fetch. Every repository function that reads user data takes `user_id` as a parameter.
8. **Mastery arithmetic exists only inside `MasteryStrategy` implementations.** SQL fetches state; Python computes. No blending, scoring, or aggregation expressions in any SQL string, SQLModel expression, or trigger — anywhere, in any task.

### Schema

Identity and content (T2):

```
app_user(id uuid PK, clerk_user_id text UNIQUE NOT NULL, created_at timestamptz)
subject(id uuid PK, user_id FK→app_user, name, icon, description, created_at)
deck(id uuid PK, subject_id FK→subject, name, created_at)
field_def(id uuid PK, deck_id FK→deck, name, type FieldType, position int,
          archived_at timestamptz NULL, created_at)
card(id uuid PK, deck_id FK→deck, created_at)
card_field_value(card_id FK→card, field_def_id FK→field_def, value text,
                 PK(card_id, field_def_id))
```

- `FieldType` enum: `text`, `image`, `audio`.
- Constraints: `UNIQUE (user_id, name)` on `subject`; `UNIQUE (subject_id, name)` on `deck`; `UNIQUE (deck_id, name) WHERE archived_at IS NULL` on `field_def` (partial index); `UNIQUE (deck_id, position)` on `field_def`; `card_field_value` FKs to both `card` and `field_def` `ON DELETE CASCADE`; all timestamps `timestamptz`.

Review log (T3):

```
review_log(id uuid PK, user_id FK→app_user, card_id FK→card,
           practice_card_id FK→practice_card NULL, field_def_id FK→field_def,
           review_group_id uuid NOT NULL, rating smallint,
           shown_prompt_ids uuid[], reviewed_at timestamptz)
```

- `practice_card_id` is nullable and FK'd forward — the constraint lands in T5 when `practice_card` exists (or the column now and the FK later).
- Constraints and indexes: `CHECK (rating BETWEEN 1 AND 4)`; `UNIQUE (review_group_id, field_def_id)` — the idempotency key; index `(card_id, reviewed_at)` — FSRS replay; index `(review_group_id)` — appearance grouping; index `(card_id, field_def_id)` — mastery rebuild.

Mastery (T4):

```
card_field_mastery(card_id, field_def_id, prompt_mastery real, answer_mastery real,
                   prompt_review_count int, answer_review_count int, updated_at,
                   PK(card_id, field_def_id))    -- FKs ON DELETE CASCADE
```

Practice (T5):

```
deck_practice_config(id uuid PK, deck_id FK→deck, name, created_at,
    prompt_field_ids uuid[], answer_field_ids uuid[],
    prompt_pool_ids uuid[], prompt_pool_counts int[],
    answer_pool_ids uuid[], answer_pool_counts int[])

practice_session(id uuid PK, user_id FK→app_user, status SessionStatus, created_at)

practice_deck(id uuid PK, practice_session_id FK, deck_id FK, created_at,
    <same six array columns, copied at session start>)

practice_card(id uuid PK, practice_session_id FK, card_id FK, position bigint,
    prompts uuid[], answers uuid[], status PracticeCardStatus, created_at)
```

- `SessionStatus`: `active`, `completed`, `abandoned`. `PracticeCardStatus`: `pending`, `passed`, `failed`.
- `practice_session` has **no** `deck_id` and **no** `curr` (see Minor decisions). `practice_deck` has **no** `source_config_id` — it is a self-contained snapshot (invariant 5).
- Constraints: `UNIQUE (deck_id, name)` on `deck_practice_config`; `UNIQUE (practice_session_id, deck_id)` on `practice_deck`; `UNIQUE (practice_session_id, position)` on `practice_card`; index `(practice_session_id, status, position)`.

### Field lifecycle

- Rename and reorder: unrestricted.
- Type change: **restrict** — return 4xx, no exceptions.
- Delete: set `archived_at`. Do _not_ touch values, mastery, or configs.
- Hard delete: permitted only when zero `card_field_value`, zero `card_field_mastery`, zero `review_log`, and zero references in any of the six `uuid[]` arrays across all `deck_practice_config` rows for that deck. All six arrays — do not check only two.
- Archived fields are excluded from: new config creation, deck field editing, card create/edit forms, and newly generated practice_card prompts/answers. They are **not** removed from existing practice_cards.

### Config validation

App-level, run on template save _and_ session start:

- the four field arrays are pairwise disjoint
- every id resolves to a live `field_def` of that deck
- `prompt_pool_counts` values are within `1..len(prompt_pool_ids)`; same for answers
- at least one prompt and one answer are producible

### `MasteryStrategy`

`app/mastery/strategy.py` or similar:

```python
class MasteryStrategy(Protocol):
    name: str  # persisted nowhere yet; used for logging and test parametrization

    def prior(self) -> FieldMasteryState:
        """State assumed for a (card, field) with no row. Lazy creation, invariant 4."""

    def apply_review(
        self, current: FieldMasteryState | None, event: ReviewEvent
    ) -> FieldMasteryState:
        """Pure function: (state-or-None, one review_log row) -> new state.
        Handles both the answer-side and prompt-side blend; `event` says which."""

    def field_score(self, state: FieldMasteryState | None) -> float:
        """Collapse one field's state to a scalar. None means never reviewed."""

    def card_score(self, field_scores: Sequence[float]) -> CardScore:
        """Aggregate live-field scores to (mastery, reviewed_field_count)."""
```

- `FieldMasteryState` is a frozen dataclass mirroring the table's value columns exactly (prompt/answer mastery, prompt/answer counts). The repository maps rows ↔ state dumbly; strategies never see SQLModel objects.
- `ReviewEvent` is derived from a `review_log` row: rating, the rated `field_def_id`, `shown_prompt_ids`, `reviewed_at`. Strategies consume log rows and nothing else — this is what keeps invariant 2 true.
- **Every method is pure.** No I/O, no session, no clock. This is what makes the rebuild oracle and property tests cheap.

### `card_mastery` read contract

`card_mastery(card_ids, field_ids=None)` — the query fetches raw material only, still driving from `field_def` (invariant 4):

```sql
SELECT c.id AS card_id, f.id AS field_def_id,
       m.prompt_mastery, m.answer_mastery,
       m.prompt_review_count, m.answer_review_count
FROM card c
JOIN field_def f
  ON f.deck_id = c.deck_id
 AND f.archived_at IS NULL
 AND (:field_ids IS NULL OR f.id = ANY(:field_ids))
LEFT JOIN card_field_mastery m
  ON m.card_id = c.id AND m.field_def_id = f.id
WHERE c.id = ANY(:card_ids)
```

Python groups rows by card, maps NULL mastery rows to `None`, and computes `strategy.field_score` → `strategy.card_score`. `deck_mastery` is the same fetch grouped by deck in Python, display-only. Never store either; never add a trigger.

### `rebuild_mastery(strategy, user_id=None)`

Truncate (or delete-scoped) `card_field_mastery`, stream `review_log` ordered by `reviewed_at`, fold each row through `strategy.apply_review`, write the final states. Slow is fine. Because it takes the strategy as a parameter, **changing strategies is not a migration — it's a rebuild.**

## Tasks

Strictly sequential: every task depends on all tasks before it; none are safe to run in parallel.

### T1 (Phase 0) — Reset

- [x] **Goal:** empty the domain layer so nothing old constrains the new shape.
- **Files:** delete all SQLModel model files for domain entities; every file in `alembic/versions/`; all domain test files; routers; pydantic schemas.
- **Details:** keep conftest/fixtures/test-DB setup; record old test scenarios in a scratch list for re-coverage. Drop and recreate the local database.
- **Out of scope (the keep list):** `alembic/env.py` (verify the naming-convention config survives), DB session/engine setup, pydantic-settings config, CORS/Vite proxy, Vitest/MSW harness, AGENTS.md, ADRs — kept, not deleted.
- **Done when:** app imports and starts with no domain routes registered; `alembic/versions/` is empty; `alembic upgrade head` succeeds against a fresh empty database.
- **Commit:** `chore: delete domain models and migrations for schema rewrite` (`14aae26`)
- Notes:

### T2 (Phase 1) — Identity and content entities

- [x] **Goal:** land `app_user`, `subject`, `deck`, `field_def`, `card`, `card_field_value` with their constraints, CRUD, and the field lifecycle rules.
- **Files:** SQLModel models, one autogenerated Alembic revision, CRUD routers/repository functions and tests for subject/deck/field_def/card + values — paths per repo convention.
- **Details:** schema and constraints per Contracts § Schema (identity and content). `clerk_user_id` is nullable-free but unused this task — no auth wiring yet (T7). Card creation writes N `card_field_value` rows in one transaction. Card reads use `selectinload` on values. Implement every rule in Contracts § Field lifecycle now.
- **Out of scope:** auth wiring (T7); review log (T3); any mastery or practice table.
- **Done when:** one autogenerated Alembic revision; `alembic upgrade head` then `alembic check` reports no drift; tests cover archive-then-recreate-same-name (must succeed) and type-change (must fail with 4xx).
- **Commit:** `feat: field_def, card, card_field_value with archival semantics` (`72fd089`)
- Notes:

### T3 (Phase 2) — Review log

- [x] **Goal:** build `review_log` _before_ mastery, so mastery has an oracle from day one.
- **Files:** `review_log` SQLModel model, Alembic revision, write-path code and tests — paths per repo convention.
- **Details:** schema, constraints, and indexes per Contracts § Schema (review log). One row per **rated answer field**; there is no `direction` column — the prompt side is recorded entirely by `shown_prompt_ids` (see Minor decisions). `review_group_id` is the durable appearance identifier; grouping must never depend on `practice_card_id`. The forward FK to `practice_card` is deferred to T5.
- **Out of scope:** mastery (T4); anything that reads the log.
- **Done when:** inserting the same (review_group_id, field_def_id) twice with `ON CONFLICT DO NOTHING` produces exactly one row and does not error.
- **Commit:** `feat: append-only review_log` (`787d61e`)
- Notes:

### T4 (Phase 3) — Mastery

- [x] **Goal:** land `card_field_mastery` as a disposable cache behind `MasteryStrategy`, with the rebuild oracle proving it.
- **Files:** `card_field_mastery` model + Alembic revision; `app/mastery/strategy.py` (or similar) with the strategy interface and `EmaStrategy`; the write path, `card_mastery` read path, and `rebuild_mastery`; property and purity tests — paths per repo convention.
- **Details:**
  - **The database stores mastery state; it never computes it.** No SQL-side blending, no aggregate expressions, no triggers (invariant 8). All arithmetic — the update rule, the per-field score, the per-card aggregate — lives in one Python module behind the Contracts § `MasteryStrategy` interface.
  - Default strategy `EmaStrategy`, constants confined per Minor decisions; one construction point; strategy injected as a dependency.
  - **Write path (per rated answer field, inside the rating transaction):** (1) `SELECT ... FOR UPDATE` the mastery rows for the rated field and all `shown_prompt_ids` for this card (some may not exist — that's the lazy case, invariant 4); (2) build `ReviewEvent`s, call `strategy.apply_review` per affected (card, field) — answer-side for the rated field, prompt-side for each shown prompt id; (3) upsert the returned states. The upsert writes _computed values_; there is no `ON CONFLICT DO UPDATE SET x = <expression>` arithmetic. Row locks replace the atomic SQL blend (see Minor decisions).
  - **Read path:** `card_mastery` per Contracts; `deck_mastery` is the same fetch grouped by deck in Python, display-only.
  - Build `rebuild_mastery(strategy, user_id=None)` per Contracts.
- **Out of scope:** session generation and the rating endpoint (T6); storing any aggregate; triggers.
- **Done when:**
  - The property test, parameterized over strategies (just `EmaStrategy` today), passes: generate a random review sequence, apply it incrementally through the write path, snapshot `card_field_mastery`, run `rebuild_mastery(strategy)`, assert the two states are identical within float tolerance. This test is the reason the log exists — it must pass before T5 starts.
  - A purity test passes: `apply_review` called twice with the same inputs returns equal states (guards against hidden clock/random use).
  - A grep-level check in review: no mastery arithmetic in any `.sql` string or SQLModel expression outside the raw-fetch queries in Contracts.
- **Commit:** `feat: card_field_mastery behind MasteryStrategy with rebuild oracle` (`c1df3c8`)
- Notes: post-merge fix `2d8a2dd` — breadth-weighted prompt updates and write-path idempotency (`record_review_group`, the retry-safe entry point T6 builds on).

### T5 (Phase 4.1) — Practice configuration

- [x] **Goal:** land all four practice tables and CRUD-with-validation for `deck_practice_config`.
- **Files:** the four practice SQLModel models, one Alembic revision (including the deferred `review_log.practice_card_id` FK), `deck_practice_config` CRUD and validation, tests — paths per repo convention.
- **Details:** schema per Contracts § Schema (practice). All four tables land now, even though `practice_deck`/`practice_card` stay empty until T6 builds the code that populates them — the deferred `review_log.practice_card_id` FK needs `practice_card` to exist, and the four tables are one interlocking schema; there's no clean way to split the migration without it. CRUD for `deck_practice_config` runs Contracts § Config validation on both create and update.
- **Out of scope:** session-start or generation code (T6) — `practice_session`, `practice_deck`, `practice_card` get their schema now and their write paths in T6.
- **Done when:** one autogenerated Alembic revision covering all four tables and the `review_log.practice_card_id` FK; `alembic upgrade head` then `alembic check` reports no drift; tests cover each validation rule failing independently (overlapping arrays, an unknown or archived field id, an out-of-range pool count, zero producible prompts/answers) and a valid config succeeding.
- **Commit:** `feat: practice config tables and validation` (`d81f9b3`)
- Notes: split out of a single Phase 4 by `1812891`.

### T6 (Phase 4.2) — Session generation and rating flow

- [x] **Goal:** build session start, practice-card generation, and the rating transaction, including requeue.
- **Files:** session-start and generation code, the rating endpoint, the position-collision fallback, integration tests — paths per repo convention.
- **Details:**
  - **Pool resolution at generation time:** drive from the pool array via `unnest`, join `field_def` (drops archived ids left in stale configs), join `card_field_value` (drops fields this card left blank), LEFT JOIN mastery to fetch raw state rows. No ordering or scoring in SQL: score the surviving candidates in Python via `strategy.field_score` (NULL rows map to `None`), then apply the weighted low-mastery sampling (see Minor decisions). Clamp the drawn count to what survives. If zero prompts or zero answers survive for a card, skip that card rather than generating an unrenderable practice_card.
  - **Session start:** create session → create one `practice_deck` per deck with a copied, validated config → order cards by `card_mastery` scoped to that config's field ids → generate practice_cards with sparse positions. Ordering is a Python sort on the `CardScore` tuples returned by `card_mastery`: unseen cards first (`reviewed_field_count == 0`), then ascending mastery. The semantic — unseen material sorts first independently of the prior — is unchanged from any SQL formulation; do not reintroduce it as an `ORDER BY` expression.
  - **Rating submission — one explicit transaction, in this order:** (1) call `record_review_group` (T4's retry-safe entry point) — logs the appearance and blends it into mastery on a genuinely new submission, or detects an exact retry and skips re-blending per invariant 2, or raises `ReviewGroupInconsistent` on a should-never-happen partial/mismatched group; (2) update `practice_card.status` to `passed`/`failed`; (3) if failed, insert a **new** `practice_card` row (fresh prompts/answers from current mastery, position from updated mastery). Never mutate the old row. Wrap explicitly; do not rely on the FastAPI dependency's implicit commit.
  - **Position collision fallback:** on `UNIQUE (practice_session_id, position)` violation during requeue, renumber that session's pending cards with fresh spacing and retry. Build the path now; it must not be discovered in production.
- **Out of scope:** auth (T7); any SQL-side scoring or ordering (invariant 8).
- **Done when:** integration test of a full session passes — start, rate, fail, requeue, verify the requeued card is a new row with a different prompt/answer combination and a position consistent with its updated mastery; the old row remains `failed`.
- **Commit:** `feat: practice session generation and rating flow` (`011f6ef`)
- Notes: the exact requeue-position guarantee was later pinned by test and recorded in ADR 008 (`9e9401f`).

### T7 (Phase 5) — Auth scoping

- [x] **Goal:** wire Clerk and make every read/write ownership-scoped in the query.
- **Files:** Clerk JWT verification (JWKS, dual-token) and the FastAPI dependency; every repository function; a two-user test fixture — paths per repo convention.
- **Details:** the dependency returns the `app_user` row, creating it on first sight of a `clerk_user_id`. Every repository read/write takes `user_id` (invariant 7). Scope at the top of the join chain: `... JOIN deck d ON ... JOIN subject s ON ... WHERE s.user_id = :uid`. A foreign id returns 404, not 403. `practice_session.user_id` and `review_log.user_id` are set on write, not derived per read.
- **Out of scope:** frontend auth wiring (task file 002).
- **Done when:** a test fixture with two users exists; every endpoint returns 404 for the other user's resources; no endpoint fetches then checks ownership in Python.
- **Commit:** `feat: Clerk auth with query-level ownership scoping` (`68338b5`)
- Notes:

### T8 (Phase 6) — Deck copy

- [x] **Goal:** one transactional deck-copy function with full field-id remapping.
- **Files:** the copy function and its tests — paths per repo convention.
- **Details:** copy order, building id maps as you go: (1) new `deck` under target user's subject; (2) new `field_def` rows with **new uuids**, preserving name/type/position → `field_map`; (3) new `card` rows → `card_map`; (4) new `card_field_value` rows, both ids remapped; (5) selected `deck_practice_config` rows — remap every uuid inside **all six arrays** through `field_map`. The sharer chooses whether and which configs to copy. Never copied: `card_field_mastery`, `review_log`, sessions.
- **Out of scope:** share links / `shared_deck` (see Deferred).
- **Done when:** copy a deck, then run config validation against the copies — every uuid in every copied config resolves to a `field_def` in the **new** deck. A single id pointing back at the source deck is a failing test.
- **Commit:** `feat: deck copy with field id remapping` (`c38e2f8`)
- Notes:

### T9 (Phase 7) — Contract validation and frontend survey

- [x] **Goal:** regenerate the contract, restore exactly one end-to-end smoke path, and write the survey that seeds the frontend rewrite — nothing more.
- **Files:** regenerated OpenAPI types; the smoke path's screens/hooks; MSW handlers for the smoke path's endpoints only; `docs/cc/2026-08-19-frontend-rewrite-survey.md`.
- **Details:** a full frontend rewrite follows this plan as its own execution document (task files 002/003). This task does **not** bring the existing UI to parity with the new API; its outputs are the regenerated contract, one working smoke path, and a written survey. Any work beyond that is waste — it will be rebuilt.
  - Regenerate OpenAPI types. Let TypeScript enumerate the breakage, but treat the errors as a **reading exercise before a fixing exercise**: anywhere the generated types are awkward to consume — payloads that force client-side joins, shapes that don't match how a screen would use them, endpoints missing an obvious list/detail variant — fix the **API**, not the frontend. This is the last cheap moment to change the contract.
  - Restore exactly **one end-to-end happy path** and keep it compiling and working: create subject → deck → fields → cards → run a practice session → rate → see mastery change. Ugly is fine. This is a smoke surface for the backend during the frontend rewrite, not a product.
  - Everything outside that path: **stub or disconnect, do not fix.** Comment out broken routes/hooks rather than rewriting them. Do not delete components — icon picker, filter chips, modals, and deck detail layout are inventory for the rewrite, not dead code yet.
  - Update MSW handlers **only** for the smoke path's endpoints. Delete handlers for endpoints that no longer exist; do not author handlers for screens that aren't wired.
  - The survey covers, per screen/feature: works against new API / broken but salvageable / rebuild from scratch; plus a list of every API awkwardness found (fixed or deliberately deferred), and capabilities the new schema enables that the current UI has no surface for (per-field mastery display, practice configs, deck copy). This document is the raw input to the frontend execution plan.
- **Out of scope:** fixing any screen outside the smoke path; deleting salvageable components; parity work of any kind.
- **Done when:** `tsc` passes; the smoke path works in the browser against the local backend; MSW-backed tests for the smoke path pass; the survey exists and covers every current screen.
- **Commit:** `refactor: regenerate contract, restore smoke path, survey frontend for rewrite` (`86e53b5`)
- Notes: the survey was migrated into the `docs/cc/` convention by `5d8db2d`.

### T10 (Phase 8) — Documentation

- [x] **Goal:** record the schema's reasoning as ADRs and update AGENTS.md so assistance stops suggesting old shapes.
- **Files:** `docs/adr/` (field promotion, lazy mastery, log-as-source-of-truth, the mastery strategy pattern — SQL stores, Python computes —, config snapshotting, archival over deletion, copy-not-share), `AGENTS.md` (new entity vocabulary).
- **Details:** record the _reasoning_, not just the shape — it is invisible in the models otherwise. See the ADRs section above for what landed.
- **Out of scope:** any code change.
- **Done when:** the ADRs listed above exist; AGENTS.md carries the new entity vocabulary.
- **Commit:** `docs: ADR and AGENTS.md for field-based schema` (`b701fb1`)
- Notes:

## Deferred — do not build

- FSRS scheduling. `review_log` is sufficient preparation; when it lands it adds one table (`fsrs_state`) and a grade derivation (`MIN(reviewed_at)` per `review_group_id`; grade 1 if any rating in the group is 1, else rounded mean).
- Share links / `shared_deck`. T8's copy function is the hard part; the link table is additive.
- Materialized views for mastery. Only if a dashboard actually gets slow — note that `card_mastery` now fans out N×F rows to Python, so a whole-library dashboard is the first place this would surface.
