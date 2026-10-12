# ADR 033: TanStack Query owns server state on the frontend

## Status

Accepted

## Context

Every data-bearing page in the rebuilt frontend fetches through `@tanstack/react-query`: a single default-configured `QueryClient` is created in `main.tsx` and provided app-wide, pages own `useQuery`/`useMutation` calls, and writes are followed by key-based invalidation (`['decks']`, `['practice_sessions']`, …) rather than manual refetch or local mirroring. Several accepted records already lean on this without adopting it anywhere: ADR 006's side-effect-free api layer throws for "the caller" to handle — the caller is a query or mutation; ADR 017's test recipe wraps components in a `QueryClientProvider` over MSW; ADR 022's typed `ApiDetailError` is caught from mutation state; AGENTS.md's "reusable components do not fetch — the page owns the query" rule presumes a query layer to own. The library predates the rebuild (it survived task 002's P0 keep-list), so the choice was inherited rather than recorded. This ADR closes that gap.

## Decision

TanStack Query is the frontend's server-state layer. Server data lives in the query cache, keyed by resource; pages and routed forms own their queries and mutations; mutations invalidate the affected keys inside the same component. No server response is copied into long-lived component state or a global store — `useState` holds UI state only (form drafts, dialog flags, transient error strings).

### Alternative considered: hand-rolled `useEffect` + `useState` fetching

Rejected: every page would re-implement caching, deduplication, loading/error state, and refetch-after-write; the invalidation flow the app relies on (one mutation, several stale lists) is exactly what the library provides.

### Alternative considered: a global client store (Redux and similar)

Rejected: the app has no client-only global state worth a store; putting server data in one recreates cache invalidation by hand, which is the problem being avoided.

## Consequences

Benefits:

- One idiom for every fetch site; invalidation-by-key matches the REST resource shapes; tests get deterministic data by wrapping a fresh `QueryClientProvider` over MSW.

Costs:

- The default `QueryClient` configuration (retries, staleness) is implicit until something forces tuning it.
- Query keys are stringly-typed conventions; a typo silently misses invalidation.
