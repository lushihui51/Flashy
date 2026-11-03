# ADR 089: A data router without loaders, for scroll restoration

## Status

Active

## Context

The frontend routes with `react-router-dom` 7.18.0: `App.tsx` holds one route tree, with a layout route for `AppShell` and one route per page or routed form.

Pages fetch their own data through TanStack Query, and the query cache keeps a page's data for 5 minutes after the page unmounts (ADR 088).

Return addresses ride the URL as `returnTo`, and one-shot arrival results ride router state (ADR 024).

Tests mount pages in a router through shared helpers, and jsdom does no layout (ADR 017).

Going back returns the user to the page they came from as they left it, its tab, filters and place in the list included (PDR 017).

The app restores no scroll position.

In react-router 7.18.0, `<ScrollRestoration>` throws outside a data router. A data router built with `createBrowserRouter(createRoutesFromElements(...))` takes the same route tree that `<Routes>` holds.

Under a data router, every navigation, `replace` included, gets a fresh entry and scrolls to the top unless it sets `preventScrollReset: true`.

A data router can attach loaders and actions to routes, which run outside the component tree.

The browser restores a scroll position on its own when the user goes back, before React has drawn the page.

Flashy is a single-page app behind Clerk, with no need to render on the server.

ADR 053 kept declarative mode and rejected the data router for its loaders, at the cost of `useBlocker`, which needs a data router.

## Decision

We will route with React Router's data router: `App.tsx` builds it with `createBrowserRouter(createRoutesFromElements(...))` from one route tree and mounts it with `<RouterProvider>`, and `AppShell` renders `<ScrollRestoration>`. The router maps URLs to components, carries navigation state and restores scroll positions, nothing more.

We will use no route loader or action: every fetch and mutation belongs to the page that renders it.

## Alternatives considered

### Declarative mode, with scroll restoration written by hand

Rejected because restoring a position at the right moment would be the app's own code to keep correct.

### The browser's own restoration

Rejected because it runs before React has drawn the page.

### No restoration

Rejected because it leaves the user's return to their place in a list undelivered.

### Loaders and actions on the data router

Rejected because loaders are a second fetch layer beside the query cache: the `QueryClient` would be threaded into each loader, and every page's cache keys mirrored in its loader to avoid fetching twice.

### Framework mode

Rejected because its server rendering buys nothing behind sign-in, and its file conventions would replace the `src/pages/` layout.

## Consequences

**Positive**

- The user who goes back within 5 minutes of leaving a page lands where they were.
- The developer keeps one fetch layer, with loading, error and invalidation defined once, in the page.
- The developer can guard unsaved changes with `useBlocker`.

**Negative**

- The user who goes back more than 5 minutes after leaving a page lands at the top, since the list loads after the restore.
- The user gets no route-level pending state or prefetch; each page renders its own loading state.
- The developer must opt every write to a page's own URL out of the scroll reset, or the page jumps to the top.
- The developer mounts `AppShell` in tests with `createMemoryRouter`, since `<ScrollRestoration>` throws outside a data router.

**Neutral**

- The user meets every new page at its top.
