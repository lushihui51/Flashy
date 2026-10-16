# 011 — Alembic is the only schema path

The lifespan cleanup from the 2026-09-14 /plan session: `app/main.py`'s startup `create_all` goes away, so no persistent database ever changes shape except through `alembic upgrade`. Branch: `fix/alembic-only-schema`, after 010 T2's revision `795ede6a41c4` is on the checkout (the rollout step below applies it).

## ADRs

Decisions this file implements; full context and rejected alternatives live in the ADRs.

- **ADR 045 — Alembic is the only schema path; the app never creates tables on startup**: `app/main.py`'s startup `create_all` (which also ran on every pytest run against the dev database, via `TestClient(app)`'s lifespan) is removed along with `init_db`/`reset_db`; `alembic upgrade` is the only way any persistent database's schema changes, `create_all` survives only in `tests/conftest.py` against the disposable test database, and a source-scan test enforces it.

## Minor decisions

None this cycle.

## Contracts

### `app/database.py` public surface (ADR 045)

After this cycle the module exports exactly: `engine`, `get_session`, `SessionDep`, and the private `_CONNECT_ARGS` (which `tests/conftest.py` imports). The `SQLModel.metadata.naming_convention` assignment at import time stays — `alembic/env.py` imports the module for that side effect. `init_db` and `reset_db` no longer exist.

### `app/main.py` (ADR 045)

`app = FastAPI()` with no `lifespan` argument. No code under `app/` calls `SQLModel.metadata.create_all` or `drop_all`; the guard test in T1 enforces this.

## Tasks

### T1 — Drop startup `create_all` and land the dev database on alembic head (ADR 045)

- [x] **Goal:** the app never creates or drops tables itself, a test enforces that, and the local dev database is back to a state alembic recognises.
- **Files:** `app/main.py`, `app/database.py`, `tests/api_tests/test_schema_guard.py` (new).
- **Details:** Per ADR 045. In `app/main.py`: delete the `asynccontextmanager` import, the `lifespan` function (including the commented `# reset_db()` line), and pass no `lifespan` to `FastAPI()`; the import becomes `from app.database import SessionDep` (the `/` route still uses it). In `app/database.py`: delete `init_db` and `reset_db`; nothing else changes. The new test follows the existing source-scan precedent (`test_no_mastery_arithmetic_outside_strategy` in `tests/api_tests/test_mastery.py`): walk every `.py` file under `app/` recursively and assert none contains the substring `create_all(` or `drop_all(`; on failure the message names the offending file. `tests/conftest.py` is not touched — its `init_db` fixture is its own function on the test engine, and its `client` fixture may keep entering `with TestClient(app)`. Do not edit `AGENTS.md`; the distill session picks the new rule up from this file.

  Rollout, on this machine's dev database (`DATABASE_URL`), in this order: (1) `SELECT count(*) FROM mastery_log` — if it is not `0`, stop and report; do not drop a table with rows in it. (2) `DROP TABLE mastery_log` — the empty stray table `create_all` made before 010 T2's migration existed. (3) `alembic upgrade head` — this is what actually applies 010 T2's revision `795ede6a41c4` to the dev database (010 T2 verified it only on a copy). (4) `alembic check` — must print `No new upgrade operations detected.`; if it reports anything, stop and report rather than editing models or migrations.

- **Out of scope:** any startup health/at-head check; changing `tests/conftest.py`; the `/` route or its `SessionDep` dependency; editing `AGENTS.md` (distill); any deployment or CD concern (009 MD-2).
- **Done when:** `grep -rn "create_all\|drop_all\|init_db\|reset_db\|lifespan" app/` returns zero hits; the new guard test passes and fails if `create_all(` is temporarily pasted into any file under `app/` (try it, then revert); full `pytest` clean; the four rollout steps above ran against `DATABASE_URL` with the outputs of steps (1) and (4) pasted into Notes; `\dt` on the dev database shows `mastery_log` and no `card_field_mastery`; `SELECT version_num FROM alembic_version` on the dev database prints `795ede6a41c4`.
- Notes: Rollout step (1)'s output was `count = 0` (the stray `mastery_log` was empty, safe to drop). Step (4)'s output was `No new upgrade operations detected.` (zero drift). All four steps ran in order against `DATABASE_URL` (the `flashy` dev database): dropped the stray table, ran `alembic upgrade head` (applied revision `795ede6a41c4` for real — 010 T2 had only verified it on a disposable copy — backfilling 356 `mastery_log` rows from the dev database's 250 `review_log` rows), then `alembic check` confirmed no drift. `\dt` now shows `mastery_log` and no `card_field_mastery`; `alembic_version` reads `795ede6a41c4`. Guard test scans every `.py` under `app/` recursively (not a fixed file list like `test_no_mastery_arithmetic_outside_strategy`'s), per the task's own spec; verified it fails when `create_all(` is injected into an arbitrary file (`app/config.py`, then reverted) before confirming it passes clean. Full `pytest`: 276 passed (275 + this task's new test).
