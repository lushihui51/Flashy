# Flashy Schema Rewrite — Execution Plan

## How to use this document

Execute **one phase per session**. Do not run ahead. At the end of each phase, stop and
report against the acceptance criteria; wait for confirmation before starting the next.

The database is empty. There is no data to preserve and no backward compatibility to
maintain. Prefer the correct shape over the compatible one, always.

Work on branch `refactor/schema-rewrite`. Commit at each phase boundary with the
message given in the phase.

---

## Non-negotiable invariants

These are decisions already made after long deliberation. Do not "improve" them without
asking. If an implementation seems to require breaking one, stop and raise it.

1. **`field_def` is the only source of truth for what a field is.** Names are display-only.
   Every reference to a field anywhere is `field_def.id` (uuid), never a name string.
2. **`card_field_mastery` is a disposable cache**, fully rebuildable from `review_log`.
   Nothing may be true of mastery that isn't derivable from the log.
3. **`review_log` is append-only.** No UPDATE, no DELETE, ever. Not in application code,
   not in tests, not in fixtures.
4. **Mastery rows are created lazily** — only on first review of a (card, field). Any query
   that needs "all fields of this card" must drive from `field_def` and LEFT JOIN mastery
   with `COALESCE(..., :prior)`. Driving a query _from_ `card_field_mastery` is a bug.
5. **Config snapshots are immutable.** `practice_deck` holds a copy of the config taken at
   session start. Editing or deleting a `deck_practice_config` must never affect a session.
6. **Field deletion is archival** (`archived_at`), not destruction. Hard delete only when
   values, mastery, config references, and review logs are all empty.
7. **Ownership is enforced in the query**, not in Python after the fetch. Every repository
   function that reads user data takes `user_id` as a parameter.

---

## Naming corrections applied

- The user table is `app_user`, not `user` (`user` is reserved in Postgres).
- `field_def.type`, `practice_card.status`, `practice_session.status` are Python enums
  backed by CHECK constraints, not free strings.

---

## Phase 0 — Reset

**Goal:** empty the domain layer so nothing old constrains the new shape.

- Delete all SQLModel model files for domain entities.
- Delete every file in `alembic/versions/`.
- Delete all domain test files; keep conftest/fixtures/test-DB setup; record old test scenarios in a scratch list for re-coverage
- Delete routers, pydantic schemas
- Keep: `alembic/env.py` (verify the naming-convention config survives), DB session/engine
  setup, pydantic-settings config, CORS/Vite proxy, Vitest/MSW harness, AGENTS.md, ADRs.
- Drop and recreate the local database.

**Acceptance:** app imports and starts with no domain routes registered; `alembic/versions/`
is empty; `alembic upgrade head` succeeds against a fresh empty database.

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

**Also build:** CRUD for subject/deck/field_def/card + values. Card creation writes N
`card_field_value` rows in one transaction. Card reads use `selectinload` on values.

**Field lifecycle rules to implement now:**

- Rename and reorder: unrestricted.
- Type change: **restrict** — return 4xx, no exceptions.
- Delete: set `archived_at`. Do _not_ touch values, mastery, or configs.
- Hard delete: permitted only when zero `card_field_value`, zero `card_field_mastery`,
  zero `review_log`, and zero references in any of the six `uuid[]` arrays across all
  `deck_practice_config` rows for that deck. All six arrays — do not check only two.
- Archived fields are excluded from: new config creation, deck field editing, card
  create/edit forms, and newly generated practice_card prompts/answers. They are **not**
  removed from existing practice_cards.

**Acceptance:** one autogenerated Alembic revision; `alembic upgrade head` then
`alembic check` reports no drift; tests cover archive-then-recreate-same-name (must
succeed) and type-change (must fail).

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

`practice_card_id` is nullable and FK'd forward — add the constraint in Phase 4 when the
table exists, or create the column now and the FK later. `review_group_id` is the durable
appearance identifier; grouping must never depend on `practice_card_id`.

One row per **rated answer field**. There is no `direction` column: the prompt side is
recorded entirely by `shown_prompt_ids`.

**Constraints and indexes:**

- `CHECK (rating BETWEEN 1 AND 4)`
- `UNIQUE (review_group_id, field_def_id)` — the idempotency key
- index `(card_id, reviewed_at)` — FSRS replay
- index `(review_group_id)` — appearance grouping
- index `(card_id, field_def_id)` — mastery rebuild

**Acceptance:** inserting the same (review_group_id, field_def_id) twice with
`ON CONFLICT DO NOTHING` produces exactly one row and does not error.

**Commit:** `feat: append-only review_log`

---

## Phase 3 — Mastery

**Table:** `card_field_mastery(card_id, field_def_id, prompt_mastery real,
answer_mastery real, prompt_review_count int, answer_review_count int, updated_at,
PK(card_id, field_def_id))`, FKs `ON DELETE CASCADE`.

**Constants in one module** — every consumer reads from here, no duplicated literals:

- `MASTERY_PRIOR` (neutral starting value)
- `EMA_ALPHA`
- rating → normalized score mapping (1→0, 2→33, 3→67, 4→100 unless changed)

**Update rule (EMA), applied per rated answer field:**

- Answer side: the rated field's `answer_mastery` blends toward the normalized rating.
- Prompt side: every id in `shown_prompt_ids` blends its `prompt_mastery` toward the same
  normalized rating.
- Both via a single `INSERT ... ON CONFLICT DO UPDATE` — the INSERT branch blends against
  `MASTERY_PRIOR`, the UPDATE branch blends against the existing column value.

**Build `rebuild_mastery(user_id=None)`:** truncate (or delete-scoped) `card_field_mastery`,
replay `review_log` ordered by `reviewed_at`, apply the identical update rule. Slow is fine.

**Build `card_mastery(card_ids, field_ids=None)`** as a read-time aggregate. Never store it,
never use a trigger. The query drives from `field_def`:

```sql
SELECT c.id,
       AVG(COALESCE((m.prompt_mastery + m.answer_mastery) / 2, :prior)) AS mastery,
       COUNT(m.card_id) AS reviewed_field_count
FROM card c
JOIN field_def f
  ON f.deck_id = c.deck_id
 AND f.archived_at IS NULL
 AND (:field_ids IS NULL OR f.id = ANY(:field_ids))
LEFT JOIN card_field_mastery m
  ON m.card_id = c.id AND m.field_def_id = f.id
WHERE c.id = ANY(:card_ids)
GROUP BY c.id
```

`deck_mastery` is the same query grouped by `deck_id`, display-only.

**Acceptance (this is the important one):** a property test that generates a random review
sequence, applies it incrementally, snapshots `card_field_mastery`, runs `rebuild_mastery()`,
and asserts the two states are identical within float tolerance. This test is the reason the
log exists — it must pass before Phase 4 starts.

**Commit:** `feat: card_field_mastery with EMA updates and rebuild oracle`

---

## Phase 4 — Practice configuration and sessions

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

- `SessionStatus`: `active`, `completed`, `abandoned`. `PracticeCardStatus`: `pending`,
  `passed`, `failed`.
- `practice_session` has **no** `deck_id` and **no** `curr`. The current card is derived:
  `WHERE session_id = ? AND status = 'pending' ORDER BY position LIMIT 1`.
- `practice_deck` has **no** `source_config_id`. It is a self-contained snapshot.
- `UNIQUE (deck_id, name)` on `deck_practice_config`;
  `UNIQUE (practice_session_id, deck_id)` on `practice_deck`;
  `UNIQUE (practice_session_id, position)` on `practice_card`;
  index `(practice_session_id, status, position)`.
- Add the deferred `review_log.practice_card_id` FK here.

**Config validation** (app-level, run on template save _and_ session start):

- the four field arrays are pairwise disjoint
- every id resolves to a live `field_def` of that deck
- `prompt_pool_counts` values are within `1..len(prompt_pool_ids)`; same for answers
- at least one prompt and one answer are producible

**Pool resolution at generation time** — drive from the pool array via `unnest`, join
`field_def` (drops archived ids left in stale configs), join `card_field_value` (drops
fields this card left blank), LEFT JOIN mastery with COALESCE, order ascending, limit.
Clamp the drawn count to what survives. If zero prompts or zero answers survive for a
card, skip that card rather than generating an unrenderable practice_card.

**Selection is weighted, not pure argmin.** Sample biased toward low mastery so a requeued
card doesn't reliably repeat the combination it just failed. Keep the weighting in one
function so it can be tuned.

**Session start:** create session → create one `practice_deck` per deck with a copied,
validated config → order cards by `card_mastery` scoped to that config's field ids →
generate practice_cards with sparse positions.

Ordering key: `ORDER BY (reviewed_field_count = 0) DESC, mastery ASC` so unseen material
sorts first independently of `MASTERY_PRIOR`.

**Rating submission — one explicit transaction, in this order:**

1. insert `review_log` rows with `ON CONFLICT DO NOTHING`
2. upsert `card_field_mastery` (answer field + all `shown_prompt_ids`)
3. update `practice_card.status` to `passed` / `failed`
4. if failed, insert a **new** `practice_card` row (fresh prompts/answers from current
   mastery, position from updated mastery). Never mutate the old row.

Wrap explicitly; do not rely on the FastAPI dependency's implicit commit.

**Position collision fallback:** on `UNIQUE (practice_session_id, position)` violation
during requeue, renumber that session's pending cards with fresh spacing and retry. Build
the path now; it must not be discovered in production.

**Acceptance:** integration test of a full session — start, rate, fail, requeue, verify the
requeued card is a new row with a different prompt/answer combination and a position
consistent with its updated mastery; the old row remains `failed`.

**Commit:** `feat: practice sessions, config snapshots, and rating flow`

---

## Phase 5 — Auth scoping

- Wire Clerk JWT verification (JWKS, dual-token) and a FastAPI dependency returning the
  `app_user` row, creating it on first sight of a `clerk_user_id`.
- Every repository read/write takes `user_id`. Scope at the top of the join chain:
  `... JOIN deck d ON ... JOIN subject s ON ... WHERE s.user_id = :uid`. A foreign id
  returns 404, not 403.
- `practice_session.user_id` and `review_log.user_id` are set on write, not derived per read.

**Acceptance:** a test fixture with two users; every endpoint returns 404 for the other
user's resources. No endpoint fetches then checks ownership in Python.

**Commit:** `feat: Clerk auth with query-level ownership scoping`

---

## Phase 6 — Deck copy

Single transactional function. Copy order, building id maps as you go:

1. new `deck` under target user's subject
2. new `field_def` rows with **new uuids**, preserving name/type/position → `field_map`
3. new `card` rows → `card_map`
4. new `card_field_value` rows, both ids remapped
5. selected `deck_practice_config` rows — remap every uuid inside **all six arrays**
   through `field_map`. The sharer chooses whether and which configs to copy.

Never copied: `card_field_mastery`, `review_log`, sessions.

**Acceptance:** copy a deck, then run config validation against the copies — every uuid in
every copied config resolves to a `field_def` in the **new** deck. A single id pointing back
at the source deck is a failing test.

**Commit:** `feat: deck copy with field id remapping`

---

## Phase 7 — Frontend reconciliation

- Regenerate OpenAPI types; let TypeScript enumerate the breakage.
- Rewrite query hooks and form shapes for the new entities.
- Do **not** preemptively delete components — icon picker, filter chips, modals, and deck
  detail layout are mostly unaffected.
- Update MSW handlers to the new payloads.

**Commit:** `refactor: frontend to field-based API`

---

## Phase 8 — Documentation

- ADR for this schema: field promotion, lazy mastery, the log-as-source-of-truth decision,
  config snapshotting, archival over deletion, and copy-not-share. Record the _reasoning_,
  not just the shape — it is invisible in the models otherwise.
- Update AGENTS.md with the new entity vocabulary so assistance stops suggesting old shapes.

**Commit:** `docs: ADR and AGENTS.md for field-based schema`

---

## Deferred — do not build

- FSRS scheduling. `review_log` is sufficient preparation; when it lands it adds one table
  (`fsrs_state`) and a grade derivation (`MIN(reviewed_at)` per `review_group_id`; grade 1
  if any rating in the group is 1, else rounded mean).
- Share links / `shared_deck`. Phase 6's copy function is the hard part; the link table is
  additive.
- Materialized views for mastery. Only if a dashboard actually gets slow.
