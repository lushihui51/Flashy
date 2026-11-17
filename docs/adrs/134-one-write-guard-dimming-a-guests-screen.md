# ADR 134: One write guard dimming a guest's screen

## Status

Active

## Context

PDR 058 has a visitor who is not logged in, a guest, open every form and read it, greyed, with Done alone at its foot. It answers every press that would change the example library, a press on a greyed form's input included, with one screen: the whole screen dims but for the banner across the top and "Log in", no sentence appears with the press, and a tap anywhere but "Log in" brings the screen back with nothing changed. It lets a guest choose a rating for each answer on a run's card and shows it on the answer, and has "Next card", not the choice of a rating, dim the screen.

The banner PDR 058 leaves lit is the guest's banner, and the connection banner dims with the page.

`useViewer()` says whether a guest or a user is looking (ADR 132).

A page owns its mutations (ADR 088). Writes start at ten `useMutation` sites, and in the handlers of `DeckEditor` and `CardStandaloneForm`, which call the API directly.

A chosen rating is written only to the run page's address, as a URL parameter tagged with its card, and sends no request. "Next card" sends a card's ratings as one request, and is `disabled` until every answer has a rating.

A browser gives a handler no press on a `disabled` control. A Create or Save that is not ready stays pressable through `aria-disabled` (ADR 097).

Every bar at the foot is `FormBar`, a form's Done alone included (ADR 127), and `DeckBoardPage` already draws a board that cannot be changed, with Done alone.

A guest's request to a writing route gets 401, and no request of a guest's can change the example library (ADR 131).

The app's `Scrim` dims the screen at the strength its caller names, cuts a hole over each element its caller names and follows it, lets a press on the dimming reach nothing beneath and locks the page's scroll, and a press inside a hole reaches the element beneath it and never the scrim (ADR 133).

An anchored, non-modal overlay is a Radix Popover (ADR 133), and a modal one a Radix Dialog, which lets no press reach anything outside its content (ADR 016).

Radix closes a Popover on Escape and on a press outside it only while a `Popover.Content` is mounted. A Popover moves focus into its content when it opens and closes when focus moves outside it, unless the app prevents each.

`frontend/package.json` lists `@radix-ui/react-dialog` and `@radix-ui/react-popover` and no other Radix package. Radix does not document its `DismissableLayer` as a part to build on.

The guest's banner and "Log in" sit in `AppShell`'s header, which stacks beneath `Scrim`.

`AppShell` already holds the menu, two sheets, the change of viewer and the header's height.

Nothing opens the dimmed screen over a Radix dialog or list.

The app has six forms.

## Decision

We will have a control that would write ask one hook before it acts. `useWriteGuard()` in `frontend/src/lib/viewer.ts` returns a function that, for a user, runs the control's handler and, for a guest, dims the screen and runs nothing. A handler goes through it exactly when it starts a write. Opening what only shows, a form or the "Rate" list, is not guarded, and neither is a choice written only to the address, the choosing of a rating.

A form drawn for a guest reads `useViewer()`, greys what it holds, marks each input `readOnly` or `aria-disabled` and never `disabled`, passes each input's press through the guard, and renders Done alone in `FormBar`.

The screen dimmed for a guest is one component, `GuestScrim` in `frontend/src/components/shell/`, mounted once by `AppShell`. `AppShell` holds whether it is open, and gives `useWriteGuard()` the way to open it through a context. It is no Radix Popover or Dialog: while open it renders `Scrim` alone, at its stronger strength, with the guest's banner and "Log in" lit and nothing else. It closes on a press anywhere and on Escape, through two listeners of its own on the document that live only while it is open, and `AppShell` closes it on a change of address.

## Alternatives considered

### The API client refusing a guest's write and dimming the screen

Rejected because a form must grey before any request, and the page would be left as after a failed request, not as it was.

### The choosing of a rating kept behind the guard

Rejected because PDR 058 shows the chosen rating on the answer.

### A guest's ratings held in component state

Rejected because they would be lost on a reload, and would need a second path beside the user's.

### One listener in the shell catching presses on controls that carry a mark

Rejected because the mark is as easy to forget as the guard, and says nothing in the handler.

### A guest's controls `disabled`

Rejected because the press would reach nothing, and the screen would never dim.

### A Radix Dialog for the dimmed screen

Rejected because "Log in" would be dead beneath it.

### A Radix Popover with an empty `Popover.Content`

Rejected because the developer would find a popover with no panel, anchored and positioned for nothing, and would keep both focus preventions.

### Radix's `DismissableLayer` listed as a third Radix package

Rejected because Radix does not document it as a part to build on, and an upgrade could change it with no notice.

### `AppShell` rendering `Scrim` itself, with no component

Rejected because `AppShell` would hold the two listeners in an effect told when the screen is dimmed, beside the menu, two sheets, the change of viewer and the header's height.

## Consequences

**Positive**

- The developer reads at each handler that its control would write, guards a handler exactly when it starts a write, and has a new control dim the screen through the guard with nothing to build.
- The guest meets one dimmed screen at every such press, and brings the page back by pressing anywhere or by Escape.
- The guest's focus stays on the control they pressed, and the developer writes no focus prevention, anchor or positioning for it.
- The guest's chosen ratings stay in the address through the dimmed screen and a reload, and "Next card" comes alive from them with no code of its own.

**Negative**

- The guest who presses a control that forgot the guard reads that control's failure sentence, after a 401, and the example library is unchanged.
- The developer keeps a guest's rendering of each of the six forms as the form changes.
- The developer keeps the closing on a press and on Escape correct by hand, since the two listeners are the app's own.
- The developer who later opens the dimmed screen over a Radix dialog or list has one Escape close both.

**Neutral**

- The developer finds the guard, the context that dims the screen and `useViewer()` in one module, `frontend/src/lib/viewer.ts`.
- The guest who presses "Log in" on the dimmed screen closes it and opens Clerk's dialog with the one press.
