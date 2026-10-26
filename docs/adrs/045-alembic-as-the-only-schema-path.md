# ADR 045: Alembic as the only schema path

## Status

Active

## Context

`app/main.py`'s lifespan called `init_db()` — `SQLModel.metadata.create_all` against `app.database.engine` — on every startup. It dated from the scaffold-era commit 3ca1d11 ("Complete database initialization"), with `reset_db()` already commented out beside it; no ADR covered it, no onboarding document relied on it, and it is the pattern every FastAPI/SQLModel tutorial teaches, so its presence read as normal rather than as a choice.

It ran through two channels. The obvious one: `fastapi dev` restarts the worker on every file save and re-enters the lifespan. The less obvious one: `tests/conftest.py`'s `client` fixture enters `with TestClient(app)`, which runs the lifespan too — and `app.database.engine` is bound to `DATABASE_URL`, the live dev database, not the test one, because the test override only swaps the request-scoped `get_session`. So every pytest run touched the dev database's schema.

`create_all` is additive-only: it creates tables that are missing and never alters, drops, or reports on tables that exist. Two failure modes follow. A new model silently gains a table before its migration exists, and the later `alembic upgrade` fails on `CREATE TABLE`; a new column on an existing table is never applied, and the server starts fine until the first query touching it fails at runtime. The first mode happened while the mastery ledger was being built: an empty `mastery_log` appeared in the dev database while `card_field_mastery` and `alembic_version` were untouched, and its migration could only be verified on a copy.

ADR 041 made CI exercise the alembic chain from an empty database, which catches a broken chain but cannot prevent a dev database from drifting out from under it. Nothing depended on the startup call: CI already runs `alembic upgrade head` before pytest, and tests build their own schema on the disposable test database.

## Decision

We will make `alembic upgrade` the only path by which any persistent database's schema changes: the app's startup creates no tables, `SQLModel.metadata.create_all` survives in exactly one place, `tests/conftest.py`'s fixture against the disposable test database, and a source-scan test asserts that no file under `app/` calls `create_all` or `drop_all`. A fresh database needs `alembic upgrade head` before the server is useful, and a forgotten migration fails loudly on the first query instead of silently fabricating schema.

## Alternatives considered

### Gate the startup `create_all` behind an env flag, default off

Rejected — keeps the footgun on the shelf and adds a configuration knob nobody asked for; the "convenience" it preserves is exactly the mechanism that produces drift.

### Replace it with a startup check that the database is at alembic head

Rejected for now — louder than silent drift, but it would also run inside every test through `TestClient(app)`'s lifespan, failing tests whenever the dev database is behind even though tests never touch that database. The wrong coupling; revisitable after hosting if deploy-time checks are wanted.

### Document the behavior in AGENTS.md and leave the code alone

Rejected — leaves the trap armed for every future model change and turns "drop the stray table before testing a migration" into a recurring manual step that documentation cannot remove.

## Consequences

**Positive**

- The developer can no longer create schema drift silently by running tests or the dev server; a persistent database is only ever at an alembic revision.
- The operator deploying later avoids an app that creates tables on boot, racing across replicas with no downgrade path.

**Negative**

- The developer on a fresh clone runs `alembic upgrade head` before `fastapi dev` does anything useful.
- The developer cleans up the dev database that already drifted, once.
- The developer reading `conftest.py` sees tests enter an empty app lifespan, harmless but slightly misleading.

**Neutral**
