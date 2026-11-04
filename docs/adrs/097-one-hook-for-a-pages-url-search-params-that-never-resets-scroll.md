# ADR 097: One hook for a page's URL search params, that never resets scroll

## Status

Active

## Context

Under the data router, every navigation, `replace` included, gets a fresh entry and scrolls to the top unless it sets `preventScrollReset: true`, and a position is saved only when the user leaves an entry (ADR 089).

Going back returns the user to the page as they left it, its tab, filters and place in the list included (PDR 017).

AGENTS.md keeps a page's view state in its URL.

Eleven `setSearchParams` call sites write a page's URL, among them New practice's draft name on every keystroke and its selection toggles, and the run page's card state adds more.

`returnTo` is read from a page's search params only through `internalReturnTo` in `frontend/src/lib/returnTo.ts`, which takes a `URLSearchParams` (ADR 024).

One API is already confined to one module by an ESLint rule: `frontend/src/lib/datetime.ts` is the only module allowed to format a date (ADR 019).

After a tab or filter change, the new list's first two rows are to be on screen with the control just tapped still in view, the page moving only as far as that takes, and not at all when both are already in view.

`AppShell`'s header is sticky, so content starts at the header's bottom edge, not at the top of the viewport.

The header grows when `ConnectionBanner` shows.

New practice has a sticky row of its own below the header, the only such row on a page that reveals a list.

A sticky row not yet stuck sits below its stuck place, by any distance on a page where it sits further down.

`scrollIntoView({ block: 'nearest' })` ignores a sticky header unless its target sets a scroll margin.

jsdom does no layout (ADR 017).

## Decision

We will make `useViewParams()` in `frontend/src/lib/viewParams.ts` the only code that reads or writes a page's URL search params, and make every other import of `useSearchParams` an ESLint error through `no-restricted-imports`. Every write it makes is `replace` with `preventScrollReset: true`.

It offers two writes. `setParams(next)` writes without moving the page, and every write but a change to what a page's list shows goes through it. `changeView(next, { control, listStart })` writes a change to a list's tab, filters, chosen counts or order, then, on the first commit where the page reports its list rendered for the new params, scrolls by `revealDelta`.

`revealDelta` is a pure function of the viewport, the top of the band in view, the control's rect, and the rects of the list's first two rows, or of the whole list when it is shorter. It returns the smallest scroll that puts all of them in view, 0 when they already are, and keeps the control in view first when they do not all fit. Node unit tests pin it.

We will mark every sticky element a reveal must clear with `data-reveal-clear`. `changeView` reads only the marked elements on the page it runs on, and takes the greatest stuck bottom among them, each being its computed sticky `top` plus its height, as the top of the band in view.

## Alternatives considered

### `preventScrollReset` passed at each call site and held by a source scan

Rejected because a call that builds its options elsewhere slips past the scan and jumps to the top without anyone noticing.

### `<ScrollRestoration>` keyed by pathname

Rejected because two history entries on one path would share a position, so a page reached anew would open where the user last left it, and it gives no reveal.

### `scrollIntoView({ block: 'nearest' })` on the list's start

Rejected because it ignores the sticky header unless every list sets a scroll margin, and on a short screen it can push the tapped control off the top.

### The header's bottom alone

Rejected because a sticky row below the header would cover the control just tapped.

### The page passing its sticky row to each `changeView` call

Rejected because every call can forget it.

### A constant for the row's height

Rejected because it goes wrong when a height changes.

### The greatest current bottom edge

Rejected because it puts the band's top wherever a row not yet stuck happens to sit.

## Consequences

**Positive**

- The user's write to a page's own URL never moves the page, except a change to what its list shows, which moves it only as far as needed.
- The developer cannot write a page's URL any other way without failing lint.
- The developer tests the reveal's arithmetic without layout.
- The developer's marked sticky row is cleared with no change to any `changeView` call, wherever it sits on the page.

**Negative**

- The developer who sends a change to what a list shows through `setParams` gets a page that stays put instead of revealing, and nothing fails.
- The developer moves eleven call sites to the hook once.
- The developer who leaves unmarked a sticky row a reveal must clear hides the control from the user, and nothing fails.

**Neutral**

- The developer reading `returnTo` passes the hook's params to `internalReturnTo`.
