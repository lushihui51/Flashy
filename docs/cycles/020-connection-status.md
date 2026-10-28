# 020 — Connection status

## Goal

Outcome: AppShell shows a banner whenever the app cannot reach the API or its database and clears it when the connection returns, and pages say "not found" only for a real 404.

Scope: The health endpoint and a hardened engine, API errors that carry their status, pages that stop misreporting failed loads, the probe-driven connection status, and AppShell's connection banner. Not covered: AGENTS.md's health exceptions.

Judgement: None.

## Records

- ADR 063: A polled health probe for outage detection and recovery
- ADR 065: A status-carrying ApiError for every non-ok response

## Tasks

### T1 — The health endpoint and a hardened engine

**Status**

- [x]

**Goal**

`GET /api/health` reports, without auth, whether the API can reach its database, and the engine fails fast when the database host goes silent.

**Dependencies**

None.

**Files**

- `app/routers/api/health.py` (new)
- `app/database_ops/health.py` (new)
- `app/main.py`
- `app/database.py`
- `tests/api_tests/test_health.py` (new)
- `tests/api_tests/test_layering_guard.py`
- `frontend/src/api/openapi.json`
- `frontend/src/api/types.ts`

**Details**

The engine must set `connect_timeout` to `DB_CONNECT_TIMEOUT_SECONDS = 3`, shorter than the probe's timeout (ADR 063), and turn on `pool_pre_ping=True`. Mapping database-connection errors to `503 database_unavailable` on ordinary endpoints is deferred; revisit it once the frontend and API are cross-origin, where an unhandled `500` carries no CORS headers.

Health endpoint:

- Route: `GET /api/health`. It takes no `CurrentUserDep` and reads no Authorization header.
  - Database reachable: `200`, body exactly `{"status": "ok"}`.
  - `db_ping` raises any `sqlalchemy.exc.SQLAlchemyError`: `503`, body exactly `{"detail": {"code": "database_unavailable", "message": "Flashy is temporarily unavailable."}}`.
- Router file: `app/routers/api/health.py` declares `router = APIRouter(prefix="/health", tags=["Health"])` and the handler `def read_health(db: SessionDep) -> dict[str, str]`, decorated `@router.get("", response_model=dict[str, str], status_code=200)`. `app/main.py` includes it with `prefix="/api"`, after the existing routers.
- Ping: `app/database_ops/health.py` defines `def db_ping(db: Session) -> None`. Its body is `db.execute(text("SELECT 1"))`. It commits nothing and lets any SQLAlchemy error propagate.
- Guard: `NON_WRITING_VERBS` in `tests/api_tests/test_layering_guard.py` becomes `{"read", "fetch", "count", "next", "lock", "ping"}`.

Engine:

- `app/database.py` defines `DB_CONNECT_TIMEOUT_SECONDS = 3`.
- `_CONNECT_ARGS` becomes `{"options": "-c timezone=utc", "connect_timeout": DB_CONNECT_TIMEOUT_SECONDS}`.
- `engine = create_engine(settings.database_url, echo=False, pool_pre_ping=True, connect_args=_CONNECT_ARGS)`.

Build the route, `db_ping`, the engine settings and the verb list exactly as stated above.

Router: import `db_ping` by name (`from app.database_ops.health import db_ping`) so tests can monkeypatch it. Catch `sqlalchemy.exc.SQLAlchemyError`, which ADR 055 allows outside database_ops, and raise the 503 `HTTPException` `from` the caught error.

Docstrings: `read_health` gets one saying it is the one route without `CurrentUserDep`, because the probe must answer signed-out visitors and must not depend on Clerk. `db_ping` gets a one-line docstring.

Guard comment: in the comment above `NON_WRITING_VERBS`, add `ping` to the list of verbs it names.

Tests in `tests/api_tests/test_health.py`:

1. `test_health_ok_without_auth(client)`: pop the `get_current_app_user` override exactly as `test_unauthenticated_request_is_rejected` does, GET `/api/health` with no Authorization header, and assert `200` with body `{"status": "ok"}`.
2. `test_health_reports_database_unavailable(client, monkeypatch)`: monkeypatch `app.routers.api.health.db_ping` with a function that raises `sqlalchemy.exc.OperationalError("SELECT 1", {}, Exception("connection refused"))`. GET the route and assert `503` with exactly the 503 body above.
3. `test_engine_fails_fast_and_pre_pings()`: assert `_CONNECT_ARGS["connect_timeout"] == DB_CONNECT_TIMEOUT_SECONDS == 3` and `engine.pool._pre_ping is True`.

Types: run `npm run gen:api` in `frontend/`; it regenerates `frontend/src/api/openapi.json` and `frontend/src/api/types.ts`.

**Out of scope**

- Any 503 mapping on other endpoints.
- `tcp_user_timeout` or keepalive tuning. Once connections are pooled, a network partition can still hang the pre-ping; the probe's frontend timeout then reports it as can't connect.
- Any frontend source beyond the two regenerated files.
- `AGENTS.md`, which gets the exception through /distill.
- `tests/conftest.py`. Its test engine imports `_CONNECT_ARGS` and so inherits the connect timeout; that is intended.

**Done when**

- `uv run pytest` passes, including the three new tests and `test_layering_guard.py`.
- The regenerated `types.ts` and `openapi.json` diffs add the `/api/health` path and nothing else. If they contain anything more, stop and report the extra hunks.
- With `fastapi dev` running, `curl -s -o /dev/null -w '%{http_code}' localhost:8000/api/health` prints `200`.

**Debrief**

The comment above `NON_WRITING_VERBS` names no verbs, so "add `ping` to the list of verbs it names" had nothing to edit; only the set changed. The frontend checks ran while T2's in-progress `unwrap.ts` and `client.ts` edits were in the shared tree. Otherwise none.

### T2 — API errors carry their status and read plainly

**Status**

- [x]

**Goal**

Every failed response throws an `ApiError` carrying its status, empty-body failures included, and a request that got no response throws readable text.

**Dependencies**

None.

**Files**

- `frontend/src/api/unwrap.ts`
- `frontend/src/api/client.ts`
- `frontend/src/test/unwrap.test.ts`
- `frontend/src/test/client.test.ts` (new)

**Details**

API-layer errors (ADR 065), in `frontend/src/api/unwrap.ts` and `frontend/src/api/client.ts`:

```ts
export const CONNECTION_FAILED_MESSAGE =
  "Couldn't reach Flashy. Check your connection and try again.";
export const SERVER_TROUBLE_MESSAGE =
  "Flashy is having trouble right now. Try again in a moment.";

type ApiResult<T> = { data?: T; error?: unknown; response: Response };

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string);
}
export class ApiDetailError extends ApiError {
  detail: { code: string; message: string; config_id?: string };
  constructor(
    status: number,
    detail: { code: string; message: string; config_id?: string },
  );
}
export function unwrap<T>(result: ApiResult<T>): T;
export function unwrapVoid(result: ApiResult<unknown>): void;
/** `error instanceof ApiError && error.status === 404`. */
export function isNotFound(error: unknown): boolean;
```

- When `response.ok` is true, `unwrap` returns `data` and `unwrapVoid` returns `undefined`.
- When `response.ok` is false, the first matching rule decides what is thrown:
  1. `detail` is an object with a string `code` and a string `message`: `new ApiDetailError(response.status, detail)`. Its `message` is `detail.message`, as today.
  2. `detail` is a string, a 422 validation array, or an object with a string `message`: `new ApiError(response.status, text)`, where `text` is exactly what `formatError` produces today.
  3. Anything else — no body, an empty body, a non-JSON body such as FastAPI's plain-text `Internal Server Error`, or JSON without a usable `detail`: `new ApiError(response.status, SERVER_TROUBLE_MESSAGE)` when the status is 500 or above, otherwise `new ApiError(response.status, 'An unknown error occurred (Inspect console for details)')`.
- Whether `error` is truthy decides nothing (ADR 065).
- `client.ts` adds `onError({ error }) { return new Error(CONNECTION_FAILED_MESSAGE, { cause: error }); }` to its existing `client.use({...})` object. openapi-fetch calls `onError` only when `fetch` itself throws (network failure, CORS rejection, abort), so a transport failure is always a plain `Error` and never an `ApiError`.

`unwrap.ts`: implement the API-layer errors above. Restructure `formatError` so it returns `undefined` when there is no usable detail and `toThrown` applies rule 3. Update the `ApiDetailError` doc comment to say it extends `ApiError` and carries `status`. In `formatError`'s comment, replace the sentence "Callers that care read `detail` off the response themselves; this keeps the thrown message readable for everyone else." with "Shape-aware callers catch `ApiDetailError` (ADR 022)."

`client.ts`: add `onError` as stated above.

Existing tests in `unwrap.test.ts`: every case now passes a `response` built with `new Response(null, { status })`:

- `200` for the data case, `204` for the `unwrapVoid` success case
- `409` for the structured-detail cases
- `404` for the string-detail cases
- `422` for the validation array
- `500` for the object without a string `code`

Existing assertions stay as they are.

New cases in `unwrap.test.ts`:

- Thrown errors expose `status`.
- `ApiDetailError` is an `instanceof ApiError`.
- `{ error: '' }` with status 502 throws `ApiError` 502 with `SERVER_TROUBLE_MESSAGE`.
- `{ error: undefined }` with status 503 throws the same message, with status 503.
- `{ error: 'Internal Server Error' }` with status 500 throws `SERVER_TROUBLE_MESSAGE`.
- `{ error: {} }` with status 418 throws the unknown-error text.
- `isNotFound` is true for `ApiError` 404, false for `ApiError` 500, false for a plain `Error`, and false for `undefined`.

`client.test.ts` (node environment, MSW, using the same URL style as `src/test/subject.test.ts`):

- (a) A `GET /api/subjects` handler returning `HttpResponse.error()` makes `readSubjects()` reject with an `Error` whose message is `CONNECTION_FAILED_MESSAGE` and which is not an `ApiError`.
- (b) A handler returning `new HttpResponse(null, { status: 502 })` makes `readSubjects()` reject with an `ApiError` with status 502 and `SERVER_TROUBLE_MESSAGE`. This is the bug ADR 065 records, end to end; before this task, the call resolved to `undefined`.

**Out of scope**

- Page copy and `isNotFound` call sites: T3.
- The health probe and the `onRequest` change: T4.
- Any `QueryClient` option, including `networkMode` and retries (ADR 063).
- Logging, since ADR 006 forbids side effects.

**Done when**

- Every case listed in Details exists and passes.
- `grep -n "if (error)" src/api/unwrap.ts` prints nothing.

**Debrief**

None.

### T3 — Pages stop misreporting failed loads

**Status**

- [x]

**Goal**

Eight pages say "not found" only for a real 404 and "Could not load …" for any other failure, and LibraryPage shows its failed loads.

**Dependencies**

- T2: `isNotFound`.

**Files**

- `frontend/src/components/library/SubjectForm.tsx`
- `frontend/src/components/library/SubjectForm.test.tsx`
- `frontend/src/pages/SubjectDetailPage.tsx`
- `frontend/src/pages/SubjectDetailPage.test.tsx`
- `frontend/src/components/library/DeckEditor.tsx`
- `frontend/src/components/library/DeckEditor.test.tsx`
- `frontend/src/pages/DeckDetailPage.tsx`
- `frontend/src/pages/DeckDetailPage.test.tsx`
- `frontend/src/components/library/CardStandaloneForm.tsx`
- `frontend/src/components/library/CardStandaloneForm.test.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.test.tsx`
- `frontend/src/pages/PracticeRunPage.tsx`
- `frontend/src/pages/PracticeRunPage.test.tsx`
- `frontend/src/pages/PracticeDetailsPage.tsx`
- `frontend/src/pages/PracticeDetailsPage.test.tsx`
- `frontend/src/pages/LibraryPage.tsx`
- `frontend/src/pages/LibraryPage.test.tsx`

**Details**

Page copy (ADR 065): each site keeps its existing wrapper. A `404` renders the existing text, unchanged. Any other failure renders `<p role="alert" className="text-sm text-(--color-danger)">` with the text below. PracticeRunPage's copy also carries its existing `mt-4`.

| File | Query | 404 text (unchanged) | Any other failure |
| --- | --- | --- | --- |
| `src/components/library/SubjectForm.tsx` | `subjectQuery` | Subject not found. | Could not load this subject. |
| `src/pages/SubjectDetailPage.tsx` | `subjectQuery` | Subject not found. | Could not load this subject. |
| `src/components/library/DeckEditor.tsx` | `deckQuery` | Deck not found. | Could not load this deck. |
| `src/pages/DeckDetailPage.tsx` | `deckQuery` | Deck not found. | Could not load this deck. |
| `src/components/library/CardStandaloneForm.tsx` | `cardQuery` | Card not found. | Could not load this card. |
| `src/components/library/DeckConfigurationEditor.tsx` | `configQuery` | Deck configuration not found. | Could not load this deck configuration. |
| `src/pages/PracticeRunPage.tsx` | `runQuery` | Practice not found. | Could not load this practice. |
| `src/pages/PracticeDetailsPage.tsx` | `sessionQuery` | Practice not found. | Could not load this practice. |

`src/pages/LibraryPage.tsx`: when `subjectsQuery.isError`, the Subjects section renders `<p role="alert" className="mt-2 text-sm text-(--color-danger)">Could not load subjects.</p>` directly after its header row. When `decksQuery.isError`, the Decks section does the same with "Could not load decks.".

Each of the eight sites branches on `isNotFound(<query>.error)`, imported from `src/api/unwrap`, inside its existing `isError` branch.

Tests:

- In each of the eight test files, add a test in which the page's query handler returns `HttpResponse.json({ detail: 'boom' }, { status: 500 })`. It asserts that the "Any other failure" text is shown and that the 404 text is absent.
- `SubjectForm.test.tsx` has no edit-mode load-failure test yet, so it also gets a 404 test asserting "Subject not found.".
- `LibraryPage.test.tsx` gets two tests: a subjects 500 shows "Could not load subjects.", and a decks 500 on `?tab=decks` shows "Could not load decks.".
- The existing 404 tests stay unchanged and must pass.

**Out of scope**

- Every other query keeps today's behaviour. That includes queries with no error branch, such as DeckEditor's `subjectQuery`, which renders nothing when it fails; the banner and ADR 063's recovery refetch cover them.
- Mutation error rendering, which is unchanged; T2's messages flow through it.
- The banner: T5.
- Any page reading connection state, which ADR 065 rejected.

**Done when**

- All the new tests pass.
- `grep -rln "not found\.</p>" src --include=*.tsx | grep -v test` lists exactly the eight files, and each one contains `isNotFound(`.

**Debrief**

None.

### T4 — The probe reports connection status and heals failed queries

**Status**

- [x]

**Goal**

`useConnectionStatus()` returns the connection state derived from `onlineManager` and the health probe, and refetches failed queries when the probe recovers.

**Dependencies**

- T1
- T2

**Files**

- `frontend/src/api/health.ts` (new)
- `frontend/src/api/client.ts`
- `frontend/src/components/shell/useConnectionStatus.ts` (new)
- `frontend/src/test/server.ts`
- `frontend/src/test/health.test.ts` (new)
- `frontend/src/components/shell/useConnectionStatus.test.tsx` (new)
- `tests/api_tests/test_health.py`

**Details**

Probe, in `frontend/src/api/health.ts` and `frontend/src/api/client.ts`:

```ts
export const HEALTH_PROBE_TIMEOUT_MS = 8_000;
export async function readHealth(): Promise<{ [key: string]: string }>;
```

- Timeout. `readHealth` races `client.GET('/api/health')` against a `setTimeout` that rejects with `new Error(CONNECTION_FAILED_MESSAGE)` after `HEALTH_PROBE_TIMEOUT_MS`. It clears the timer in `finally` and passes the result through `unwrap`.
  - It must not pass an `AbortSignal`. Under the jsdom test environment, Node's `Request` constructor rejects jsdom's `AbortSignal` ("Expected signal … to be an instance of AbortSignal").
- No token. `client.ts`'s `onRequest` skips the `window.Clerk?.session?.getToken()` call when `schemaPath === '/api/health'`, and still sets `X-Timezone`. The endpoint takes no auth, and a Clerk failure must never register as a probe failure.
- Timeout ordering. `HEALTH_PROBE_TIMEOUT_MS` must exceed `DB_CONNECT_TIMEOUT_SECONDS * 1000` (ADR 063). A source-scan test in `tests/api_tests/test_health.py` asserts this.

Connection status (ADR 063), in `frontend/src/components/shell/useConnectionStatus.ts`:

```ts
export type ConnectionStatus =
  "online" | "offline" | "unreachable" | "server_trouble";
export const HEALTH_POLL_HEALTHY_MS = 30_000;
export const HEALTH_POLL_FAILING_MS = 5_000;
export function useConnectionStatus(): ConnectionStatus;
```

- Caller: only `AppShell` calls this hook, which is what makes the health query AppShell-owned (ADR 063).
- Offline signal: `useSyncExternalStore((onChange) => onlineManager.subscribe(onChange), () => onlineManager.isOnline())`. Nothing outside tests ever calls `onlineManager.setOnline`.
- Health query: `useQuery({ queryKey: ['health'], queryFn: readHealth, retry: false, refetchInterval: (query) => (query.state.status === 'error' ? HEALTH_POLL_FAILING_MS : HEALTH_POLL_HEALTHY_MS) })`. Every other option keeps its default:
  - refetch on window focus is on
  - no polling while the tab is in the background
  - `networkMode: 'online'`, so the probe pauses while the browser is offline
- Derivation: the first matching rule gives the status.
  1. `onlineManager` reports offline: `'offline'`.
  2. The health query's `status` is `'error'` and its `error` is an `ApiError`: `'server_trouble'`, whatever the HTTP status.
  3. The health query's `status` is `'error'` for any other error: `'unreachable'`.
  4. Otherwise, whether the query is pending or succeeded: `'online'`.
- Recovery (ADR 063): an effect keeps the health query's previous `status` in a ref. When it changes from `'error'` to `'success'`, the effect calls `queryClient.refetchQueries({ type: 'active', predicate: (query) => query.state.status === 'error' })`. Nothing else triggers this, and no mutation is ever touched.

Scope of the change: implement the probe and the connection status above. Nothing mounts the hook until T5, so the app is unchanged and only these tests exercise it.

Default MSW handler: `src/test/server.ts` becomes `setupServer(http.get('*/api/health', () => HttpResponse.json({ status: 'ok' })))`. `resetHandlers` restores it, so every test that later mounts AppShell has a healthy probe by default.

`src/test/health.test.ts` (node environment):

- (a) A `200` resolves to `{ status: 'ok' }`.
- (b) With `vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })` and a handler that never resolves (`() => new Promise(() => {})`), `readHealth()` rejects with `CONNECTION_FAILED_MESSAGE`, and not with an `ApiError`, after `await vi.advanceTimersByTimeAsync(HEALTH_PROBE_TIMEOUT_MS)`.

`useConnectionStatus.test.tsx` (`// @vitest-environment jsdom`): render `function StatusProbe() { return <span data-testid="status">{useConnectionStatus()}</span>; }` through `renderWithProviders`, and reset `onlineManager.setOnline(true)` in `afterEach`.

1. Health `200` gives `online`.
2. `HttpResponse.error()` gives `unreachable`.
3. `503` with the 503 body T1 defines gives `server_trouble`.
4. An empty-body `502` gives `server_trouble`.
5. `404` with `{ detail: 'Not Found' }` gives `server_trouble`.
6. `act(() => onlineManager.setOnline(false))` gives `offline`, even with health `200`.
7. Recovery:
   - The component also runs `useQuery({ queryKey: ['target'], queryFn: failsThenSucceeds, retry: false })` and `useQuery({ queryKey: ['steady'], queryFn: succeeds })`.
   - Health returns `503`; wait for `server_trouble` and for `target` to be in error.
   - Switch health to `200` with `server.use`, then `await act(() => queryClient.refetchQueries({ queryKey: ['health'] }))`.
   - Wait for `online`. Assert `failsThenSucceeds` was called twice and `succeeds` once.
8. With `window.Clerk = { session: { getToken: vi.fn().mockResolvedValue('t') } }` set (and deleted in `afterEach`): the health request carries no Authorization header, and `getToken` is not called.

Guard test in `tests/api_tests/test_health.py`, `test_db_connect_timeout_is_shorter_than_the_probe_timeout()`:

- Read `frontend/src/api/health.ts` from the repo root (`Path(__file__).resolve().parents[2]`).
- Match `HEALTH_PROBE_TIMEOUT_MS = ([\d_]+);`, strip the underscores, and assert the value is greater than `DB_CONNECT_TIMEOUT_SECONDS * 1000`.

**Out of scope**

- Rendering anything, and mounting the hook in AppShell: T5.
- `QueryClient` defaults in `main.tsx`.
- Any `onlineManager.setOnline` call outside tests (ADR 063).
- Refetching, resuming or replaying mutations (ADR 063).

**Done when**

- The tests listed in Details exist and pass.
- `uv run pytest tests/api_tests/test_health.py` passes.
- `grep -rn "setOnline" src --include=*.ts --include=*.tsx | grep -v "\.test\."` prints nothing.

**Debrief**

None.

### T5 — AppShell shows the connection banner

**Status**

- [x]

**Goal**

AppShell renders `ConnectionBanner` at the top of its sticky header whenever `useConnectionStatus()` is not `'online'`.

**Dependencies**

- T4

**Files**

- `frontend/src/components/shell/ConnectionBanner.tsx` (new)
- `frontend/src/components/shell/AppShell.tsx`
- `frontend/src/components/shell/AppShell.test.tsx`

**Details**

Banner, in `frontend/src/components/shell/ConnectionBanner.tsx`:

- Component: the default export is `ConnectionBanner({ status }: { status: Exclude<ConnectionStatus, 'online'> })`.
- Markup: one `<div role="status" className="flex items-center gap-2 bg-(--color-warning) px-3 py-2 text-sm text-(--color-text)">` containing an `aria-hidden` icon (`h-4 w-4 shrink-0`) and the text below:

| `status` | Icon (`lucide-react`) | Text |
| --- | --- | --- |
| `offline` | `WifiOff` | You're offline. Flashy will reconnect automatically. |
| `unreachable` | `WifiOff` | Can't reach Flashy. Check your connection; retrying automatically. |
| `server_trouble` | `TriangleAlert` | Flashy is having trouble right now. Retrying automatically. |

- Placement: `AppShell` renders `{connectionStatus !== 'online' && <ConnectionBanner status={connectionStatus} />}` as the first child of its sticky `<header>`, above `<TopBar>`.

Implement the banner above. `AppShell` calls `useConnectionStatus()` exactly once.

Tests in `AppShell.test.tsx`:

- (a) A health handler that records its call and returns `200`: once the call is recorded, `queryByRole('status')` is null.
- (b) Health `503`: `findByRole('status')` contains the server-trouble text.
- (c) `HttpResponse.error()`: it contains the can't-connect text.
- (d) `act(() => onlineManager.setOnline(false))`: it contains the offline text. Reset to `true` in `afterEach`.
- The existing AppShell tests pass unchanged, relying on T4's default handler.

Browser check, using headless Chromium per AGENTS.md, with `fastapi dev` and `npm run dev` running and the ADR 007 bypass on. Load `http://localhost:5173/library`, then check:

1. No banner is shown.
2. `context.setOffline(true)` shows the offline text within 2s. After `context.setOffline(false)`, the banner is gone within 10s.
3. `page.route('**/api/health', (r) => r.abort())` and a reload show the can't-connect text within 10s. After `page.unroute`, the banner is gone within 10s.
4. `page.route('**/api/health', (r) => r.fulfill({ status: 503, contentType: 'application/json', body: '{"detail":{"code":"database_unavailable","message":"Flashy is temporarily unavailable."}}' }))` and a reload show the server-trouble text within 10s.

Never stop the shared backend or database for this check.

**Out of scope**

- New colour tokens, or icons beyond the two above.
- A dismiss button: the banner clears itself (ADR 063).
- Any page change.

**Done when**

- The four new AppShell tests pass.
- The four browser observations hold and are recorded in the Debrief.

**Debrief**

Browser check on 2026-10-01 against `/library` with headless Chromium: (1) no banner once the first probe answered; (2) the offline text appeared 6ms after `setOffline(true)` and cleared 4ms after `setOffline(false)`; (3) with the probe aborted, the can't-connect text appeared 89ms after reload and cleared 5.3s after `unroute`, on the 5s failing poll; (4) with a fulfilled 503, the server-trouble text appeared 107ms after reload.
