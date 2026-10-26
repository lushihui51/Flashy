# ADR 065: A status-carrying ApiError for every non-ok response

## Status

Active

## Context

A probe run on 2026-09-29 against openapi-fetch 0.17 showed how it reports a failure with an empty body: `error: ""` when the body is chunked, and `error: undefined` when the response carries `Content-Length: 0`. Vite's dev proxy answers a stopped backend the first way, with a `502`. `unwrap` tested `if (error)`, so both cases returned `undefined` as though the call had succeeded:

- Queries failed late with TanStack's "data is undefined".
- Mutations ran `onSuccess` with `undefined`, navigating to `/decks/undefined` or invalidating caches as though the write had happened.

Two other failure paths read badly:

- When `fetch` itself throws, openapi-fetch rethrows the browser's `TypeError` before `unwrap` sees anything, so the user reads "Failed to fetch" next to the control that failed.
- A failure with no usable detail, such as FastAPI's plain-text `500`, read "An unknown error occurred (Inspect console for details)".

Thrown errors also carried no status. Eight pages rendered every failed load as "not found", and `LibraryPage` rendered no error at all. Under ADR 062's banner, "Subject not found." during a server outage tells the user their data is gone.

## Decision

We will have `unwrap` and `unwrapVoid` decide failure by `response.ok` alone.

Every non-ok response throws an `ApiError`, which carries `status` and a message. `ApiDetailError` extends it. The message is chosen as follows:

- A structured `{code, message}` detail throws `ApiDetailError`, with `detail.message` as its message.
- A string detail, a 422 validation array, or an object carrying a `message` keeps today's formatted text.
- With no usable detail, the message is fixed: "Flashy is having trouble right now. Try again in a moment." for a `5xx`, and the existing unknown-error text otherwise.

A `fetch` that throws — a network failure, a CORS rejection, an abort — is turned into a plain `Error` carrying "Couldn't reach Flashy. Check your connection and try again." `client.ts`'s `onError` middleware does the conversion. The result is never an `ApiError`, which is how the health probe tells "no response" from "an error response".

`isNotFound(error)`, which tests for an `ApiError` with status 404, is the one 404 test. A page says "not found" only when it holds; any other failure says the content could not be loaded. Pages keep these errors inline, beneath the banner. The API layer still has no side effects.

## Alternatives considered

### Pages match message strings to spot a 404

Rejected: this breaks silently when the backend's wording changes.

### A dedicated `NotFoundError`

Rejected: a status field covers the 404 and every future case that needs one.

### Converting transport failures at each call site

Rejected: these are the per-call-site forks the typed detail error already rejected.

### Leaving pages as they were

Rejected: the contradictory copy would sit exactly where the user is looking.

### Pages hide their errors while the banner is up

Rejected: every page would be coupled to the shell, and the inline error is still true.

## Consequences

**Positive**

- The user sees empty-body failures fail visibly, and the developer gets a status on every failure.
- The user reads transport failures plainly.
- The user is no longer told their data is gone during an outage.
- The developer gets the probe's classification from the error type.

**Negative**

- The developer who string-matches messages still misses the structure, now that three error types flow from the API layer.
- The developer keeps two messages as fixed copy inside the API layer, a small exception to leaving presentation to the UI edge, accepted because they are only the default message a call site may replace.
- The developer supplies a `response` in every test that calls `unwrap` directly.
- The user still sees nothing when a query with no error branch fails, such as `DeckEditor`'s subject query; left to the banner and the recovery refetch.

**Neutral**
