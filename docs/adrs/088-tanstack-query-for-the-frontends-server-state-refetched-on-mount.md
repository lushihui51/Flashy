# ADR 088: TanStack Query for the frontend's server state, refetched on mount

## Status

Active

## Context

Every data-bearing page fetches through `@tanstack/react-query`: one `QueryClient`, created in `frontend/src/main.tsx`, is provided app-wide, pages own their `useQuery` and `useMutation` calls, and writes are followed by invalidation by key rather than by manual refetching or local mirroring.

The API layer throws on failure and leaves handling to its caller, which is a query or a mutation (ADR 006).

Component tests wrap a fetching component in a fresh `QueryClientProvider` over MSW (ADR 017).

A typed `ApiDetailError` is caught from a mutation's state (ADR 022).

AGENTS.md has reusable components receive server data as props from the page that owns the query.

The `QueryClient` keeps TanStack Query's defaults: a query's data is stale as soon as it arrives, so a query refetches whenever a component using it mounts, and its data is kept for 5 minutes after the last such component unmounts.

Home shows a step ticked as soon as its thing exists, wherever the user made it (PDR 016), so Home's read reflects writes made from every other page.

ADR 033 made TanStack Query the server-state layer and left the client's defaults implicit.

## Decision

We will make TanStack Query the frontend's server-state layer. Server data lives in the query cache, keyed by resource; pages and routed forms own their queries and mutations; mutations invalidate the affected keys inside the same component. We will copy no server response into long-lived component state or a global store, and keep `useState` for UI state only.

A query whose page is not mounted needs no invalidation from elsewhere: it refetches when its page next mounts, and we will keep TanStack Query's default staleness of zero for that.

## Alternatives considered

### Hand-rolled `useEffect` and `useState` fetching

Rejected because every page would re-implement caching, deduplication, loading and error state, and refetching after a write, which is what the library provides.

### A global client store

Rejected because the app has no client-only global state worth a store, and putting server data in one recreates cache invalidation by hand.

### Every mutation invalidating every key it affects, on any page

Rejected because, with a staleness of zero, a query that is not mounted refetches on its next mount anyway, and every write would have to name every page that shows what it changed, including pages added later.

### A staleness above zero, to save requests

Rejected because a page that composes what other pages write would show data from before those writes until each of them invalidated its key.

## Consequences

**Positive**

- The developer uses one idiom for every fetch site, invalidation by key matching the REST resource shapes, and tests get deterministic data by wrapping a fresh `QueryClientProvider` over MSW.
- The developer adds a page that composes several resources without adding its key to every mutation that changes one of them.

**Negative**

- The developer relies on query keys written as strings, and a typo silently misses invalidation.
- The server receives a refetch every time a page mounts, even when nothing has changed.
- The developer leaves retries and the 5-minute cache time implicit until something forces tuning them.

**Neutral**

- The developer who wants a staleness above zero must first give each page's query an invalidation from every write that changes it.
