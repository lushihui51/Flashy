# ADR 130: A health endpoint resolving no user, for probes

## Status

Active

## Context

The outage probe polls one endpoint, which must prove two things: the API is reachable, and the API can reach its database (ADR 063). The shell shows for visitors who are not logged in, so the probe runs for them too.

A route that resolves its user through `get_current_app_user` first verifies the Clerk JWT (ADR 007), fetching Clerk's JWKS when it sees an unknown `kid`, then reads the `app_user` row, creating it on first sight and syncing the timezone (ADR 019). A probe behind it would answer a visitor with no session `401` before anything touched the database, would turn a failed JWKS fetch into a probe failure, and could write on every call.

ADR 055 confines every statement and session call to `app/database_ops/`, one module per table. Its guard requires a `db_stage_` prefix on any function that does not commit, unless its verb is one of the non-writing verbs.

The connection banner reports trouble with the device's connection, the server and the database, and not an outage of Clerk. It is worded from the probe's result (ADR 063), so no message the endpoint returns is shown to a user.

The sentence a user reads for any coded refusal is chosen in the frontend by the code, and the backend's message is a developer's (ADR 070).

ADR 072 decided this route and called it the only route exempt from `CurrentUserDep`, any other needing a record of its own. Which routes answer a request with no session is no longer this route's to say, so this record restates ADR 072 without that claim.

## Decision

We will have `GET /api/health`, `read_health` in `app/routers/api/health.py`, take no dependency that resolves a user. It calls `db_ping` in `app/database_ops/health.py`, which runs `SELECT 1` and commits nothing.

If the ping returns, the endpoint answers `200` with `{"status": "ok"}`. If it raises any `SQLAlchemyError`, the endpoint answers `503` with a detail carrying a code, `database_unavailable`, and a message in the code's own terms. The sentence a user reads for that code lives in the frontend's map.

`ping` stays among the guard's non-writing verbs.

We will have the frontend send no Clerk token on this request: `client.ts`'s `onRequest` skips `getToken` for this path, so a Clerk failure cannot register as a probe failure.

## Alternatives considered

### A probe that resolves a user

Rejected for three reasons. It would answer visitors with no session `401`, so the probe would have to count a `401` as healthy, and because the request is rejected before anything touches the database, it would never check the database for them. A failed JWKS fetch would read as a failure to reach Flashy, which the banner does not report. And every probe could write, through the first-sight create and the timezone sync.

### The `GET /` route in `app/main.py`

Rejected because it opens a session and never queries, so it proves nothing about the database, and it sits outside `/api`, which the development proxy does not forward.

### `SELECT 1` run in the router

Rejected because ADR 055's guard forbids statements and session calls outside `database_ops`.

### The check named with an existing verb

Rejected because `db_read_*` and `db_fetch_*` misdescribe a connectivity check.

## Consequences

**Positive**

- The user, logged in or not, gets a probe that answers, works independently of Clerk, and writes nothing.
- The operator gets a machine-readable code for an outage in logs and the network tab.

**Negative**

- The operator accepts that anyone can learn whether Flashy and its database are up, and can trigger a `SELECT 1`.
- The developer carries the route as an exception in the one-module-per-table rule.

**Neutral**

- The developer keeps the user's sentence for `database_unavailable` as a vocabulary row no screen shows.
- The developer gives the 503 a developer's message; the banner shows neither it nor the code.
