# ADR 063: A polled health probe detects outages and drives recovery

## Status

Accepted. Implements ADR 062's detection. It is consistent with ADR 033, since the probe is a query the shell owns and recovery reruns each page's own query definition. It is consistent with ADR 035, since it adds no `QueryCache`/`MutationCache` handler. Implemented by task 020.

## Context

ADR 062's banner needs to know when the server or database is in trouble, and when the trouble is over. There were two possible sources: watch the app's own requests fail, or ask the server.

Watching failures means a global `QueryCache`/`MutationCache` handler, which ADR 035 rejected. It also misses three cases that matter here:

- **A request that hangs never fails.** The frontend's `fetch` has no timeout, and before task 020 the engine had no connect timeout either, so a database host that stopped answering held each request for about two minutes.
- **A page the user is only reading makes no requests.**
- **Recovery produces no failure to observe.** Once the server is back, a query that failed during the outage stays failed until the user refocuses the tab or navigates away.

Offline is different, because TanStack Query already tracks it. Its `onlineManager` starts as online and listens to the window's `online` and `offline` events; v5 no longer reads `navigator.onLine` at startup. It pauses queries and mutations while offline. On reconnect it refetches active queries and resumes paused mutations.

## Decision

The offline state is read from `onlineManager`, the same signal that pauses queries, so the banner and the paused state cannot disagree. The app never calls `onlineManager.setOnline`.

Server and database health comes from a `['health']` query that `AppShell` owns through the `useConnectionStatus` hook (`frontend/src/components/shell/useConnectionStatus.ts`), which only `AppShell` calls.

- It polls `GET /api/health` (ADR 064) with no retries and an 8-second timeout.
- It polls every 30 seconds while healthy, every 5 seconds while failing, and whenever the window regains focus.
- It never polls from a background tab, and doesn't poll at all while the browser is offline.
- An `ApiError` from the probe means server trouble. Any other failure, including the timeout, means can't connect; ADR 065 is what makes that distinction hold.

The banner learns about trouble only from these two sources, never by watching the app's other requests.

When the probe goes from failing to healthy, the hook refetches every active query that is in the error state, once. This is a command issued at one moment, not a listener. Failed mutations are never replayed; the user's input stays in place (ADR 035) and they submit again. Recovery from offline stays with TanStack's own reconnect behaviour, and the global retry defaults are unchanged.

The backend's connect timeout (3 seconds, task 020 MD-1) stays shorter than the probe's timeout. A silent database host then answers `503` before the probe gives up, so it reads as server trouble rather than can't connect. A source-scan test in `tests/api_tests/test_health.py` guards this ordering.

## Alternatives considered

### A global cache listener that classifies failures

Rejected. It is the handler ADR 035 rejected. Recovery would go unnoticed until something happened to succeed, so the banner would stick until the user acted. An idle page would never learn, and a hang would never become a failure without putting a timeout on every real request.

### A hybrid: failures raise the banner, the probe clears it

Rejected. It carries both mechanisms' code, and still needs the listener, to save a few seconds of detection.

### Setting `onlineManager` from the probe

Rejected. It would pause the whole app while the server is down, blurring "your device is offline" with "the server is down". The probe is itself a query, so it would pause too and could never see recovery. The browser's next `online` event would overwrite the value anyway.

### Pages own recovery by watching `['health']`

Rejected. It couples about twelve surfaces to the shell, and relies on every future surface remembering to do the same.

### Each failed query polls itself through a `QueryClient` default

Rejected. Every failed query would poll the server throughout an outage, and a real `404` would poll forever.

### Refetch every active query on recovery

Rejected. It sends more requests for little gain; queries that loaded before the outage keep their data.

### Replay failed mutations on recovery

Rejected. It risks a double submit, for example a rating the server recorded just before the connection dropped.

### A timeout on every request

Rejected. It would kill slow requests that are legitimate, and the probe alone already bounds detection.

## Consequences

Benefits:

- Hangs are caught without timing out real requests.
- An idle page learns of an outage.
- The banner and the failed pages clear together, without the user acting.
- There is no global handler, so ADR 035's rejection of `QueryCache`/`MutationCache` handlers stands.

Costs:

- On a healthy, idle page, detection can lag by up to 30 seconds, less when the user refocuses the tab. A page's own failed request does not raise the banner any sooner.
- Every visible tab sends one small request every 30 seconds.
- The shell acts on queries it does not own, though only to rerun them.
- Once connections are pooled, a network partition can still hang the backend's pre-ping; the probe's timeout then reports it as can't connect. Tuning `tcp_user_timeout` or keepalives is out of scope.
