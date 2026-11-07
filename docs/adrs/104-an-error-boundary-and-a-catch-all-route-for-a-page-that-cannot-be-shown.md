# ADR 104: An error boundary and a catch-all route for a page that cannot be shown

## Status

Active

## Context

When the failure is the page itself, because its address leads to no page or because the page failed while it was being drawn, the sentence takes the place of the whole page's content below the top bar; the top bar, the menu and the connection banner stay; the user goes on by the menu or by the browser's back; and the page is never drawn again on its own, so the user who tries again reloads it in the browser. Every smaller failure is met in place, and nothing pops up over the page (PDR 031).

`App.tsx` builds one route tree on a data router, a layout route rendering `AppShell` with every page as its child, and no loader or action (ADR 089).

`AppShell` owns the connectivity state and renders the banner (ADR 063).

A page owns its queries and mutations (ADR 088), and a failed request is an error the page renders inline, beneath the banner (ADR 065).

The two sentences for a page that cannot be shown are rows of `docs/vocabulary.md`, like every sentence the app says (ADR 069).

`App.tsx` has no `errorElement`, no route with path `*` and no component catching a render error, so an address with no page and a page that throws while drawing each show React Router's own screen in place of the shell, in its own words.

Under React Router, an `errorElement` on a route renders in place of that route's element when a descendant throws while rendering, resets on the next navigation, and never retries a render. A pathless route groups its children under one element without adding a path segment. A route with path `*` matches any address no sibling matches.

An `errorElement` on the `AppShell` route itself would render in place of the shell. A boundary written as a component inside `AppShell` would be the app's own, reset by hand on each location change.

AGENTS.md's hard rule on failures allows no error boundary, on the strength of PDR 002, which PDR 031 supersedes.

## Decision

We will give the route tree in `frontend/src/App.tsx` one error boundary: a pathless route between the `AppShell` layout route and the pages, carrying an `errorElement` that renders, in the place of the page's content and under the shell, the vocabulary's sentence for a page that failed while it was being drawn.

We will add a last child route with path `*`, which renders the vocabulary's sentence for an address that leads to no page, in the same place.

The boundary catches a throw while rendering and nothing from a request: a failed query or mutation stays the page's state, rendered inline. We will write no reset key, retry or reload, since the router resets the boundary on the next navigation and never retries a render.

We will add no other error boundary. This route is the one exception to rendering every failure where it happened.

## Alternatives considered

### A boundary of the app's own around the outlet in `AppShell`

Rejected because it resets by hand on the location and still needs the `*` route.

### An `errorElement` on the `AppShell` route

Rejected because it takes the shell down with the page.

### The `*` route alone

Rejected because it leaves a page that breaks while drawing to the router's own screen.

### No boundary

Rejected because it leaves both failures on the router's own screen, outside the shell and in words the vocabulary does not give.

### A reset key, retry or reload on the boundary

Rejected because the page is never drawn again on its own; the user reloads it.

## Consequences

**Positive**

- The user who follows an address with no page, or meets a page that throws while drawing, stays under the top bar, the menu and the banner, and reads one sentence of Flashy's.
- The developer writes no boundary logic, since the router resets it on navigation.
- The developer keeps every request's failure inline, with no handler to maintain.

**Negative**

- The user who meets a page that broke loses everything the page showed, and reloads it in the browser to try again.
- The developer carries one named exception in AGENTS.md's rule on failures.

**Neutral**

- The developer finds the boundary as a route in the tree, a sibling of no page and a parent of all of them.
