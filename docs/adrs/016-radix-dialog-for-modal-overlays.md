# ADR 016: Radix Dialog for modal overlays

## Status

Active

## Context

The app-shell rebuild needed two modal overlays — a left-side navigation drawer (`SideDrawer`) and a bottom account sheet (`AccountSheet`) — both requiring a dimming scrim, `Esc`-to-close, click-outside-to-close, a trapped focus while open, and body scroll lock while open.

These are exactly the class of bug-prone interaction that the rebuild's ground rules called out as acceptable to solve with a headless primitive rather than hand-rolled: "A headless dialog/sheet primitive (e.g. Radix `Dialog`) is acceptable if it materially reduces a11y work — state the choice in the PR description." Focus traps in particular are notoriously easy to get subtly wrong (tab order escaping the dialog, focus not returning to the invoking control on close), and a hand-rolled version would need to be independently correct for both overlays.

## Decision

We will use `@radix-ui/react-dialog` for every modal overlay, the navigation drawer and the account sheet first, rather than hand-rolling the scrim, focus trap, scroll lock, and `Esc` handling. `Dialog.Content` supplies the dialog role; `aria-modal` and a label are set per instance. A trigger that is not a `Dialog.Trigger` descendant wires focus restoration and its own re-close by hand, because Radix's defaults cover only its own trigger.

## Alternatives considered

### A hand-rolled dialog (native `<dialog>` or a custom focus-trap hook)

Rejected: correctly implementing a focus trap, `Esc` handling, and scroll lock by hand is exactly the kind of accessibility work worth buying instead of building for a small team building a mobile-first app shell from scratch.

## Consequences

**Positive**

- The developer gets the focus trap, scroll lock, `Esc`-to-close, and scrim-click-to-close from a well-audited library instead of code that would need to be independently correct in two places.
- The developer has one implementation pattern for every overlay.

**Negative**

- The project carries a new dependency, `@radix-ui/react-dialog`.
- The developer maintains two manual workarounds, focus restoration and a trigger that re-closes what it opened, for triggers outside the dialog, which a contributor unfamiliar with Radix's trigger exemption could regress.

**Neutral**
