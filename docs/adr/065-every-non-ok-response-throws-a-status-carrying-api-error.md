# ADR 065: Every non-ok response throws a status-carrying ApiError

## Status

Accepted. Implemented by task 020.

- **Amends ADR 006:** `unwrap` and `unwrapVoid` decide failure by `response.ok`, not by whether `error` is set. A request that got no response is turned into readable text by `client.ts`'s `onError` middleware.
- **Amends ADR 022:** `ApiDetailError` becomes a subclass of `ApiError`, so every thrown API failure carries its HTTP status.

## Context

A probe run on 2026-09-29 against openapi-fetch 0.17 showed how it reports a failure with an empty body: `error: ""` when the body is chunked, and `error: undefined` when the response carries `Content-Length: 0`. Vite's dev proxy answers a stopped backend the first way, with a `502`. `unwrap` tested `if (error)`, so both cases returned `undefined` as though the call had succeeded:

- Queries failed late with TanStack's "data is undefined".
- Mutations ran `onSuccess` with `undefined`, navigating to `/decks/undefined` or invalidating caches as though the write had happened.

Two other failure paths read badly:

- When `fetch` itself throws, openapi-fetch rethrows the browser's `TypeError` before `unwrap` sees anything, so the user reads "Failed to fetch" next to the control that failed.
- A failure with no usable detail, such as FastAPI's plain-text `500`, read "An unknown error occurred (Inspect console for details)".

Thrown errors also carried no status. Eight pages rendered every failed load as "not found", and `LibraryPage` rendered no error at all. Under ADR 062's banner, "Subject not found." during a server outage tells the user their data is gone.

## Decision

`unwrap` and `unwrapVoid` decide failure by `response.ok` alone.

Every non-ok response throws an `ApiError`, which carries `status` and a message. `ApiDetailError` (ADR 022) extends it. The message is chosen as follows:

- A structured `{code, message}` detail throws `ApiDetailError`, with `detail.message` as its message.
- A string detail, a 422 validation array, or an object carrying a `message` keeps today's formatted text.
- With no usable detail, the message is fixed: "Flashy is having trouble right now. Try again in a moment." for a `5xx`, and the existing unknown-error text otherwise.

A `fetch` that throws — a network failure, a CORS rejection, an abort — is turned into a plain `Error` carrying "Couldn't reach Flashy. Check your connection and try again." `client.ts`'s `onError` middleware does the conversion. The result is never an `ApiError`, which is how ADR 063's probe tells "no response" from "an error response".

`isNotFound(error)`, which tests for an `ApiError` with status 404, is the one 404 test. A page says "not found" only when it holds; any other failure says the content could not be loaded. Pages keep these errors inline, beneath the banner (ADR 035, ADR 062). The API layer still has no side effects (ADR 006).

## Alternatives considered

### Pages match message strings to spot a 404

Rejected: this breaks silently when the backend's wording changes.

### A dedicated `NotFoundError`

Rejected: a status field covers the 404 and every future case that needs one.

### Converting transport failures at each call site

Rejected: these are the per-call-site forks ADR 022 already rejected.

### Leaving pages as they were

Rejected: the contradictory copy would sit exactly where the user is looking.

### Pages hide their errors while the banner is up

Rejected: every page would be coupled to the shell, and the inline error is still true.

## Consequences

Benefits:

- Empty-body failures fail visibly, and every failure carries its status.
- Transport failures read plainly.
- Pages no longer tell users their data is gone.
- The probe's classification falls out of the error type.

Costs:

- Three error types now flow from the API layer: a plain `Error` for no response, `ApiError`, and `ApiDetailError`. A caller that string-matches messages still misses the structure.
- Two messages are fixed copy inside the API layer. ADR 006 left presentation to the UI edge; this is a small exception, accepted because they are only the default message, which a call site may still replace.
- Every test that calls `unwrap` directly now has to supply a `response`.
- Queries with no error branch, such as `DeckEditor`'s subject query, still render nothing when they fail. Task 020 leaves them to the banner and ADR 063's recovery refetch.
