# ADR 099: The router's history index as the test for an earlier page

## Status

Active

## Context

The row above a page leads with a "<" that does what the browser's back does, and when there is no earlier page in Flashy to go back to, the row shows no "<", because the browser's back would leave the app (PDR 017).

The frontend routes with a data router, under which every navigation, `replace` included, gets a fresh history entry (ADR 089).

Every write to a page's URL goes through `useViewParams`, and each is a `replace` (ADR 097).

React Router gives the first entry of a page opened by its address the key `'default'`. A `replace` gives the entry a fresh key, so that page stops having the `'default'` key after a tab change.

React Router also keeps its position in the browser's history in `window.history.state.idx`. A push adds 1 to it, and it stays the same through a `replace` and a reload, so it is 0 on a page opened by its address, through tab changes and reloads.

`idx` is undocumented, and `MemoryRouter` does not write it.

`history.length` counts the entries of other sites and the entries ahead of the current one.

Router state carries a result consumed once on arrival, never anything that has to last (ADR 024). A `replace` that sets no state drops whatever state the entry held, with no error.

Component tests run in jsdom, through shared helpers that wrap a component in the router (ADR 017).

## Decision

We will show the "<" exactly when the router's position in the browser's history, `window.history.state.idx`, is above 0.

We will read that position in one function in `frontend/src/lib/`, and no other code will read it.

We will have a test run that function under a real `createBrowserRouter` in jsdom.

## Alternatives considered

### The router's default key

Rejected because any tab change on a page opened by its address replaces the `'default'` key, so the page would show a "<" that leaves the app.

### A marker carried in location state by `setParams`

Rejected because any `replace` outside the hook drops the marker with no error, and it would give router state something that has to last.

### Flashy's own record of entries in `sessionStorage`

Rejected because it repeats by hand what `idx` already holds.

### `history.length`

Rejected because it counts other sites and entries ahead of the current one, so it says nothing about an earlier page in Flashy.

## Consequences

**Positive**

- The developer writes nothing on any navigation to know whether an earlier page exists, and no write can lose the answer.

**Negative**

- The developer depends on an undocumented field of React Router, and a router upgrade that drops it fails a test and needs this decision reopened.
- The developer tests the "<" under a browser router, since the "<" does not show under `MemoryRouter`.

**Neutral**
