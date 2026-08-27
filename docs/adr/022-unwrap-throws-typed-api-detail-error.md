# ADR 022: unwrap throws a typed ApiDetailError for structured error details

## Status

Accepted

## Context

ADR 006 normalized every api-layer call through `unwrap`/`unwrapVoid`: throw a formatted `Error` or return `data`, with display left to the UI edge. Session start (`POST /api/practice_sessions`) answers failures with a structured `detail: {code, message, config_id}` (`config_not_found`, `duplicate_deck`, `stale_config`) precisely so the creation page can attribute a failure to the specific configuration row when several are selected at once. But `unwrap` flattened that object to its `message` string, so the page could not reach `code` or `config_id`. The comment in `unwrap.ts` said "callers that care read `detail` off the response themselves" — which in practice means bypassing `unwrap` and forking the error path per call site, losing the single choke point ADR 006 created.

## Decision

`unwrap` and `unwrapVoid` throw `ApiDetailError` — an `Error` subclass carrying the raw `detail` object — whenever `detail` is an object with string `code` and `message` fields. `Error.message` stays exactly what `formatError` produces today. Callers that do not care catch an `Error` with an unchanged message; shape-aware callers `instanceof`-check and read `.detail`. The api layer still has no side effects (no `console.error`, no toast) — ADR 006's boundary is unchanged.

### Alternative considered: per-call-site bypasses of unwrap

Rejected: each structured endpoint would grow its own error-inspection fork, and the one-choke-point property that makes the api layer predictable would erode call by call.

### Alternative considered: return error unions instead of throwing

Rejected: every existing call site and TanStack Query's thrown-error model (`isError`, `error` on queries/mutations) are built around exceptions; a union return would be a migration of the whole data layer to serve one page.

## Consequences

Benefits:

- Structured errors reach the UI through one mechanism, backwards compatibly — no existing caller changes.

Costs:

- Two error types now flow from the api layer; a caller that string-matches messages instead of `instanceof`-checking silently misses the structure.
- The `detail` shape is guarded at runtime, not compile time — it is only as stable as the backend keeps it.
