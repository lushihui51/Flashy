# ADR 136: One column token for shell and fixed elements

## Status

Active

## Context

PDR 052 shows every page on a wide screen in the phone's layout, in one column in the middle of the window, about one and a half times as wide as a phone's screen. It holds the top bar, the banners above it and the bar at the foot of a form to that column. It opens the menu from the column's left edge, a sheet from the foot at the column's width and a question in the column's middle, with the dimming behind each across the whole window, and shows a picture opened from a card as large as the window allows.

The dimming behind the menu and behind a sheet is to leave the column's header alone lit, and a question's is to cover the whole window, its panel inset from the column's edges.

The header stacks above the scrims of the menu and of a sheet, and beneath a question's.

Every page renders inside `AppShell`'s `<main>`, the banner sits in `AppShell`'s header, and every bar at the foot is `FormBar`, which renders in its page and not in a portal (ADR 127). The app has fifteen routes.

Fixed to the viewport are `FormBar`, the panels of `BottomSheet`, `ConfirmDialog` and `SideDrawer`, the dialog of a picture or a sound in `FieldValue`, and every scrim and overlay. Radix places a popover's panel beside its control, fixed by an inline style.

Radix's scroll lock holds the page still with a right margin the scrollbar's width, which it writes to `--removed-body-scroll-bar-size`. A panel centred on the window then sits half a scrollbar to the right of the column.

The body has no background.

A design size used more than once is a `@theme` token in rem, a length in px holds still while the text grows, and such rules are held with source scans over component sources (ADR 101).

A cap on an element's width does nothing below that width.

jsdom does no layout (ADR 017).

## Decision

We will make the column's width one `@theme` token in rem, `--container-column: 40rem`, in `frontend/src/index.css`.

`AppShell`'s outer element keeps the ground across the window, and holds the header, with both banners and the top bar, and `<main>` to the column, centred. No page writes the column, and we will use no breakpoint.

Two utilities in `index.css` hold an element fixed to the viewport to the column, each centring it in the window less the scrollbar's width that a dialog's scroll lock removes, read from `--removed-body-scroll-bar-size`: `inset-x-column` sets its left and right, and `left-column` its left alone.

`FormBar`, the panels of `BottomSheet` and `ConfirmDialog`, and the dialog of a sound opened from a card write `inset-x-column`, `ConfirmDialog`'s panel keeping its side margin inside the column, and the menu's panel in `SideDrawer` writes `left-column`. Every scrim and dialog overlay, and the dialog of a picture opened from a card, write `inset-0` and cover the window.

A source scan over component sources fails on a class list that writes `fixed` beside none of `inset-0`, `inset-x-column` and `left-column`.

## Alternatives considered

### The banners' and the foot bar's bands across the window

Rejected because PDR 052 holds them to the column.

### The header's row lit across the window while the menu or a sheet is open

Rejected because the column's header alone is to stay lit.

### Each page wrapping itself

Rejected because one of fifteen routes that forgot would stretch across the window with nothing failing.

### Each fixed element writing its own insets from the token

Rejected because the expression and its scrollbar term would be written five times and drift.

### A viewport-tall element the column's width, made the containing block of every fixed element and the target of every portal

Rejected because a scrim inside it would dim only the column, and `FormBar` renders in the page, not in a portal.

### The scrollbar's width left out

Rejected because, where a scrollbar takes room, a panel would sit half a scrollbar off the column while a sheet, the menu or a question is open.

### No source scan

Rejected because a new element fixed with `inset-x-0` would span the window and no test would see it.

### A breakpoint

Rejected because a cap does nothing below its own width, so there is nothing for a breakpoint to switch.

### A value in px

Rejected because it would hold still while the text grows.

## Consequences

**Positive**

- The developer's new page sits in the column with nothing to remember.
- The developer's new element fixed to the viewport fails the source scan until it writes a column utility or `inset-0`.
- The user's panel stays on the column while a dialog locks the page's scroll.

**Negative**

- The developer's scan misses a panel fixed by an inline style, which is how Radix places a popover's.
- The developer's element fixed with `inset-0` that is not a scrim passes the scan and covers the window.
- The developer checks the column in a browser, since jsdom does no layout.

**Neutral**

- The user on a wide screen sees the window on either side of the header dim with the rest while the menu or a sheet is open.
