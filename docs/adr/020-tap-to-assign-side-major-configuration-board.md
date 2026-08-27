# ADR 020: Tap-to-assign side-major board for the deck configuration builder

## Status

Accepted

## Context

The deck configuration builder's assignment board — where a deck's fields are assigned to prompt/answer, always-shown/random-draw — first shipped (`4c32349`) as a four-row drag-table: HTML5-draggable chips with an embedded per-chip `<select>` as the fallback path. Screenshot review (2026-08-25) found it unusable: HTML5 drag events never fire on touch, the embedded select swallowed the press so the chip was effectively undraggable even with a mouse, and the fixed-column table cannot fit narrow viewports. There is also no real device available to verify touch gestures, so unverifiable gesture code defaults to being removed rather than shipped.

A first revision (written outside the codebase context) replaced drag with tap-to-assign across five flat stacked sections, with a destination picker that was a bottom sheet on narrow viewports and a popover on wide ones. Re-examined with full codebase context in the 2026-08-25 /plan session, it had two flaws: the picker forked by viewport one sentence after the revision's own "no responsive fork" principle, and a popover has no foundation here (the only Radix package installed is `react-dialog`, per ADR 016). Deeper: the five flat sections buried the model. The four config arrays are really two _sides_, each with an "always" half and a "random" half, and the draw-count checkboxes belong to the random half — as a flat footer they appeared as a side effect of moves, and even the app's author could not say where frequency was set.

## Decision

Rebuild `FieldAssignmentBoard` as a side-major, tap-to-assign board with one layout at every viewport: a "Not used" area on top, then a Prompt side card and an Answer side card, each containing an _Always shown_ area and a _Random draw_ area whose frequency checkboxes render directly beneath the chips they govern.

Every field chip is a single `<button>`; tapping it opens the existing `BottomSheet` primitive (ADR 016) listing the other four destinations, and choosing one moves the chip (`moveField` — a field lives in exactly one slot, so the four payload arrays stay pairwise disjoint by construction). All HTML5 drag-and-drop code is deleted.

Tap-to-assign is the board's **primary and universal** interaction. Pointer-based drag (dnd-kit) may return only as a wide-viewport enhancement layered on the same `BoardState`, never as the only path for any assignment.

### Alternative considered: keep the shipped hybrid (drag + embedded select)

Rejected: it is the version that failed review — mouse-only drag APIs, an interactive control nested inside the drag target fighting it for the press, and a table layout with no narrow-viewport answer.

### Alternative considered: bottom sheet on narrow viewports, popover on wide

Rejected: reintroduces the responsive fork the redesign exists to remove, doubles the picker's code and test surface, and requires a new dependency plus a new `ui/` primitive for a single call site, while `BottomSheet` already exists with two precedent users.

### Alternative considered: no overlay — tap a chip, then tap the destination section

Rejected: zero new UI and the natural substrate for a later drag layer, but a novel pattern needing an armed state, a cancel affordance, a discoverability hint, and careful a11y design — too much interaction-design risk for a surface that already shipped broken once.

### Alternative considered: per-field rows with assignment badges

Rejected: the resulting configuration is readable only by scanning badges row by row, and the frequency controls are again physically separated from the fields they govern.

### Alternative considered: five flat sections (the outside revision's layout)

Rejected: the section taxonomy must be decoded up front, and frequency appears as a footer side-effect of moving a field instead of a property of a side's random draw.

## Consequences

Benefits:

- Every assignment is reachable by tap/click alone — touch, keyboard, and screen reader all travel one path: a real button opening a Radix dialog.
- The layout teaches the data model: two sides, always vs. random, counts attached to what they count. The confusion that triggered the redesign is answered structurally.
- The state layer (`deckConfigurationBoard.ts`) is reused unchanged; the rebuild is confined to the render layer.

Costs:

- Moving a chip is two taps (open sheet, choose destination) where a working drag would be one gesture; a future dnd-kit layer can buy that back on wide viewports only.
- A bottom-anchored sheet on desktop is slightly unconventional.
- Focus restoration uses one shared trigger ref assigned at tap time (the `BottomSheet` contract from ADR 016) — subtle wiring a contributor could regress.
