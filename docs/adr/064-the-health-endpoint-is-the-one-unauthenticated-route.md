# ADR 064: The health endpoint is the one unauthenticated route

## Status

Accepted. Amends ADR 055: a connectivity check that belongs to no table lives in `app/database_ops/health.py`, and `ping` joins the verbs that write nothing. Consistent with ADR 007, which verifies Clerk JWTs on protected routes. Implemented by task 020.

## Context

ADR 063's probe needs an endpoint that proves two things: the API is reachable, and the API can reach its database.

Every existing route depends on `CurrentUserDep`. Its dependency, `get_current_app_user`, first verifies the Clerk JWT, fetching Clerk's JWKS when it sees an unknown `kid`. It then reads the `app_user` row, creating it on first sight and syncing the timezone (ADR 019). Signed-out visitors see the shell too, so the probe runs for them.

ADR 055 confines every statement and session call to `app/database_ops/`, with one module per table. Its guard, `test_stage_prefix_matches_commit_behaviour`, requires a `db_stage_` prefix on any function that does not commit, unless its verb is `read`, `fetch`, `count`, `next` or `lock`.

## Decision

`GET /api/health` (`read_health` in `app/routers/api/health.py`) takes no `CurrentUserDep`. It calls `db_ping` in `app/database_ops/health.py`, which runs `SELECT 1` and commits nothing.

- If the ping returns, the endpoint answers `200` with `{"status": "ok"}`.
- If it raises any `SQLAlchemyError`, the endpoint answers `503` with the ADR 022 detail `{"code": "database_unavailable", "message": "Flashy is temporarily unavailable."}`.

`ping` joins the guard's non-writing verbs.

The frontend sends no Clerk token on this request: `client.ts`'s `onRequest` skips `getToken` for this path, so a Clerk failure cannot register as a probe failure.

This is the only route exempt from `CurrentUserDep`. Any other unauthenticated route needs its own record.

## Alternatives considered

### An authenticated probe

Rejected, for three reasons:

- **Signed-out visitors.** It would answer them `401`, so the probe would have to count a `401` as healthy. And because auth rejects the request before anything touches the database, it would never check the database for them.
- **Clerk failures.** A failed JWKS fetch would read as "can't reach Flashy", reintroducing the Clerk outage ADR 062 excluded.
- **Writes.** Every probe could write, through the first-sight create and the timezone sync.

### The existing `GET /` in `app/main.py`

Rejected. It opens a session but never queries, so it proves nothing about the database. It also sits outside `/api`, which the dev proxy does not forward.

### Running `SELECT 1` in the router

Rejected: ADR 055's guard forbids statements and session calls outside `database_ops`.

### Naming the check with an existing verb

Rejected: `db_read_*` and `db_fetch_*` misdescribe a connectivity check.

## Consequences

Benefits:

- The probe answers every visitor, works independently of Clerk, and writes nothing.
- An outage carries a machine-readable code into logs and the network tab.

Costs:

- Anyone can learn whether Flashy and its database are up, and can trigger a `SELECT 1`. Rate limiting belongs to the hosting cycle.
- AGENTS.md's "every router depends on `CurrentUserDep`" rule and ADR 055's one-module-per-table rule each carry an exception.
- Ordinary endpoints still answer a database outage with a plain `500`. Mapping them to `503` is deferred (task 020 MD-1). Across origins that `500` carries no CORS headers, so the browser reads it as a network failure.
