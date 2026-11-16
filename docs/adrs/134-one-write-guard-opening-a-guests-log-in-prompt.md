# ADR 134: One write guard opening a guest's log-in prompt

## Status

Active

## Context

PDR 058 has a visitor who is not logged in, a guest, open every form and read it, greyed, with Done alone at its foot. It answers every press that would change the example library, a press on a greyed form's input included, with one screen: the whole screen dims but for "Log in", a sentence in white beneath "Log in" tells the guest to log in, and a tap anywhere else brings the screen back with nothing changed. It lets a guest open an answer's "Rate" list, and dims the screen when they choose a rating.

The sentence is the vocabulary's, like every sentence the app says (ADR 069).

`useViewer()` says whether a guest or a user is looking (ADR 132).

A page owns its mutations (ADR 088). Writes start at ten `useMutation` sites, and in the handlers of `DeckEditor` and `CardStandaloneForm`, which call the API directly.

A card's ratings are held in `RunPage` until every answer is rated, then sent as one request, so choosing a rating sends nothing.

A browser gives a handler no press on a `disabled` control. A Create or Save that is not ready stays pressable through `aria-disabled` (ADR 097).

Every bar at the foot is `FormBar`, a form's Done alone included (ADR 127), and `DeckBoardPage` already draws a board that cannot be changed, with Done alone.

A guest's request to a writing route gets 401, and no request of a guest's can change the example library (ADR 131).

An anchored, non-modal overlay is a Radix Popover, and one that dims the screen sits over the app's `Scrim`, which takes its strength from its caller, cuts a hole over the control the panel is anchored to, follows that control, lets a press on it reach nothing beneath and locks the page's scroll (ADR 133). A Radix Dialog lets no press reach anything outside its content (ADR 016).

"Log in" sits in `AppShell`'s header, which stacks beneath `Scrim`.

The app has six forms.

## Decision

We will have a control that would write ask one hook before it acts. `useWriteGuard()` in `frontend/src/lib/viewer.ts` returns a function that, for a user, runs the control's handler and, for a guest, opens the prompt and runs nothing. Every handler that starts a write goes through it, and so does the choosing of a rating. Opening what only shows, a form or the "Rate" list, is not guarded.

A form drawn for a guest reads `useViewer()`, greys what it holds, marks each input `readOnly` or `aria-disabled` and never `disabled`, passes each input's press through the guard, and renders Done alone in `FormBar`.

The prompt is one component, `LogInPrompt` in `frontend/src/components/shell/`, mounted once by `AppShell`. `AppShell` holds whether it is open, and gives `useWriteGuard()` the way to open it through a context. It is a Radix Popover anchored to "Log in", whose content is the sentence alone with `role="status"`, over `Scrim` at its stronger strength with "Log in" in its hole. A press on the scrim, Escape, a press on "Log in" and a change of address each close it.

## Alternatives considered

### The API client refusing a guest's write and opening the prompt

Rejected because a rating is chosen with no request, a form must grey before any request, and the page would be left as after a failed request, not as it was.

### One listener in the shell catching presses on controls that carry a mark

Rejected because the mark is as easy to forget as the guard, and says nothing in the handler.

### A guest's controls `disabled`

Rejected because the press would reach nothing, and the screen would never dim.

### A Radix Dialog for the prompt

Rejected because "Log in" would be dead beneath it unless the dialog held a second one.

### The sentence drawn by `Scrim` itself

Rejected because every list's scrim would carry a part only one caller uses.

## Consequences

**Positive**

- The developer reads at each handler that its control would write, and a new control reaches the prompt through the guard with nothing to build.
- The guest is told to log in in one place, and closes it by pressing anywhere, by Escape or by pressing "Log in".
- The guest's focus stays on the control they pressed.

**Negative**

- The guest who presses a control that forgot the guard reads that control's failure sentence, after a 401, and the example library is unchanged.
- The developer keeps a guest's rendering of each of the six forms as the form changes.

**Neutral**

- The developer finds the guard and `useViewer()` in one module, `frontend/src/lib/viewer.ts`.
