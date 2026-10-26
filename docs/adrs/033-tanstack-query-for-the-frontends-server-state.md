# ADR 033: TanStack Query for the frontend's server state

## Status

Active

## Context

Every data-bearing page in the rebuilt frontend fetches through `@tanstack/react-query`: a single default-configured `QueryClient` is created in `main.tsx` and provided app-wide, pages own `useQuery`/`useMutation` calls, and writes are followed by key-based invalidation (`['decks']`, `['practice_sessions']`, …) rather than manual refetch or local mirroring. Several accepted records already lean on this without adopting it anywhere: ADR 006's side-effect-free api layer throws for "the caller" to handle — the caller is a query or mutation; ADR 017's test recipe wraps components in a `QueryClientProvider` over MSW; ADR 022's typed `ApiDetailError` is caught from mutation state; AGENTS.md's "reusable components do not fetch — the page owns the query" rule presumes a query layer to own. The library predates the rebuild, so the choice was inherited rather than recorded. This ADR closes that gap.

## Decision

We will make TanStack Query the frontend's server-state layer. Server data lives in the query cache, keyed by resource; pages and routed forms own their queries and mutations; mutations invalidate the affected keys inside the same component. No server response is copied into long-lived component state or a global store; `useState` holds UI state only.

## Alternatives considered

### Hand-rolled `useEffect` and `useState` fetching

Rejected: every page would re-implement caching, deduplication, loading/error state, and refetch-after-write; the invalidation flow the app relies on is exactly what the library provides.

### A global client store

Rejected: the app has no client-only global state worth a store; putting server data in one recreates cache invalidation by hand, which is the problem being avoided.

## Consequences

**Positive**

- The developer uses one idiom for every fetch site, invalidation by key that matches the REST resource shapes, and tests get deterministic data by wrapping a fresh `QueryClientProvider` over MSW.

**Negative**

- The developer leaves the default `QueryClient` configuration, retries and staleness, implicit until something forces tuning it.
- The developer relies on stringly-typed query keys; a typo silently misses invalidation.

**Neutral**
