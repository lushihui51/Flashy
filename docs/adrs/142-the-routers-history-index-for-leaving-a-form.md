# ADR 142: The router's history index for leaving a form

## Status

Active

## Context

The row above a page holds only the places the page belongs to. No page but a form has a way back of its own, and the user goes back to the page they came from with the browser's or the phone's back. A form has no row and backs out to what opened it (PDR 064).

The frontend routes with a data router, under which every navigation, `replace` included, gets a fresh history entry (ADR 089).

Every write to a page's URL goes through `useViewParams`, and each is a `replace` (ADR 097).

Every form leaves through one function, called by Cancel, Create and Save. When there is an earlier page in Flashy, it steps back one entry to the form's opener and replaces that entry with the address chosen; otherwise it replaces the form's own entry (ADR 124).

Stepping back from a page with no earlier page in Flashy leaves Flashy.

Router state carries a result consumed once on arrival, never anything that has to last (ADR 124). A `replace` that sets no state drops whatever state the entry held, with no error.

React Router gives the first entry of a page opened by its address the key `'default'`. A `replace` gives the entry a fresh key, so that page stops having the `'default'` key at its first write to its own URL.

React Router also keeps its position in the browser's history in `window.history.state.idx`. A push adds 1 to it, and it stays the same through a `replace` and a reload, so it is 0 on a page opened by its address, through every write to its URL and every reload.

`idx` is undocumented, and `MemoryRouter` does not write it.

`history.length` counts the entries of other sites and the entries ahead of the current one.

Component tests run in jsdom, through shared helpers that wrap a component in the router (ADR 017).

`hasEarlierPage()` in `frontend/src/lib/historyIndex.ts` reads `idx`. `Breadcrumb` calls it to draw a "<" on a deck's page, a practice's page and the run page, and `useLeaveForm` calls it to choose between stepping back and replacing.

ADR 099 showed a "<" exactly when `idx` is above 0, and read it in one function. PDR 064 takes the "<" away, so this record restates ADR 099 for leaving a form alone.

## Decision

We will test whether there is an earlier page in Flashy by the router's position in the browser's history, `window.history.state.idx`, being above 0, and use the test only to decide whether a form leaves by stepping back to its opener.

We will read that position in one function, `hasEarlierPage()` in `frontend/src/lib/historyIndex.ts`, and no other code will read it.

We will have a test run that function under a real `createBrowserRouter` in jsdom.

## Alternatives considered

### A "<" whenever the test holds

Rejected because no page but a form has a way back of its own.

### `idx` read inside the function that leaves a form, with `historyIndex.ts` deleted

Rejected because the next reader of `idx` would find no named, tested function.

### The router's default key

Rejected because a form opened by its address loses the `'default'` key at its first write to its own URL, and leaving it would then step back out of Flashy.

### A marker carried in location state by `setParams`

Rejected because any `replace` outside the hook drops the marker with no error, and it would give router state something that has to last.

### Flashy's own record of entries in `sessionStorage`

Rejected because it repeats by hand what `idx` already holds.

### `history.length`

Rejected because it counts other sites and entries ahead of the current one, so it says nothing about an earlier page in Flashy.

## Consequences

**Positive**

- The developer writes nothing on any navigation to know whether a form has an opener to step back to, and no write can lose the answer.
- The developer finds the one reader of an undocumented field named and tested in one module.

**Negative**

- The developer depends on an undocumented field of React Router, and a router upgrade that drops it fails a test and needs this decision reopened.
- The developer tests a form's leaving under a browser router, since `MemoryRouter` does not write `idx`.

**Neutral**

- The developer finds `Breadcrumb` drawing its places with no test for an earlier page.
