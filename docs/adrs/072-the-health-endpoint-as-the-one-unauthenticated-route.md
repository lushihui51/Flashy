# ADR 072: The health endpoint as the one unauthenticated route

## Status

Active

## Context

ADR 063's probe needs an endpoint that proves two things: the API is reachable, and the API can reach its database. The shell shows for signed-out visitors, so the probe runs for them too.

Every other route depends on `CurrentUserDep`. Its dependency, `get_current_app_user`, first verifies the Clerk JWT (ADR 007), fetching Clerk's JWKS when it sees an unknown `kid`, then reads the `app_user` row, creating it on first sight and syncing the timezone (ADR 019). A probe behind it would answer a signed-out visitor `401` before anything touched the database, would turn a failed JWKS fetch into a probe failure, and could write on every call.

ADR 055 confines every statement and session call to `app/database_ops/`, one module per table. Its guard requires a `db_stage_` prefix on any function that does not commit, unless its verb is `read`, `fetch`, `count`, `next` or `lock`.

ADR 062 excludes a Clerk outage from what the banner reports and words the banner from the probe's result, so no message the endpoint returns is shown to a user. ADR 070 puts the sentence a user reads for any coded refusal in the frontend's map, keyed by the code, and makes the backend's message a developer's.

ADR 064 decided this route with the 503's message written as the user's sentence. This record restates it with the message in the code's own terms.

## Decision

`GET /api/health` (`read_health` in `app/routers/api/health.py`) takes no `CurrentUserDep`. It calls `db_ping` in `app/database_ops/health.py`, which runs `SELECT 1` and commits nothing.

- If the ping returns, the endpoint answers `200` with `{"status": "ok"}`.
- If it raises any `SQLAlchemyError`, the endpoint answers `503` with a detail carrying a code, `database_unavailable`, and a message in the code's own terms. The sentence a user reads for that code lives in the frontend's map.

`ping` joins the guard's non-writing verbs.

The frontend sends no Clerk token on this request: `client.ts`'s `onRequest` skips `getToken` for this path, so a Clerk failure cannot register as a probe failure.

This is the only route exempt from `CurrentUserDep`. Any other unauthenticated route needs its own record.

## Alternatives considered

### An authenticated probe

Rejected, for three reasons. It would answer signed-out visitors `401`, so the probe would have to count a `401` as healthy, and because auth rejects the request before anything touches the database, it would never check the database for them. A failed JWKS fetch would read as "can't reach Flashy", reintroducing the Clerk outage ADR 062 excluded. And every probe could write, through the first-sight create and the timezone sync.

### The existing `GET /` in `app/main.py`

Rejected. It opens a session but never queries, so it proves nothing about the database. It also sits outside `/api`, which the dev proxy does not forward.

### Running `SELECT 1` in the router

Rejected: ADR 055's guard forbids statements and session calls outside `database_ops`.

### Naming the check with an existing verb

Rejected: `db_read_*` and `db_fetch_*` misdescribe a connectivity check.

## Consequences

**Positive**

- The user, signed in or out, gets a probe that answers, works independently of Clerk, and writes nothing.
- The operator gets a machine-readable code for an outage in logs and the network tab.

**Negative**

- The operator accepts that anyone can learn whether Flashy and its database are up and can trigger a `SELECT 1`; rate limiting belongs to the hosting cycle.
- The developer carries an exception in AGENTS.md's auth rule and in the one-module-per-table rule.
- The user still gets a plain `500` from an ordinary endpoint during a database outage, which across origins the browser reads as a network failure; mapping to `503` is deferred.

**Neutral**

- The developer keeps the user's sentence for `database_unavailable` as a vocabulary row no screen shows until the deferred mapping lands.
