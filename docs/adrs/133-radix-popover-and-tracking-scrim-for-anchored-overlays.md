# ADR 133: Radix Popover and tracking scrim for anchored overlays

## Status

Active

## Context

Every modal overlay is a Radix Dialog, with its scrim, focus trap, scroll lock and `Esc` taken from the library rather than hand-rolled, since each is easy to get subtly wrong (ADR 016).

An anchored, non-modal overlay is a small panel beside the control it is anchored to, with the page behind it still usable, dismissed by an interaction outside it. It needs positioning against the anchor and the viewport, outside-dismiss, and focus return.

A picker's list and a rating's list are each a Radix Popover over the app's `Scrim`, which dims the page at a fifth of ink, with a hole over the control that opened the list.

The user types in a picker's input while its list is open.

While a list of choices is open, the page is to be dimmed but readable, with the control and its list bright, and a tap on the dimmed page is to close the list and act on nothing.

The card sheet is a `BottomSheet`, a Radix Dialog whose own overlay dims the page. The sheet's key is to open over the sheet from an "i", dim only the sheet, and close on a tap on the "i" or anywhere outside the panel, without closing the sheet.

PDR 058 answers a guest's press that would change the example library by dimming the whole screen but for the banner across the top and "Log in", with no sentence. A tap anywhere but "Log in" brings the screen back. That screen is to be dimmed at half of ink, and neither the banner nor "Log in" is the control that was pressed.

The banner is the guest's banner, which spans the column above the top bar. "Log in" stands at the right of the top bar, on one row with the menu button, the logo and "+".

Both sit in `AppShell`'s header, whose height changes while the app runs as the connection banner comes and goes (ADR 127), so they can move while a screen is dimmed.

A box measured when a scrim mounts and when the window is resized goes stale when its element moves for any other reason. `Scrim` is mounted only while a screen is dimmed.

`Scrim` has three callers: a picker's list, a rating's list and the screen dimmed for a guest.

A press inside a hole reaches the element beneath it and never the scrim.

Radix Popover's modal mode traps focus in the panel and hides everything outside it, the input included.

Radix decides what counts as inside a layer by React's component tree.

A layer lifted by `z-index` stays beneath any ancestor that starts its own stacking context, such as a dialog. `AppShell`'s header starts one, beneath `Scrim`.

The app has a positioning library only through Radix, and does not list it as a package of its own.

jsdom does no layout (ADR 017) and has no `ResizeObserver`, which the popover's arrow measures its anchor through.

A translucent colour is one of the app's eight colours at an opacity (ADR 090).

ADR 098 made every anchored non-modal overlay a Radix Popover over the app's `Scrim`, at one strength, with a hole over the control that opened the panel, placed when the scrim mounts. PDR 058's dimmed screen is darker, lights two elements of which neither opened it, and both can move, so this record restates ADR 098.

## Decision

We will implement an anchored, non-modal overlay with `@radix-ui/react-popover`, never hand-rolled, and keep every modal overlay a Radix Dialog.

We will keep an anchored panel that dims what lies behind it a non-modal Popover, so focus stays where it was, and make its dimming and the catching of taps on it the app's own `Scrim`, rendered in the popover's portal beneath the panel.

We will have `Scrim` cover the whole screen, or one bounding element, in ink at the strength its caller names, a fifth for a list of choices and a half for the screen dimmed for a guest, with one hole cut over each element its caller names, in that element's own corners. It prevents a pointerdown on it, closes the panel it lies beneath, where there is one, lets the tap reach nothing beneath, and locks the page's scroll while it is open.

While it is mounted, `Scrim` measures each named element's box on every animation frame, and moves its hole when the box has moved.

We will render a `Scrim` for a panel inside a dialog as a React child of `Popover.Content`, so a tap on it counts as inside both layers and closes the panel without closing the dialog.

## Alternatives considered

### A hand-rolled popover

Rejected because positioning, outside-dismiss and focus return are each easy to get subtly wrong, and each would be written and kept correct by hand.

### Radix Popover in modal mode

Rejected because it takes focus off the input, so typing would move into the panel.

### A Radix Dialog holding the list

Rejected because it has the same focus problem, and no anchoring.

### The list in place, with a dim layer and the control lifted by `z-index`

Rejected because the control would stay dimmed, with nothing to show it, under any ancestor that starts its own stacking context, and the list would be positioned by hand against the screen's edges.

### Radix's outside-dismiss with no layer to catch the tap

Rejected because the tap that closes the list would also act on what lies beneath it.

### A modal Popover with a scrim that only dims, for a panel with no input

Rejected because it would leave two ways to build one dimmed panel.

### A panel and dim layer drawn inside the dialog's content

Rejected because it would cover the scrolled content rather than the visible dialog, and outside-dismiss, `Esc` and focus return would be written by hand.

### A second scrim component for the screen dimmed for a guest

Rejected because the hole, the swallowed tap and the scroll lock would be written twice.

### One hole over a box enclosing the guest's banner and "Log in"

Rejected because the box would also hold the menu button, the logo and "+", which PDR 058 dims.

### The guest's banner and "Log in" lifted above the scrim by `z-index`

Rejected because they sit inside the header's stacking context, and could not rise above a scrim outside it.

### The scrim beneath the header, with a second dim layer inside the header

Rejected because two layers would be kept at one strength and opened and closed together, and the header would know about the dimmed screen.

### The holes measured again when the header's height changes

Rejected because `Scrim` would then know about the shell, and an element that moves for any other reason would be missed.

### The positioning library's own watcher

Rejected because the app has that library only through Radix, and would be importing a package it does not list.

## Consequences

**Positive**

- The developer has one primitive per kind of overlay, Dialog for modal and Popover for anchored, and one way to build a dimmed panel.
- The user keeps typing in a list's input while the page is dimmed, the control stays bright, and a tap on the dimmed page closes the list and acts on nothing.
- The developer gets a panel inside a dialog that closes on a tap outside it and leaves the dialog open, with no outside-dismiss, `Esc` or focus return written by hand.
- The user sees each hole stay over its element whatever moves it, under a list and under the screen dimmed for a guest alike.
- The developer who builds another dimmed screen picks one of the two strengths, names the elements to leave lit, and writes no scrim.

**Negative**

- The project carries a second Radix dependency.
- The developer keeps a `ResizeObserver` stub in `src/test/setup.ts` for every test file that renders a popover.
- The developer keeps the scrim's hole, its catch and its scroll lock correct by hand, since they are the app's own.
- The developer checks the hole's place in a browser, since jsdom does no layout.
- The developer relies on Radix judging inside by React's tree, and a change to that would let a tap on a dialog's `Scrim` close the dialog too, with no error.
- The developer who names an element that is not mounted gets no hole and no error, and the element dims.
- The user's browser reads one box a frame for each lit element while a scrim is open.

**Neutral**

- The developer leaves to the product side whether a control opens a popover or a dialog.
