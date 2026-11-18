# ADR 131: Guest reads answered as the example user, read-only

## Status

Active

## Context

PDR 053 shows a visitor who is not logged in, a guest, one example library on every page, the same for every guest, and lets a guest change nothing.

The example library is the rows of one `app_user` with no Clerk identity, the example user, read through the routes a logged-in user's own data is read through. A database can hold no such row (ADR 129).

The app has fourteen `GET` routes besides health and eighteen routes of other methods, and every one of the thirty-two takes `CurrentUserDep`. `GET /api/health` resolves no user (ADR 130).

`CurrentUserDep` resolves its user through `get_current_app_user`, which verifies the Clerk token, whose user is the ownership key (ADR 007), and writes the user's stored zone from the `X-Timezone` header on every request, before the route's read (ADR 019).

The frontend sends a token only when Clerk has a session, and sends `X-Timezone` on every request.

A service takes the user's id and scopes every statement by it (ADR 034).

A run's day is the date of `run.created_at` in its user's stored zone, worked out in one statement in `app/database_ops/run.py`, and the stored zone is read nowhere else (ADR 114). The example library's runs are to read the same dates for every guest, whatever the guest's zone.

A read can write: the read of a run's current card marks the run completed when it finds no card left (ADR 111), in `get_current_run_card` in `app/services/run.py`.

A request's dependency and its handler share one session. Every statement, a switch of a transaction's mode included, is a `db_*` function under `app/database_ops/` (ADR 055).

PostgreSQL makes one transaction read only after its first read, refuses an update in it even of no rows, and leaves the connection's next transaction able to write.

The local bypass in `app/dependencies.py` answers every request as one user while `DEV_AUTH_USER_ID` and `ENV=development` are both set.

The API's process also serves the frontend's files, by a `GET` route outside `/api` that reads no user's data (ADR 128).

ADR 072 let no route but health answer a request without a verified session. PDR 053 has a guest read the example library through the app's reads, so this record replaces that rule, and ADR 130 restates the health endpoint.

## Decision

We will add `get_viewer` in `app/dependencies.py`, as `ViewerDep`. It answers a request that carries no `Authorization` header as the example user, and any other request as `get_current_app_user` does, so a token that fails verification gets 401. In a database with no example user, it answers a request with no header 401.

Every `GET` route under `/api` but `GET /api/health` takes `ViewerDep`. Every route of another method keeps `CurrentUserDep`, which answers no request without a verified session. With the local bypass on, both answer as its user.

A test over the app's route table fails on a `GET` route under `/api` but health without `ViewerDep`, on a route of another method without `CurrentUserDep`, and on a route outside `/api` other than the one that serves the frontend's files.

We will have `get_viewer` return the example user without syncing its zone from `X-Timezone`, and nothing else writes the example user's `timezone`. A run of the example library reads its day in the example user's stored zone, by the statement that works out any run's day. That zone is the one the library's runs were made in. A case in `tests/api_tests/test_user_timezone.py` sends a request with no session and another zone in `X-Timezone`, and asserts the stored zone and the run's day unchanged.

When `get_viewer` answers as the example user, it makes the request's transaction read only before the route's handler runs, through a `db_*` function under `app/database_ops/`, so a statement that writes raises in PostgreSQL. A test calls every `GET` route but health with no session, against an example library, and asserts each answers 200.

## Alternatives considered

### Every route but health requiring a session

Rejected because the example library is served through the reads.

### `CurrentUserDep` itself answering a `GET` with no header as the example user

Rejected because no route's signature would say a guest can call it, and a later read meant for accounts alone would be open to guests with nothing written.

### `CurrentUserDep` answering every request with no header as the example user, with a refusal in each writing route

Rejected because a writing route that forgot the refusal would change the example library with nothing failing.

### A failed token answered as the example user

Rejected because a user whose session has lapsed would be shown the example library as their own.

### A session issued to each guest

Rejected because nothing about one guest differs from another.

### The route-table test looking at routes under `/api` alone

Rejected because a route that reads data, added outside `/api`, would be checked by nothing.

### The example user's zone synced from every request

Rejected because each guest would read the dates in their own zone, a guest's request would write the example user's row, and a request with no header would read them in the last guest's zone.

### The example library's days worked out in UTC

Rejected because a run made in the evening would read as the next day, not the day it was run.

### A zone held in code or configuration and passed to the run's read

Rejected because the statement would take its zone from two places.

### No stop on a read that writes

Rejected because a later read that writes would change what every guest sees with nothing failing.

### A database role with read grants alone, and an engine of its own for guests

Rejected because it is a second set of credentials and a second pool, and each migration's new table would need its grant.

### A check of the user in each service that writes

Rejected because a new writing path that forgot the check would write.

### A hook on the session's flush

Rejected because a statement executed directly never flushes.

### The connection set read only

Rejected because a pooled connection would carry the setting into a logged-in user's request.

## Consequences

**Positive**

- The developer's new writing route refuses a guest with nothing to remember, and a new `GET` route written with `CurrentUserDep`, or a new route outside `/api`, fails the route-table test.
- The guest reads the same date on each of the example library's runs as every other guest.
- The developer's read that writes fails a test before it ships, and a guest's request writes nothing.
- The logged-in user's request is untouched.

**Negative**

- The server runs fourteen reads for anyone, with no account.
- The guest far from the zone the library was made in reads a run's day as it was there.
- The guest who meets a read that writes gets a 500, with a database error in the log.
- The developer whose handler committed and then wrote would write to the example library, since the commit ends the read-only transaction; no handler does.
- The developer turns the local bypass off to see the example library.

**Neutral**

- The guest's request to a writing route gets a 401, as a request with no session did before.
- The developer finds the example user the one user whose `X-Timezone` is ignored.
