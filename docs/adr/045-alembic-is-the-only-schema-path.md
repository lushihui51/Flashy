# ADR 045: Alembic is the only schema path; the app never creates tables on startup

## Status

Accepted

## Context

`app/main.py`'s lifespan called `init_db()` — `SQLModel.metadata.create_all` against `app.database.engine` — on every startup. It dated from the scaffold-era commit 3ca1d11 ("Complete database initialization"), with `reset_db()` already commented out beside it; no ADR covered it, no onboarding document relied on it, and it is the pattern every FastAPI/SQLModel tutorial teaches, so its presence read as normal rather than as a choice.

It ran through two channels. The obvious one: `fastapi dev` restarts the worker on every file save and re-enters the lifespan. The less obvious one: `tests/conftest.py`'s `client` fixture enters `with TestClient(app)`, which runs the lifespan too — and `app.database.engine` is bound to `DATABASE_URL`, the live dev database, not the test one, because the test override only swaps the request-scoped `get_session`. So every pytest run touched the dev database's schema.

`create_all` is additive-only: it creates tables that are missing and never alters, drops, or reports on tables that exist. Two failure modes follow. A new model silently gains a table before its migration exists, and the later `alembic upgrade` fails on `CREATE TABLE`; a new column on an existing table is never applied, and the server starts fine until the first query touching it fails at runtime. The first mode happened during the mastery-ledger cycle (task 010): an empty `mastery_log` appeared in the dev database while `card_field_mastery` and `alembic_version` were untouched, and 010 T2's migration could only be verified on a copy.

ADR 041 made CI exercise the alembic chain from an empty database, which catches a broken chain but cannot prevent a dev database from drifting out from under it. Nothing depended on the startup call: CI already runs `alembic upgrade head` before pytest, and tests build their own schema on the disposable test database.

## Decision

Remove the lifespan and `init_db()` from `app/main.py`, and delete `init_db`/`reset_db` from `app/database.py`. `alembic upgrade` is the only path by which any persistent database's schema changes. `SQLModel.metadata.create_all` survives in exactly one place — `tests/conftest.py`'s own fixture, against the disposable test database that is dropped after every test — and a source-scan test asserts that no file under `app/` calls `create_all` or `drop_all`. A fresh database needs `alembic upgrade head` before the server is useful; a forgotten migration fails loudly on the first query with "relation does not exist" instead of silently fabricating schema.

## Alternatives considered

### Gate the startup `create_all` behind an env flag, default off

Rejected — keeps the footgun on the shelf and adds a configuration knob nobody asked for; the "convenience" it preserves is exactly the mechanism that produces drift.

### Replace it with a startup check that the database is at alembic head

Rejected for now — louder than silent drift, but it would also run inside every test through `TestClient(app)`'s lifespan, failing tests whenever the dev database is behind even though tests never touch that database. The wrong coupling; revisitable after the hosting cycle (009 MD-2) if deploy-time checks are wanted.

### Document the behavior in AGENTS.md and leave the code alone

Rejected — leaves the trap armed for every future model change and turns "drop the stray table before testing a migration" into a recurring manual step that documentation cannot remove.

## Consequences

Benefits:

- A persistent database is only ever at an alembic revision; schema drift can no longer be created silently by running tests or the dev server.
- Defuses a landmine before deployment: an app that creates tables on boot races across replicas and has no downgrade path.

Costs:

- A fresh clone must run `alembic upgrade head` before `fastapi dev` does anything useful — one documented step instead of an invisible one.
- The dev database that already drifted needs a one-time manual cleanup (task 011 T1's rollout).
- Tests still enter the app lifespan through `TestClient(app)`; it is now empty, which is harmless but slightly misleading to a reader of `conftest.py`.
