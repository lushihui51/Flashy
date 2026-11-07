# ADR 053: Declarative mode for React Router

## Status

Superseded by ADR 089

## Context

The frontend routes with `react-router-dom` 7: `App.tsx` mounts a `<BrowserRouter>` around one `<Routes>` tree, with a layout route for `AppShell` and one `<Route>` per page or routed form. Pages fetch their own data through TanStack Query (ADR 033); return addresses ride the URL and one-shot results ride `useLocation().state` (ADR 024); tabs and filters live in `useSearchParams` (ADR 025); tests mount pages in a `MemoryRouter` through `renderWithRouter`. Nothing calls `createBrowserRouter`, `RouterProvider`, a route `loader` or `action`, `useLoaderData`, or `useFetcher`. The library predates the rebuild, so the mode was inherited rather than chosen. React Router 7 offers three modes and its documentation steers new apps to the data or framework mode, so the choice needs a record.

## Decision

We will keep React Router in declarative mode: routing is `<BrowserRouter>` plus a `<Routes>` tree in `App.tsx`; the router maps URLs to components and carries navigation state, nothing more. Route loaders and actions are not used: every fetch and mutation belongs to the page that renders it.

## Alternatives considered

### Data router (`createBrowserRouter` with loaders and actions)

Rejected. Loaders are a second fetch layer beside the query cache: they run outside the component tree, so the `QueryClient` would have to be threaded into each loader, and every page would need its cache keys mirrored in a loader to avoid double fetching. The app has a dozen routes and per-page queries; route-level data adds a layer without removing one.

### Framework mode (the Vite plugin, file routes, SSR)

Rejected. Flashy is a signed-in SPA behind Clerk with no rendering-on-the-server requirement, and the router's framework conventions would replace the `src/pages/` and area-directory layout AGENTS.md records for no gain.

## Consequences

**Positive**

- The developer has one fetch layer, with loading, error, and invalidation behaviour defined once, in the page.
- The developer mounts a page in a `MemoryRouter` in tests with no loader plumbing.

**Negative**

- The user gets no route-level pending UI or prefetch; each page renders its own loading state.
- The developer implements unsaved-changes guards at a form's own exits, since `useBlocker` requires a data router.

**Neutral**
