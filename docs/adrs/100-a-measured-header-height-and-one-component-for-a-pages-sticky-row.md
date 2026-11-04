# ADR 100: A measured header height and one component for a page's sticky row

## Status

Active

## Context

`AppShell`'s header is sticky and holds the top bar, the search bar and, when it shows, `ConnectionBanner`.

`AppShell` owns the connectivity state that decides when the banner shows, so the banner comes and goes while the app runs (ADR 063).

The banner's height depends on the screen's width. With the banner showing, the header's bottom is 172 at 390 wide and 152 at 1280 wide.

New practice and two forms each hold a sticky row with Cancel and Create on it, and each row stops at a hard-coded 114. With the banner showing, each of those rows sits behind the header.

Every sticky element a reveal must clear carries `data-reveal-clear`, and `changeView` reads that element's computed sticky `top` (ADR 097).

A sticky `top` can read a CSS variable, and a variable on the document root reaches every element.

`<ScrollRestoration>` restores the window's scroll position, not that of an element inside the page (ADR 089).

Where the banner is drawn is something the user sees.

jsdom does no layout, so no component test can see a row behind the header (ADR 017).

jsdom has no `ResizeObserver`, and `src/test/setup.ts` keeps a stub of it for every test file (ADR 098).

## Decision

We will have `AppShell` measure its header with a `ResizeObserver` and write the height to one CSS variable on the document root, `--app-header-height`.

We will hold a page's sticky row in one component, `StickyPageRow` in `frontend/src/components/ui/`, which stops at that variable and always carries `data-reveal-clear`, whether or not its page reveals a list.

We will keep the banner in `AppShell`.

## Alternatives considered

### One fixed variable

Rejected because a height that never changes leaves the banner covering the row.

### Each row keeping its own classes

Rejected because it leaves the variable and the mark to be remembered on every row.

### Each row rendered into the header through a portal

Rejected because it is a larger change for the same result.

### `<main>` as the scrolling area

Rejected because it breaks the restoring of the window's scroll position.

### The banner drawn elsewhere

Rejected because where the banner sits is a product decision, and it leaves the hard-coded number in the code.

## Consequences

**Positive**

- The developer who adds a page's sticky row gets the header's live height and the reveal mark from one component, with nothing to remember and nothing moved out of the page.

**Negative**

- The developer who adds a second sticky row further down one page needs a measurement of its own for it, since the variable holds the header's height alone.
- The developer checks where a row stops in a browser, since jsdom does no layout and its `ResizeObserver` is a stub.

**Neutral**

- The developer finds `data-reveal-clear` on the row of a page that never calls `changeView`, where nothing reads it.
