# ADR 097: One hook for a page's URL search params, that never resets scroll

## Status

Active

## Context

Under the data router, every navigation, `replace` included, gets a fresh entry and scrolls to the top unless it sets `preventScrollReset: true`, and a position is saved only when the user leaves an entry (ADR 089).

Going back returns the user to the page as they left it, its tab, filters and place in the list included (PDR 017).

AGENTS.md keeps a page's view state in its URL.

Eleven `setSearchParams` call sites write a page's URL, among them New practice's draft name on every keystroke and its selection toggles, and the run page's card state adds more.

A form's return addresses, `cancelTo` and `returnTo`, are read from a page's search params only through `internalReturnTo` in `frontend/src/lib/returnTo.ts`, which takes a `URLSearchParams` (ADR 103).

One API is already confined to one module by an ESLint rule: `frontend/src/lib/datetime.ts` is the only module allowed to format a date (ADR 019).

After a tab or filter change, the new list's first two rows are to be on screen with the control just tapped still in view, the page moving only as far as that takes, and not at all when both are already in view.

`AppShell`'s header is sticky, so content starts at the header's bottom edge, not at the top of the viewport, and the header grows when `ConnectionBanner` shows.

Every form holds Cancel and Create or Save in a bar fixed to the viewport's foot, which always carries `data-reveal-clear` (ADR 100). An element fixed at the foot has `top: auto`, which parses to 0.

A sticky element not yet stuck sits below its stuck place, by any distance on a page where it sits further down.

New practice is the only form with a list and a `changeView` call.

Create or Save sits in the bar at the foot (PDR 032), so on a form long enough to scroll, a part of the form and the sentence beside it can be far above the bar, off screen. A failed Create or Save puts its sentence in the bar above the buttons, and a sentence about one part of the form sits beside that part.

When the user taps Create or Save while a sentence about one part of the form is off screen, the page is to move just far enough to bring the first such part and its sentence on screen.

New practice's Create, the configuration form's and the card form's are `disabled` while not ready, and the deck form's Save while a field's name is blank or duplicated, so a tap fires nothing; only the subject form's button is pressable, reading not ready through `aria-disabled`.

Every refusal a user reaches carries a code, and the frontend chooses its sentence by that code; where the sentence goes was not decided there (ADR 070). Three refusals name one part of a form, `subject_name_taken`, `deck_name_taken` and `configuration_name_taken`, each about the Name input. `configuration_name_taken` renders beside that input today, and the other two render at the top of the form.

`scrollIntoView({ block: 'nearest' })` ignores a sticky header and a fixed bar unless its target sets a scroll margin for each. No code calls `scrollIntoView`.

jsdom does no layout (ADR 017).

## Decision

We will make `useViewParams()` in `frontend/src/lib/viewParams.ts` the only code that reads or writes a page's URL search params, and make every other import of `useSearchParams` an ESLint error through `no-restricted-imports`. Every write it makes is `replace` with `preventScrollReset: true`.

It offers two writes and one reveal. `setParams(next)` writes without moving the page, and every write but a change to what a page's list shows goes through it. `changeView(next, { control, listStart })` writes a change to a list's tab, filters, chosen counts or order, then, on the first commit where the page reports its list rendered for the new params, scrolls by `revealDelta`. `reveal(targets)` takes the same targets, a part of a form as the control and its sentence as the rows, scrolls by `revealDelta` within the same band, and writes nothing to the URL.

A form calls `reveal` when the user taps a Create or Save that is not ready, and when a refusal names one part, for the first part in document order whose sentence shows. A Create or Save that is not ready stays pressable and reads not ready through `aria-disabled`; `disabled` is only for a request in flight. A refusal that names one part of the form renders beside that part and is a part; every other refusal is the bar's sentence.

`revealDelta` is a pure function of the band in view, its top and its bottom, the control's rect, and the rects of the list's first two rows, or of the whole list when it is shorter. It returns the smallest scroll that puts all of them in view, 0 when they already are, and keeps the control in view first when they do not all fit. Node unit tests pin it.

We will mark every stuck element a reveal must clear, at either edge, with `data-reveal-clear`, the one mark. A reveal reads only the marked elements on the page it runs on, and reads each one's side from its computed position: one with a numeric `top` raises the band's top to its stuck bottom, its `top` plus its height, taking the greatest; one with a numeric `bottom` lowers the band's bottom to its rect's top, taking the least.

## Alternatives considered

### `preventScrollReset` passed at each call site and held by a source scan

Rejected because a call that builds its options elsewhere slips past the scan and jumps to the top without anyone noticing.

### `<ScrollRestoration>` keyed by pathname

Rejected because two history entries on one path would share a position, so a page reached anew would open where the user last left it, and it gives no reveal.

### `scrollIntoView({ block: 'nearest' })` on the target

Rejected because it ignores the sticky header and the fixed bar unless every target carries a scroll margin for both, and on a short screen it can push the control off the top.

### The header's bottom alone

Rejected because a stuck element below the header would cover the control just tapped.

### The page passing its stuck elements, or the bar's height, into each `changeView` call

Rejected because every call can forget it.

### A constant for a stuck element's height

Rejected because it goes wrong when a height changes.

### The greatest current bottom edge

Rejected because it puts the band's top wherever an element not yet stuck happens to sit.

### A second mark for an element stuck at the foot

Rejected because the next developer must know it, and can put it on the wrong side with no error.

### The viewport's bottom as the band's bottom

Rejected because it leaves the list's second row behind the bar on a short screen, with nothing failing.

### `disabled` kept on a not-ready button

Rejected because a tap fires nothing, so the page cannot move to the part that is not ready.

### A hook of its own for the reveal on a tap of Create or Save

Rejected because it is a second copy of the arithmetic.

### The refusals that name one part left in the bar

Rejected because it puts a sentence about the Name input at the foot.

## Consequences

**Positive**

- The user's write to a page's own URL never moves the page, except a change to what its list shows, which moves it only as far as needed.
- The user who taps Create or Save with a problem off screen is brought to the first problem and the place to fix it, clear of the header and of the bar.
- The developer cannot write a page's URL any other way without failing lint.
- The developer tests the reveal's arithmetic without layout.
- The developer's marked element is cleared with no change to any `changeView` or `reveal` call, wherever it sits and at whichever edge.
- The developer serves a filter change and a tap of Create or Save from one arithmetic and one band.

**Negative**

- The developer who sends a change to what a list shows through `setParams` gets a page that stays put instead of revealing, and nothing fails.
- The developer moves eleven call sites to the hook once.
- The developer who leaves unmarked a stuck element a reveal must clear, at either edge, hides the control or a row from the user, and nothing fails.
- The developer who keeps a not-ready Create or Save `disabled` leaves a tap doing nothing, and nothing fails.
- The user with two problems on a form meets the second only after fixing the first.

**Neutral**

- The developer reading `cancelTo` or `returnTo` passes the hook's params to `internalReturnTo`.
- The developer reads a marked element's side from its computed position, never from a second attribute.
