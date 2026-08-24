# Flashy Schema Rewrite — Execution Plan

## How to use this document

Execute **one phase per session**. Do not run ahead. At the end of each phase, stop and report against the acceptance criteria; wait for confirmation before starting the next.

The database is empty. There is no data to preserve and no backward compatibility to maintain. Prefer the correct shape over the compatible one, always.

Work on branch `refactor/schema-rewrite`. Commit at each phase boundary with the message given in the phase.

---

## Non-negotiable invariants

These are decisions already made after long deliberation. Do not "improve" them without asking. If an implementation seems to require breaking one, stop and raise it.

1. **`field_def` is the only source of truth for what a field is.** Names are display-only. Every reference to a field anywhere is `field_def.id` (uuid), never a name string.
2. **`card_field_mastery` is a disposable cache**, fully rebuildable from `review_log`. Nothing may be true of mastery that isn't derivable from the log.
3. **`review_log` is append-only.** No UPDATE, no DELETE, ever. Not in application code, not in tests, not in fixtures.
4. **Mastery rows are created lazily** — only on first review of a (card, field). Any query that needs "all fields of this card" must drive from `field_def` and LEFT JOIN mastery. Driving a query _from_ `card_field_mastery` is a bug.
5. **Config snapshots are immutable.** `practice_deck` holds a copy of the config taken at session start. Editing or deleting a `deck_practice_config` must never affect a session.
6. **Field deletion is archival** (`archived_at`), not destruction. Hard delete only when values, mastery, config references, and review logs are all empty.
7. **Ownership is enforced in the query**, not in Python after the fetch. Every repository function that reads user data takes `user_id` as a parameter.
8. **Mastery arithmetic exists only inside `MasteryStrategy` implementations.** SQL fetches state; Python computes. No blending, scoring, or aggregation expressions in any SQL string, SQLModel expression, or trigger — anywhere, in any phase.

---

## Naming corrections applied

- The user table is `app_user`, not `user` (`user` is reserved in Postgres).
- `field_def.type`, `practice_card.status`, `practice_session.status` are Python enums backed by CHECK constraints, not free strings.

---

## Phase 0 — Reset

**Goal:** empty the domain layer so nothing old constrains the new shape.

- Delete all SQLModel model files for domain entities.
- Delete every file in `alembic/versions/`.
- Delete all domain test files; keep conftest/fixtures/test-DB setup; record old test scenarios in a scratch list for re-coverage
- Delete routers, pydantic schemas
- Keep: `alembic/env.py` (verify the naming-convention config survives), DB session/engine setup, pydantic-settings config, CORS/Vite proxy, Vitest/MSW harness, AGENTS.md, ADRs.
- Drop and recreate the local database.

**Acceptance:** app imports and starts with no domain routes registered; `alembic/versions/` is empty; `alembic upgrade head` succeeds against a fresh empty database.

**Commit:** `chore: delete domain models and migrations for schema rewrite`

---

## Phase 1 — Identity and content entities

**Tables:** `app_user`, `subject`, `deck`, `field_def`, `card`, `card_field_value`

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
- `clerk_user_id` is nullable-free but unused this phase — no auth wiring yet.

**Constraints:**

- `UNIQUE (user_id, name)` on `subject`
- `UNIQUE (subject_id, name)` on `deck`
- `UNIQUE (deck_id, name) WHERE archived_at IS NULL` on `field_def` (partial index)
- `UNIQUE (deck_id, position)` on `field_def`
- `card_field_value` FKs to both `card` and `field_def`: `ON DELETE CASCADE`
- All timestamps `timestamptz`

**Also build:** CRUD for subject/deck/field_def/card + values. Card creation writes N `card_field_value` rows in one transaction. Card reads use `selectinload` on values.

**Field lifecycle rules to implement now:**

- Rename and reorder: unrestricted.
- Type change: **restrict** — return 4xx, no exceptions.
- Delete: set `archived_at`. Do _not_ touch values, mastery, or configs.
- Hard delete: permitted only when zero `card_field_value`, zero `card_field_mastery`, zero `review_log`, and zero references in any of the six `uuid[]` arrays across all `deck_practice_config` rows for that deck. All six arrays — do not check only two.
- Archived fields are excluded from: new config creation, deck field editing, card create/edit forms, and newly generated practice_card prompts/answers. They are **not** removed from existing practice_cards.

**Acceptance:** one autogenerated Alembic revision; `alembic upgrade head` then `alembic check` reports no drift; tests cover archive-then-recreate-same-name (must succeed) and type-change (must fail).

**Commit:** `feat: field_def, card, card_field_value with archival semantics`

---

## Phase 2 — Review log

**Table:** `review_log` — build this _before_ mastery, so mastery has an oracle from day one.

```
review_log(id uuid PK, user_id FK→app_user, card_id FK→card,
           practice_card_id FK→practice_card NULL, field_def_id FK→field_def,
           review_group_id uuid NOT NULL, rating smallint,
           shown_prompt_ids uuid[], reviewed_at timestamptz)
```

`practice_card_id` is nullable and FK'd forward — add the constraint in Phase 4 when the table exists, or create the column now and the FK later. `review_group_id` is the durable appearance identifier; grouping must never depend on `practice_card_id`.

One row per **rated answer field**. There is no `direction` column: the prompt side is recorded entirely by `shown_prompt_ids`.

**Constraints and indexes:**

- `CHECK (rating BETWEEN 1 AND 4)`
- `UNIQUE (review_group_id, field_def_id)` — the idempotency key
- index `(card_id, reviewed_at)` — FSRS replay
- index `(review_group_id)` — appearance grouping
- index `(card_id, field_def_id)` — mastery rebuild

**Acceptance:** inserting the same (review_group_id, field_def_id) twice with `ON CONFLICT DO NOTHING` produces exactly one row and does not error.

**Commit:** `feat: append-only review_log`

---

## Phase 3 — Mastery

**Table:** `card_field_mastery(card_id, field_def_id, prompt_mastery real, answer_mastery real, prompt_review_count int, answer_review_count int, updated_at, PK(card_id, field_def_id))`, FKs `ON DELETE CASCADE`.

**The database stores mastery state; it never computes it.** No SQL-side blending, no aggregate expressions, no triggers. Postgres holds rows; all arithmetic — the update rule, the per-field score, the per-card aggregate — lives in one Python module behind a strategy interface. If a query in any later phase contains mastery arithmetic, that is a bug (invariant 8).

**Strategy interface** (`app/mastery/strategy.py` or similar):

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

**Default strategy: `EmaStrategy`.** Its constants live on the strategy (or its config), not in a shared constants module — `MASTERY_PRIOR`, `EMA_ALPHA`, and the rating → normalized score mapping (1→0, 2→33, 3→67, 4→100 unless changed). No other module may import these; consumers go through the strategy.

**Strategy selection:** one place constructs the active strategy (settings-driven or a module-level default). Repositories and services receive it as a dependency; nothing instantiates `EmaStrategy` inline.

**Write path (per rated answer field, inside the rating transaction):**

1. `SELECT ... FOR UPDATE` the mastery rows for the rated field and all `shown_prompt_ids` for this card (some may not exist — that's the lazy case).
2. Build `ReviewEvent`s, call `strategy.apply_review` per affected (card, field) — answer-side for the rated field, prompt-side for each shown prompt id.
3. Upsert the returned states. The upsert writes _computed values_; there is no `ON CONFLICT DO UPDATE SET x = <expression>` arithmetic.

Row locks replace the atomic SQL blend. Contention is one user rating one card; this is fine. Do not "optimize" back into SQL expressions.

**Read path — `card_mastery(card_ids, field_ids=None)`:** the query fetches raw material only, still driving from `field_def` (invariant 4):

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

**Build `rebuild_mastery(strategy, user_id=None)`:** truncate (or delete-scoped) `card_field_mastery`, stream `review_log` ordered by `reviewed_at`, fold each row through `strategy.apply_review`, write the final states. Slow is fine. Because it takes the strategy as a parameter, **changing strategies is not a migration — it's a rebuild.**

**Acceptance (this is the important one):**

- The property test, parameterized over strategies (just `EmaStrategy` today): generate a random review sequence, apply it incrementally through the write path, snapshot `card_field_mastery`, run `rebuild_mastery(strategy)`, assert the two states are identical within float tolerance. This test is the reason the log exists — it must pass before Phase 4 starts.
- A purity test: `apply_review` called twice with the same inputs returns equal states (guards against hidden clock/random use).
- A grep-level check in review: no mastery arithmetic in any `.sql` string or SQLModel expression outside the raw-fetch queries above.

**Commit:** `feat: card_field_mastery behind MasteryStrategy with rebuild oracle`

---

## Phase 4.1 — Practice configuration

**Tables:**

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

All four tables land now, even though `practice_deck`/`practice_card` stay empty until 4.2 builds the code that populates them — the deferred `review_log.practice_card_id` FK needs `practice_card` to exist, and the four tables are one interlocking schema; there's no clean way to split the migration without it.

- `SessionStatus`: `active`, `completed`, `abandoned`. `PracticeCardStatus`: `pending`, `passed`, `failed`.
- `practice_session` has **no** `deck_id` and **no** `curr`. The current card is derived: `WHERE session_id = ? AND status = 'pending' ORDER BY position LIMIT 1`.
- `practice_deck` has **no** `source_config_id`. It is a self-contained snapshot.
- `UNIQUE (deck_id, name)` on `deck_practice_config`; `UNIQUE (practice_session_id, deck_id)` on `practice_deck`; `UNIQUE (practice_session_id, position)` on `practice_card`; index `(practice_session_id, status, position)`.
- Add the deferred `review_log.practice_card_id` FK here.

**Config validation** (app-level, run on template save _and_ session start):

- the four field arrays are pairwise disjoint
- every id resolves to a live `field_def` of that deck
- `prompt_pool_counts` values are within `1..len(prompt_pool_ids)`; same for answers
- at least one prompt and one answer are producible

**Also build:** CRUD for `deck_practice_config`, running the validation above on both create and update. No session-start or generation code yet — `practice_session`, `practice_deck`, and `practice_card` get their schema now and their write paths in 4.2.

**Acceptance:** one autogenerated Alembic revision covering all four tables and the `review_log.practice_card_id` FK; `alembic upgrade head` then `alembic check` reports no drift; tests cover each validation rule failing independently (overlapping arrays, an unknown or archived field id, an out-of-range pool count, zero producible prompts/answers) and a valid config succeeding.

**Commit:** `feat: practice config tables and validation`

---

## Phase 4.2 — Session generation and rating flow

**Pool resolution at generation time** — drive from the pool array via `unnest`, join `field_def` (drops archived ids left in stale configs), join `card_field_value` (drops fields this card left blank), LEFT JOIN mastery to fetch raw state rows. No ordering or scoring in SQL: score the surviving candidates in Python via `strategy.field_score` (NULL rows map to `None`), then apply the weighted low-mastery sampling. Clamp the drawn count to what survives. If zero prompts or zero answers survive for a card, skip that card rather than generating an unrenderable practice_card.

**Selection is weighted, not pure argmin.** Sample biased toward low mastery so a requeued card doesn't reliably repeat the combination it just failed. Keep the weighting in one function so it can be tuned.

**Session start:** create session → create one `practice_deck` per deck with a copied, validated config → order cards by `card_mastery` scoped to that config's field ids → generate practice_cards with sparse positions.

Ordering is a Python sort on the `CardScore` tuples returned by `card_mastery`: unseen cards first (`reviewed_field_count == 0`), then ascending mastery. The semantic — unseen material sorts first independently of the prior — is unchanged from any SQL formulation; do not reintroduce it as an `ORDER BY` expression.

**Rating submission — one explicit transaction, in this order:**

1. call `record_review_group` (Phase 3's retry-safe entry point) — logs the appearance and blends it into mastery on a genuinely new submission, or detects an exact retry and skips re-blending per invariant 2, or raises `ReviewGroupInconsistent` on a should-never-happen partial/mismatched group
2. update `practice_card.status` to `passed` / `failed`
3. if failed, insert a **new** `practice_card` row (fresh prompts/answers from current mastery, position from updated mastery). Never mutate the old row.

Wrap explicitly; do not rely on the FastAPI dependency's implicit commit.

**Position collision fallback:** on `UNIQUE (practice_session_id, position)` violation during requeue, renumber that session's pending cards with fresh spacing and retry. Build the path now; it must not be discovered in production.

**Acceptance:** integration test of a full session — start, rate, fail, requeue, verify the requeued card is a new row with a different prompt/answer combination and a position consistent with its updated mastery; the old row remains `failed`.

**Commit:** `feat: practice session generation and rating flow`

---

## Phase 5 — Auth scoping

- Wire Clerk JWT verification (JWKS, dual-token) and a FastAPI dependency returning the `app_user` row, creating it on first sight of a `clerk_user_id`.
- Every repository read/write takes `user_id`. Scope at the top of the join chain: `... JOIN deck d ON ... JOIN subject s ON ... WHERE s.user_id = :uid`. A foreign id returns 404, not 403.
- `practice_session.user_id` and `review_log.user_id` are set on write, not derived per read.

**Acceptance:** a test fixture with two users; every endpoint returns 404 for the other user's resources. No endpoint fetches then checks ownership in Python.

**Commit:** `feat: Clerk auth with query-level ownership scoping`

---

## Phase 6 — Deck copy

Single transactional function. Copy order, building id maps as you go:

1. new `deck` under target user's subject
2. new `field_def` rows with **new uuids**, preserving name/type/position → `field_map`
3. new `card` rows → `card_map`
4. new `card_field_value` rows, both ids remapped
5. selected `deck_practice_config` rows — remap every uuid inside **all six arrays** through `field_map`. The sharer chooses whether and which configs to copy.

Never copied: `card_field_mastery`, `review_log`, sessions.

**Acceptance:** copy a deck, then run config validation against the copies — every uuid in every copied config resolves to a `field_def` in the **new** deck. A single id pointing back at the source deck is a failing test.

**Commit:** `feat: deck copy with field id remapping`

---

## Phase 7 — Contract validation and frontend survey

**Context:** a full frontend rewrite follows this plan as its own execution document. This phase does **not** bring the existing UI to parity with the new API. Its outputs are the regenerated contract, one working smoke path, and a written survey that seeds the rewrite plan. Any work beyond that is waste — it will be rebuilt.

- Regenerate OpenAPI types. Let TypeScript enumerate the breakage, but treat the errors as a **reading exercise before a fixing exercise**: anywhere the generated types are awkward to consume — payloads that force client-side joins, shapes that don't match how a screen would use them, endpoints missing an obvious list/detail variant — fix the **API**, not the frontend. This is the last cheap moment to change the contract.
- Restore exactly **one end-to-end happy path** and keep it compiling and working: create subject → deck → fields → cards → run a practice session → rate → see mastery change. Ugly is fine. This is a smoke surface for the backend during the frontend rewrite, not a product.
- Everything outside that path: **stub or disconnect, do not fix.** Comment out broken routes/hooks rather than rewriting them. Do not delete components — icon picker, filter chips, modals, and deck detail layout are inventory for the rewrite, not dead code yet.
- Update MSW handlers **only** for the smoke path's endpoints. Delete handlers for endpoints that no longer exist; do not author handlers for screens that aren't wired.
- Write the survey (`docs/cc/2026-08-19-frontend-rewrite-survey.md`): per screen/feature — works against new API / broken but salvageable / rebuild from scratch; plus a list of every API awkwardness found (fixed or deliberately deferred), and capabilities the new schema enables that the current UI has no surface for (per-field mastery display, practice configs, deck copy). This document is the raw input to the frontend execution plan. **Acceptance:** `tsc` passes; the smoke path works in the browser against the local backend; MSW-backed tests for the smoke path pass; the survey exists and covers every current screen.

**Commit:** `refactor: regenerate contract, restore smoke path, survey frontend for rewrite`

---

## Phase 8 — Documentation

- ADR for this schema: field promotion, lazy mastery, the log-as-source-of-truth decision, the mastery strategy pattern (SQL stores, Python computes), config snapshotting, archival over deletion, and copy-not-share. Record the _reasoning_, not just the shape — it is invisible in the models otherwise.
- Update AGENTS.md with the new entity vocabulary so assistance stops suggesting old shapes.

**Commit:** `docs: ADR and AGENTS.md for field-based schema`

---

## Deferred — do not build

- FSRS scheduling. `review_log` is sufficient preparation; when it lands it adds one table (`fsrs_state`) and a grade derivation (`MIN(reviewed_at)` per `review_group_id`; grade 1 if any rating in the group is 1, else rounded mean).
- Share links / `shared_deck`. Phase 6's copy function is the hard part; the link table is additive.
- Materialized views for mastery. Only if a dashboard actually gets slow — note that `card_mastery` now fans out N×F rows to Python, so a whole-library dashboard is the first place this would surface.
