# ADR 098: Radix Popover for anchored non-modal overlays, over the app's own scrim when dimmed

## Status

Active

## Context

Every modal overlay is a Radix Dialog, with its scrim, focus trap, scroll lock and `Esc` taken from the library rather than hand-rolled, since each is easy to get subtly wrong (ADR 016).

An anchored, non-modal overlay is a small panel beside the control that opened it, with the page behind it still usable, dismissed by an interaction outside it. It needs positioning against the anchor and the viewport, outside-dismiss, and focus return to the control.

The rating chips' popover in `frontend/src/components/practice/RatingChip.tsx` is a Radix Popover.

Every filter and picker is `PickerCombobox` in `frontend/src/components/ui/PickerCombobox.tsx`, whose list is an absolutely placed box under its input, closed on blur, with nothing dimmed.

The user types in a picker's input while its list is open.

While a list of choices is open, the page is to be dimmed but readable, with the control and its list bright, and a tap on the dimmed page is to close the list and act on nothing.

The card sheet is a `BottomSheet`, a Radix Dialog whose own overlay dims the page.

The sheet's key, which names every mark (PDR 025), is to open over the sheet from an "i", dim only the sheet, and close on a tap on the "i" or anywhere outside the panel, without closing the sheet.

Radix Popover's modal mode traps focus in the panel and hides everything outside it, the input included.

Radix decides what counts as inside a layer by React's component tree.

A layer lifted by `z-index` stays beneath any ancestor that starts its own stacking context, such as a dialog.

jsdom does no layout (ADR 017) and has no `ResizeObserver`, which the popover's arrow measures its anchor through.

A translucent colour is one of the app's eight colours at an opacity (ADR 090).

ADR 081 made every anchored non-modal overlay a Radix Popover, never hand-rolled, and defined such an overlay as having no scrim.

## Decision

We will implement an anchored, non-modal overlay with `@radix-ui/react-popover`, never hand-rolled, and keep every modal overlay a Radix Dialog.

We will keep an anchored panel that dims what lies behind it a non-modal Popover, so focus stays where it was, and make its dimming and the catching of taps on it the app's own `Scrim`, rendered in the popover's portal beneath the panel.

We will have `Scrim` cover the whole screen, or one bounding element, in ink at an opacity, with a hole cut over the control that opened the panel. It prevents a pointerdown on it, closes the panel, lets the tap reach nothing beneath, and locks the page's scroll while it is open.

We will render a `Scrim` for a panel inside a dialog as a React child of `Popover.Content`, so a tap on it counts as inside both layers and closes the panel without closing the dialog.

## Alternatives considered

### A hand-rolled popover

Rejected because positioning, outside-dismiss and focus return are each easy to get subtly wrong, and each would be written and kept correct by hand.

### Radix Popover in modal mode

Rejected because it takes focus off the input, so typing would move into the panel.

### A Radix Dialog holding the list

Rejected because it has the same focus problem, and no anchoring.

### The list in place, with a dim layer and the control lifted by `z-index`

Rejected because the control stays dimmed, with nothing to show it, under any ancestor that starts its own stacking context, and the list is positioned by hand against the screen's edges.

### Radix's outside-dismiss with no layer to catch the tap

Rejected because the tap that closes the list would also act on what lies beneath it.

### A modal Popover with a scrim that only dims, for a panel with no input

Rejected because it would leave two ways to build one dimmed panel.

### A panel and dim layer drawn inside the dialog's content

Rejected because it covers the scrolled content rather than the visible dialog, and writes outside-dismiss, `Esc` and focus return by hand.

## Consequences

**Positive**

- The developer has one primitive per kind of overlay, Dialog for modal and Popover for anchored, and one way to build a dimmed panel.
- The user keeps typing in a list's input while the page is dimmed, the control stays bright, and a tap on the dimmed page closes the list and acts on nothing.
- The developer gets a panel inside a dialog that closes on a tap outside it and leaves the dialog open, with no outside-dismiss, `Esc` or focus return written by hand.

**Negative**

- The project carries a second Radix dependency.
- The developer keeps a `ResizeObserver` stub in `src/test/setup.ts` for every test file that renders a popover.
- The developer keeps the scrim's hole, its catch and its scroll lock correct by hand, since they are the app's own.
- The developer checks the hole's place in a browser, since jsdom does no layout.
- The developer relies on Radix judging inside by React's tree, and a change to that would let a tap on a dialog's `Scrim` close the dialog too, with no error.

**Neutral**

- The developer leaves to the product side whether a control opens a popover or a dialog.
