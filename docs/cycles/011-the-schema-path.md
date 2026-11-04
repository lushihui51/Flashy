# 011 — The schema path

## Goal

Outcome: `app/main.py`'s startup `create_all` goes away, so no persistent database ever changes shape except through `alembic upgrade`.

Scope: The startup `create_all` in `app/main.py`, `init_db` and `reset_db` in `app/database.py`, a source-scan guard test, and landing the local dev database on alembic head. Not covered: any startup health or at-head check, `tests/conftest.py`, and any deployment or CD concern.

Judgement: None.

## Records

- ADR 045: Alembic as the only schema path

## Tasks

### T1 — Drop startup `create_all` and land the dev database on alembic head

**Status**

- [x]

**Goal**

The app never creates or drops tables itself, a test enforces that, and the local dev database is back to a state alembic recognises.

**Dependencies**

None.

**Files**

- `app/main.py`
- `app/database.py`
- `tests/api_tests/test_schema_guard.py` (new)

**Details**

Per ADR 045.

After this task `app/database.py` must export exactly: `engine`, `get_session`, `SessionDep`, and the private `_CONNECT_ARGS` (which `tests/conftest.py` imports). The `SQLModel.metadata.naming_convention` assignment at import time stays: `alembic/env.py` imports the module for that side effect. `init_db` and `reset_db` must no longer exist.

`app/main.py` must be `app = FastAPI()` with no `lifespan` argument. No code under `app/` may call `SQLModel.metadata.create_all` or `drop_all`; the guard test enforces this.

In `app/main.py`: delete the `asynccontextmanager` import, the `lifespan` function (including the commented `# reset_db()` line), and pass no `lifespan` to `FastAPI()`; the import becomes `from app.database import SessionDep` (the `/` route still uses it).

In `app/database.py`: delete `init_db` and `reset_db`; nothing else changes.

The new test follows the existing source-scan precedent (`test_no_mastery_arithmetic_outside_strategy` in `tests/api_tests/test_mastery.py`): walk every `.py` file under `app/` recursively and assert none contains the substring `create_all(` or `drop_all(`; on failure the message names the offending file.

`tests/conftest.py` must not be touched; its `client` fixture may keep entering `with TestClient(app)`.

Never edit `AGENTS.md`.

Rollout, on this machine's dev database (`DATABASE_URL`), in this order:

1. `SELECT count(*) FROM mastery_log`. If it is not `0`, stop and report; never drop a table with rows in it.
2. `DROP TABLE mastery_log`: the empty stray table `create_all` made before its migration existed.
3. `alembic upgrade head`: this is what applies revision `795ede6a41c4` to the dev database.
4. `alembic check`: it must print `No new upgrade operations detected.`; if it reports anything, stop and report rather than editing models or migrations.

**Out of scope**

- Any startup health or at-head check.
- Changing `tests/conftest.py`.
- The `/` route or its `SessionDep` dependency.
- Editing `AGENTS.md`: distill.
- Any deployment or CD concern.

**Done when**

- `grep -rn "create_all\|drop_all\|init_db\|reset_db\|lifespan" app/` returns zero hits.
- The new guard test passes, and fails if `create_all(` is temporarily pasted into any file under `app/` (try it, then revert).
- The four rollout steps ran against `DATABASE_URL`, with the outputs of steps 1 and 4 pasted into the Debrief.
- `\dt` on the dev database shows `mastery_log` and no `card_field_mastery`.
- `SELECT version_num FROM alembic_version` on the dev database prints `795ede6a41c4`.

**Debrief**

Rollout step 1's output was `count = 0` (the stray `mastery_log` was empty, safe to drop). Step 4's output was `No new upgrade operations detected.` (zero drift). All four steps ran in order against `DATABASE_URL` (the `flashy` dev database): dropped the stray table, ran `alembic upgrade head` (applied revision `795ede6a41c4`, backfilling 356 `mastery_log` rows from the dev database's 250 `review_log` rows), then `alembic check` confirmed no drift. `\dt` now shows `mastery_log` and no `card_field_mastery`; `alembic_version` reads `795ede6a41c4`. The guard test scans every `.py` under `app/` recursively, not a fixed file list like `test_no_mastery_arithmetic_outside_strategy`'s; verified it fails when `create_all(` is injected into an arbitrary file (`app/config.py`, then reverted) before confirming it passes clean. Full `pytest`: 276 passed (275 + this task's new test).
