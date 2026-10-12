# Connection status: the 2026-09-29 plan session's findings

**Date:** 2026-10-01, recording the /plan investigation of 2026-09-29.

**Prompted by:** the app freezing when the browser is offline or the backend or its database is down. The 2026-09-29 /plan session investigated it and produced ADRs 062 to 065 and task 020. Its findings were written into task 020's introduction only; the 2026-10-01 sync pass puts them here, where AGENTS.md says plan-mode findings live.

**Outcome:** bugs found and fixed in task 020 (commits 22d3d09, e799340, 90bc27a, 83ef29a, 256368b on `feat/connection-status`).

## Findings, as the session saw them (commit a934ae0)

1. **Offline paused everything silently.** `frontend/src/main.tsx:8` built `new QueryClient()` with defaults, so TanStack Query's `networkMode: 'online'` paused every query and mutation while the browser reported offline, and no page ever received an error to show.
2. **A down backend read as success in dev.** Vite's dev proxy answers an unreachable backend with an empty-body `502`; openapi-fetch reports that as `error: ""`, or `error: undefined` when the response carries `Content-Length: 0`. `frontend/src/api/unwrap.ts:58-64` tested `error` for truthiness, so `unwrap` returned `undefined` as if the call had succeeded.
3. **Network failures surfaced raw.** `frontend/src/api/client.ts:21-33` registered only an `onRequest` middleware, so a request that got no response rejected with the browser's own `TypeError` text, after the default three retries.
4. **Pages misreported.** Eight pages rendered every failed load as "not found"; `frontend/src/pages/SubjectDetailPage.tsx:39-45` is the pattern. `frontend/src/pages/LibraryPage.tsx` had no error branch at all.
5. **A silent database hung requests.** `app/database.py:22-24` built the engine with no `connect_timeout`, so a database host that stopped answering hung each request until the OS gave up, about two minutes.

## Decisions

Recorded by /justify on 2026-09-29: ADR 062 (connectivity is the one app-level error banner, amending ADR 035), ADR 063 (a polled health probe detects outages and drives recovery), ADR 064 (`GET /api/health` is the one unauthenticated route, amending ADR 055), and ADR 065 (every non-ok response throws a status-carrying `ApiError`, amending ADR 006 and ADR 022). Task 020 MD-1 set the engine's connect timeout and deferred mapping database-connection errors to `503` on ordinary endpoints under `TODO(defer:db-unavailable-503)`, to be revisited once the frontend and API are cross-origin. The reasoning and the rejected alternatives are in those ADRs and are not repeated here.

## What the code does now (commit 256368b)

- **Finding 1.** `frontend/src/components/shell/useConnectionStatus.ts:16-19` reads offline from `onlineManager`, and `frontend/src/components/shell/AppShell.tsx:36` renders `ConnectionBanner` whenever the status is not `online`. Queries still pause under the default `networkMode`, which ADR 063 keeps; what changed is that the pause is reported.
- **Finding 2.** `frontend/src/api/unwrap.ts:79-86`: `unwrap` and `unwrapVoid` throw when `response.ok` is false, whatever `error` holds. `frontend/src/api/unwrap.ts:89-91`: `isNotFound` is the one 404 test.
- **Finding 3.** `frontend/src/api/client.ts:44-46`: `onError` turns a request with no response into a plain `Error` carrying `CONNECTION_FAILED_MESSAGE`. `frontend/src/api/client.ts:26` skips the Clerk token for the health path.
- **Finding 4.** `frontend/src/pages/SubjectDetailPage.tsx:43` and the seven sibling pages branch on `isNotFound`, rendering "Could not load …" otherwise. `frontend/src/pages/LibraryPage.tsx:99` and `frontend/src/pages/LibraryPage.tsx:139` render a failed subjects or decks load.
- **Finding 5.** `app/database.py:25-32` sets `connect_timeout` to 3 seconds and `pool_pre_ping=True`. `app/routers/api/health.py:11-25` answers `200`, or `503 database_unavailable` when `db_ping` raises. `frontend/src/api/health.ts:7` and `frontend/src/api/health.ts:18` bound the probe at 8 seconds, and `tests/api_tests/test_health.py` guards that the backend timeout stays below it.
- **Detection and recovery.** `frontend/src/components/shell/useConnectionStatus.ts:25-26` polls the probe every 30 seconds, or every 5 seconds while it fails; `frontend/src/components/shell/useConnectionStatus.ts:35-38` refetches failed active queries once when it recovers; `frontend/src/components/shell/useConnectionStatus.ts:43-46` derive the status.

## Related

- ADRs 062, 063, 064, 065; `docs/tasks/020-connection-status.md`.
- AGENTS.md's "Every router depends on `CurrentUserDep`" and "one module per table" lines, and its ADR 035 line about no global error channel, gain their exceptions through /code-distill, as flagged in the 2026-10-01 sync. README.md's "Every API endpoint verifies the Clerk session token" and "one database-operations module per table" claims are flagged the same way.
