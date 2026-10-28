# ADR 081: Radix Popover for anchored non-modal overlays

## Status

Active

## Context

Every modal overlay is Radix Dialog, never hand-rolled, because the scrim, the focus trap, the scroll lock and `Esc` are easy to get subtly wrong (ADR 016).

An anchored, non-modal overlay is a small panel beside the control that opened it: no scrim, no focus trap, the page still usable behind it, dismissed by an interaction outside it. Its own hard parts are positioning against the anchor and the viewport, outside-dismiss, and focus return to the control.

Component tests run in jsdom, which performs no layout and has no `ResizeObserver` (ADR 017).

## Decision

We will implement an anchored, non-modal overlay with `@radix-ui/react-popover`, as the rating chips' popover in `frontend/src/components/practice/RatingChip.tsx` is, never hand-rolled. Modal overlays stay Radix Dialog.

## Alternatives considered

### A hand-rolled popover

Rejected for the reasons a hand-rolled dialog was rejected, applied to positioning, outside-dismiss and focus return.

## Consequences

**Positive**

- The developer has one primitive per overlay kind, Dialog for modal and Popover for anchored.

**Negative**

- The project carries a second Radix dependency.
- The developer keeps a `ResizeObserver` stub in `src/test/setup.ts`, since the popover's arrow measures its anchor through one, and a test file that renders a popover needs it.

**Neutral**

- The developer leaves to the product side whether a control opens a popover or a dialog.
