# ADR 016: Use Radix Dialog for modal overlays

## Status

Accepted

## Context

The app-shell rebuild (`docs/plans/002-frontend-rebuild-app-shell.md`) needed two modal overlays — a left-side navigation drawer (`SideDrawer`) and a bottom account sheet (`AccountSheet`) — both requiring a dimming scrim, `Esc`-to-close, click-outside-to-close, a trapped focus while open, and body scroll lock while open.

These are exactly the class of bug-prone interaction that plan 002's own ground rules called out as acceptable to solve with a headless primitive rather than hand-rolled: "A headless dialog/sheet primitive (e.g. Radix `Dialog`) is acceptable if it materially reduces a11y work — state the choice in the PR description." Focus traps in particular are notoriously easy to get subtly wrong (tab order escaping the dialog, focus not returning to the invoking control on close), and a hand-rolled version would need to be independently correct for both overlays.

## Decision

Use `@radix-ui/react-dialog` (`Dialog.Root`/`Portal`/`Overlay`/`Content`) for both `SideDrawer` and `AccountSheet`, rather than hand-rolling the scrim/focus-trap/scroll-lock/`Esc` logic. `Dialog.Content` supplies `role="dialog"`; `aria-modal="true"` and `aria-label`/`aria-labelledby` are set explicitly per instance to match the app-shell's accessibility baseline.

Both dialog triggers (the hamburger button, the avatar button) live in a sibling component (`TopBar`) rather than as descendants of the `Dialog.Root` they open, so `Dialog.Trigger` can't be used. That meant two of Radix's convenient defaults had to be wired manually:

- **Focus restoration on close.** Radix's built-in return-focus-to-trigger only works through `Dialog.Trigger` (it reads `context.triggerRef`, which `Dialog.Trigger` populates). A `triggerRef` prop is threaded from `AppShell` down to `TopBar`'s button and into `SideDrawer`/`AccountSheet`'s `onCloseAutoFocus` handler instead, which calls `triggerRef.current?.focus()` directly.
- **The trigger staying clickable to close again.** Radix's modal `Dialog.Content` sets `body.style.pointerEvents = 'none'` while open (`disableOutsidePointerEvents`), which also silently blocks the external trigger button — clicking the visible hamburger a second time did nothing, since `pointer-events: none` is inherited by every element under `<body>` that doesn't explicitly override it, and the hamburger isn't inside the dialog's own portal. This was found and fixed after manual browser testing (see the post-P5 bugfix commit on `rewrite/frontend-shell`): an inline `style={{ pointerEvents: 'auto' }}` on the trigger button (inline, not a Tailwind class — jsdom doesn't apply compiled CSS, so a class-based fix would have passed the test suite while doing nothing in a real browser), plus an `onPointerDownOutside` handler on `Dialog.Content` that no-ops Radix's own dismissal when the outside pointerdown target is the trigger, so the trigger's own `onClick` toggle is the sole authority on open/close for that button instead of racing with Radix's outside-click dismissal.

### Alternative Considered: Hand-rolled dialog (native `<dialog>` or a custom focus-trap hook)

Rejected for the reason plan 002 already gave: correctly implementing a focus trap, `Esc` handling, and scroll lock by hand is exactly the kind of accessibility work worth buying instead of building for a small team building a mobile-first app-shell from scratch.

## Consequences

Benefits:

- Focus trap, scroll lock, `Esc`-to-close, and scrim-click-to-close all come from a well-audited library instead of hand-rolled code that would need to be independently correct in two places.
- One shared implementation pattern for both `SideDrawer` and `AccountSheet`.

Costs:

- A new dependency, `@radix-ui/react-dialog`.
- Because neither trigger is a `Dialog.Trigger` descendant, two of the library's most convenient defaults (focus restoration, a trigger that reliably re-closes what it opened) needed manual workarounds — documented above and in `frontend/src/components/shell/SideDrawer.tsx`/`AccountSheet.tsx` — that a future contributor unfamiliar with Radix's trigger-exemption internals could easily regress.
