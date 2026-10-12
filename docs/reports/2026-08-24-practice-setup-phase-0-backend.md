# Practice setup, Phase 0 — backend verification and gap-fill

- **Date:** 2026-08-24
- **Prompted by:** `docs/plans/004-frontend-rebuild-practice-setup.md`, Phase 0 — verify what
  Phase 4.1/4.2 shipped and close the API gaps the practice UI needs, before any of it is
  written.
- **Outcome:** gaps closed in code (one Alembic revision, two list endpoints, a structured
  session-start error), plus one invariant conflict found and **fixed in the same phase** on
  the author's instruction — see "Fixed: a config could start a cardless session".

## Verification findings

### `deck_practice_config` CRUD — complete, validation runs on both writes

`app/routers/api/deck_practice_config.py` has create (201), get, list, PATCH, DELETE (204).
Validation runs on create and on update, and the update path validates the **merged**
config rather than just the patched keys (`app/routers/api/deck_practice_config.py:95-105`) —
pairwise-disjointness only means anything across the whole set of six arrays. Duplicate
`(deck_id, name)` surfaces as a 400 with a human message, raised from the IntegrityError in
`app/database_ops/deck_practice_config.py:11-22`, so Phase 2's inline duplicate-name error
has something to render.

### Session start — shape, and what it returns on a stale config

`POST /api/practice_sessions` takes `{name, deck_practice_config_ids}` and returns the
session. It re-validates every config and snapshots one `practice_deck` per config inside
the same transaction as the generated `practice_card`s
(`app/services/practice_session.py:83-189`) — create really is start, per plan invariant 2.

Before this phase the three failure modes all collapsed into a bare `detail` string, which
the creation page cannot attribute to a row when several configs are selected at once. They
now raise `SessionStartError` (`app/services/practice_session.py:50-71`) and the router
serializes `{code, message, config_id}` as `detail`
(`app/routers/api/practice_session.py:43-47`):

| `code` | HTTP | when |
| --- | --- | --- |
| `config_not_found` | 404 | an id in the payload isn't the user's, or doesn't exist |
| `duplicate_deck` | 400 | two selected configs name the same deck (`config_id` is the second one) |
| `stale_config` | 400 | a config no longer validates — e.g. a field it references was archived after it was saved |

`frontend/src/api/unwrap.ts` learned to read `detail.message`, so callers that don't care
about the code still throw a readable error.

### Pool-count semantics at generation time — **one count is drawn per card, per side**

`app/services/practice_generation.py:73-76`: `count = rng.choice(pool_counts)`, then the
weighted low-mastery sample draws that many surviving fields, clamped to how many actually
survive. So `prompt_pool_counts = [1, 3]` does not mean "1 then 3" or "between 1 and 3" — it
means **each generated card independently picks one of the listed counts, uniformly at
random**, and cards in the same session will differ. That is the sentence the builder's
frequency help text has to convey (Phase 2): the checked numbers are the allowed sizes of
the pool draw, chosen fresh per card.

### Session list — did not exist; there is no pagination anywhere

There was no list endpoint at all, and no keyset pagination exists for sessions or for any
other list in this codebase (the only `LIMIT` is `db_read_current_practice_card`'s
`LIMIT 1`). Prior memory saying otherwise was wrong. The new endpoint returns the full list;
at current data volumes that is fine, and adding a cursor later is additive.

### Deck fields for the builder — already there, no change needed

`GET /api/decks/{deck_id}` returns `field_defs` as `{id, name, type, position}`, active
fields only, position-ordered (`app/routers/api/deck.py:29-58`, filtered in
`app/database_ops/field_def.py:24-36`); archived fields are already excluded and covered by a
test (`tests/api_tests/test_decks.py:75`). `GET /api/decks/{deck_id}/fields` is the narrower
alternative and takes `include_archived` (default false). Plan invariant 5 needs no new code.

## Built

1. **`practice_session.name`** — `alembic/versions/5507dcc945a5_practice_session_name.py`.
   Added nullable, backfilled pre-existing rows with `'Untitled practice'`, then set NOT
   NULL; no server default, since every insert supplies one. The backfill is deliberately a
   placeholder and not a date: rendering a date would mean picking a timezone, which the
   server does not do (ADR 019). The client formats the name — the server stores the string
   verbatim and never derives it (`app/models/practice_session.py:28-32`).
2. **`GET /api/practice_sessions`** (`app/routers/api/practice_session.py:50-61`) — newest
   first, each row carrying `decks: [{deck_id, deck_name, subject_id, subject_name}]`, with
   optional `subject_id` / `deck_id` filters. Two queries total regardless of session count
   (`app/database_ops/practice_session.py:35-104`), the same shape as
   `db_read_decks_with_summary`. Filtering is an EXISTS over `practice_deck → deck`, which is
   the only relation between a session and a subject/deck — schema invariant 5 leaves no
   config lineage to filter on. The join to `deck` is inner, so a snapshot whose deck was
   since deleted (`deck_id` NULL, ADR 015) contributes no chip and matches no filter, while
   the session itself still lists.
3. **`GET /api/deck_practice_configs`** now takes `subject_id` and `deck_id`, both optional
   (`deck_id` used to be required), and returns `DeckPracticeConfigSummary` — the config plus
   `deck_name, subject_id, subject_name`, ordered subject → deck → config name. Two decks in
   different subjects can share a name, so the subject has to travel with the row.
4. **Structured session-start errors**, as above.
5. **Types regenerated** (`npm run gen:api`); `readPracticeSessions` and a filter-taking
   `readDeckPracticeConfigs` added to the api layer.

## Fixed: a config could start a cardless session (plan invariant 2)

`validate_deck_practice_config` accepted a config whose pool had ids but an **empty** counts
array — the range check `1 <= count <= len(pool_ids)` iterates an empty list, and the
producibility rule only asked that `prompt_pool_ids` be non-empty. At generation time that
config drew `count = 0` fields, every card resolved to zero prompts and was skipped, and the
session was created with **no `practice_card` rows at all**. Verified against the running
API before the fix: the config saved 201, the session started 201, and the first
`current_card` read 404d and flipped the session straight to `abandoned` — exactly the state
plan invariant 2 forbids.

`validate_deck_practice_config` now rejects a non-empty `*_pool_ids` with an empty
`*_pool_counts` (`app/services/deck_practice_config.py:64-72`). Because that function is the
single choke point for all three write paths, config create, config update, and session start
are all covered by the one rule; each is asserted independently, including a config inserted
directly into the table to stand in for a row saved before the rule existed
(`tests/api_tests/test_practice_session.py:496-527`).

The narrowing was safe to apply immediately: the database held no `deck_practice_config`,
`practice_deck`, or `practice_session` rows, so no saved config was invalidated.

Phase 2's client-side rule ("a pool row with fields but zero checked counts is invalid") is
now a genuine mirror of the backend rather than a stricter rule of its own, which is how that
phase's validation section reads it.

## Acceptance

- One Alembic revision; `alembic upgrade head` applied; `alembic check` reports no drift.
- `pytest`: 225 passed. New coverage: session list ordering/name/deck context, subject
  filter, deck filter (against two same-named decks in different subjects, via the new
  `multi_subject_library` fixture in `tests/conftest.py:137-191`), AND-composition, and the
  other-user-sees-nothing check for both list endpoints; all three session-start error codes
  asserted with their `config_id`; the uncounted-pool rule asserted at create, update, and
  session start.
- Frontend: `npx vitest run` 296 passed, `npm run lint` clean, `npm run build` (tsc + bundle)
  clean.
