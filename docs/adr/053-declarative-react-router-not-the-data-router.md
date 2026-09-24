# ADR 053: React Router runs in declarative mode, not as a data router

## Status

Accepted

## Context

The frontend routes with `react-router-dom` 7: `App.tsx` mounts a `<BrowserRouter>` around one `<Routes>` tree, with a layout route for `AppShell` and one `<Route>` per page or routed form. Pages fetch their own data through TanStack Query (ADR 033); return addresses ride the URL and one-shot results ride `useLocation().state` (ADR 024); tabs and filters live in `useSearchParams` (ADR 025); tests mount pages in a `MemoryRouter` through `renderWithRouter`. Nothing calls `createBrowserRouter`, `RouterProvider`, a route `loader` or `action`, `useLoaderData`, or `useFetcher`. The library predates the rebuild (task 002's keep list) and task 008 removed a redundant `react-router` entry, so the mode was inherited rather than chosen. React Router 7 offers three modes and its documentation steers new apps to the data or framework mode, so the choice needs a record.

## Decision

React Router stays in declarative mode. Routing is `<BrowserRouter>` plus a `<Routes>` tree in `App.tsx`; the router maps URLs to components and carries navigation state, nothing more. Route loaders and actions are not used: every fetch and mutation belongs to the page that renders it, under ADR 033.

## Alternatives considered

### Data router (`createBrowserRouter` with loaders and actions)

Rejected. Loaders are a second fetch layer beside the query cache: they run outside the component tree, so the `QueryClient` would have to be threaded into each loader, and every page would need its cache keys mirrored in a loader to avoid double fetching. The app has a dozen routes and per-page queries; route-level data adds a layer without removing one.

### Framework mode (the Vite plugin, file routes, SSR)

Rejected. Flashy is a signed-in SPA behind Clerk with no rendering-on-the-server requirement, and the router's framework conventions would replace the `src/pages/` and area-directory layout AGENTS.md records for no gain.

## Consequences

Benefits:

- One fetch layer. Loading, error, and invalidation behaviour is defined once, in the page, under ADR 033 and ADR 035.
- Tests mount a page in a `MemoryRouter` with no loader plumbing.

Costs:

- Declarative mode has no route-level pending UI or prefetch; each page renders its own loading state.
- `useBlocker` requires a data router, so unsaved-changes guards are implemented at a form's own exits (its Cancel and back controls), not on arbitrary browser navigation.
