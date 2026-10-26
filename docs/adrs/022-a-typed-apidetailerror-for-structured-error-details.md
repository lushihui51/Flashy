# ADR 022: A typed ApiDetailError for structured error details

## Status

Active

## Context

ADR 006 normalized every api-layer call through `unwrap`/`unwrapVoid`: throw a formatted `Error` or return `data`, with display left to the UI edge. Session start (`POST /api/practice_sessions`) answers failures with a structured `detail: {code, message, config_id}` (`config_not_found`, `duplicate_deck`, `stale_config`) precisely so the creation page can attribute a failure to the specific configuration row when several are selected at once. But `unwrap` flattened that object to its `message` string, so the page could not reach `code` or `config_id`. The comment in `unwrap.ts` said "callers that care read `detail` off the response themselves" — which in practice means bypassing `unwrap` and forking the error path per call site, losing the single choke point ADR 006 created.

## Decision

We will have `unwrap` and `unwrapVoid` throw `ApiDetailError`, an error subclass carrying the raw `detail` object, whenever `detail` is an object with string `code` and `message` fields. Its message is the detail's message, so a caller that does not care catches an error with a readable message, and a shape-aware caller `instanceof`-checks and reads `.detail`. The API layer still has no side effects.

## Alternatives considered

### Per-call-site bypasses of unwrap

Rejected: each structured endpoint would grow its own error-inspection fork, and the one-choke-point property that makes the api layer predictable would erode call by call.

### Error unions instead of throwing

Rejected: every existing call site and TanStack Query's thrown-error model (`isError`, `error` on queries/mutations) are built around exceptions; a union return would be a migration of the whole data layer to serve one page.

## Consequences

**Positive**

- The developer gets structured errors through one mechanism, backwards compatibly; no existing caller changes.

**Negative**

- The developer who string-matches messages instead of `instanceof`-checking silently misses the structure, now that two error types flow from the API layer.
- The developer relies on a `detail` shape guarded at runtime, not compile time, only as stable as the backend keeps it.

**Neutral**
