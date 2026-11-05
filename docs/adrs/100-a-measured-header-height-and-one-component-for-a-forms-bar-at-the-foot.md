# ADR 100: A measured header height and one component for a form's bar at the foot

## Status

Active

## Context

`AppShell`'s header is sticky and holds the top bar, the search bar and, when it shows, `ConnectionBanner`.

`AppShell` owns the connectivity state that decides when the banner shows, so the banner comes and goes while the app runs (ADR 063).

The banner's height depends on the screen's width. With the banner showing, the header's bottom is 172 at 390 wide and 152 at 1280 wide.

Every form holds Cancel and Create or Save in a bar at the foot of the screen, which stays at the foot while the page scrolls, and a form holds the same bar however it was opened, from its own entry or over another form (PDR 032).

Five forms, the subject, deck, card and configuration forms and New practice, hold their buttons today in `StickyPageRow`, a row that sticks under the header. The subject form inside the deck form's overlay draws a plain row.

The deck form's overlay is `FullScreenDialog` in `frontend/src/components/ui/FullScreenDialog.tsx`, which is `fixed inset-0 overflow-y-auto`, so the overlay scrolls on its own, and a bar on it and a bar on the deck form beneath are mounted at once. The overlay form has no shell of its own.

The bar's height changes while the app runs: on New practice a count of the chosen configurations sits on a line above the buttons, and on every form a failed Create or Save puts its sentence above the buttons until the user tries again.

A routed page is sized to its content, not the viewport. An element with `position: sticky; bottom: 0` as a page's last child sits where the flow puts it, so on a page shorter than the viewport it sits under the last field rather than at the foot.

A CSS variable on the document root reaches every element. `--app-header-height` is read by `SideDrawer`'s top padding and by `bandTop()` in `frontend/src/lib/viewParams.ts`.

Every modal overlay, the drawer and the sheets included, is a Radix Dialog with a scrim of its own drawn over the page (ADR 016).

Every element a reveal must clear carries `data-reveal-clear` (ADR 097).

`<ScrollRestoration>` restores the window's scroll position, not that of an element inside the page (ADR 089).

Where the banner is drawn is something the user sees.

jsdom does no layout, so no component test can see where a bar sits or how tall its spacer is (ADR 017).

jsdom has no `ResizeObserver`, and `src/test/setup.ts` keeps a stub of it for every test file (ADR 098).

## Decision

We will have `AppShell` measure its header with a `ResizeObserver` and write the height to one CSS variable on the document root, `--app-header-height`.

We will hold every form's bar in one component, `FormBar` in `frontend/src/components/ui/FormBar.tsx`, fixed to the viewport's foot beneath the drawer's and the sheets' scrims, which always carries `data-reveal-clear`, whether or not its page reveals a list.

The bar measures its own height with a `ResizeObserver` and renders a spacer of that height in the page's flow where the form's content ends, and writes nothing to the document root.

Each instance is self-contained, so a form opened over another form carries a bar of its own.

We will keep the banner in `AppShell`.

## Alternatives considered

### One fixed variable for the header

Rejected because a height that never changes leaves the banner covering what sits under the header.

### Each form keeping its own classes for the bar

Rejected because it leaves the position, the spacer and the mark to be remembered on every form.

### `position: sticky; bottom: 0` as the page's last child

Rejected because it sits under a short form's last field rather than at the foot, unless the page is sized to the viewport.

### A root variable for the bar's height, with every page padding its bottom by it

Rejected because two mounted bars write it at once, and it keeps the overlay's height after the overlay closes, with nothing failing.

### A fixed bottom padding in rem

Rejected because it is wrong whenever the sentence or the count shows.

### The bar rendered into `AppShell` through a portal

Rejected because the overlay form has no shell to render into.

### `<main>` as the scrolling area

Rejected because it breaks the restoring of the window's scroll position.

### The banner drawn elsewhere

Rejected because where the banner sits is a product decision, and it leaves a hard-coded number in the code.

## Consequences

**Positive**

- The developer who adds a form hands `FormBar` its buttons and gets the foot, the spacer and one place for the sentence and the count, with nothing to remember.
- The user meets the same bar on a form opened over another form as on that form opened from its own entry.
- The developer reads the header's live height from one variable, for the drawer's padding and the reveal's band.

**Negative**

- The developer checks where the bar sits and how tall its spacer is in a browser, since jsdom does no layout and its `ResizeObserver` is a stub.
- The user's page runs one `ResizeObserver` per mounted bar beside the header's, two while an overlay form is open.

**Neutral**

- The developer finds `data-reveal-clear` on the bar of a form that never calls `changeView`, where nothing reads it.
- The developer finds the header's height on the document root and the bar's inside its component, two measurements kept two ways.
