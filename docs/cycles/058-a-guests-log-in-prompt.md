# 058 — A guest's log-in prompt

Waits for: 055, its fourth step "Start run" on Home, and `frontend/src/pages/HomePage.tsx`, `frontend/src/pages/HomePage.test.tsx` and `docs/vocabulary.md`, which it shares; 056, its column, and `frontend/src/pages/RunPage.tsx`, which it shares; 057, its `useViewer` in `frontend/src/lib/viewer.ts`, its "Log in" drawn as a block, its guest's banner, and `frontend/src/lib/viewer.ts`, `frontend/src/lib/viewer.test.tsx`, `frontend/src/components/shell/AppShell.tsx`, `frontend/src/components/shell/AppShell.test.tsx`, `frontend/src/components/shell/AuthSlot.tsx`, `frontend/src/components/shell/AuthSlot.test.tsx`, `frontend/src/test/setup.ts` and `docs/vocabulary.md`, which it shares.

Canvas: https://claude.ai/artifact/A8gXbvneXqHNg6LoTfza5p

## Goal

Outcome: A guest opens and reads everything, every form greyed with Done alone, and every press that would change the example library dims the whole screen but for "Log in" and tells them to log in.

Scope: The cycle covers `Scrim` at the strength its caller names, its hole following its control; `useWriteGuard` and the prompt it opens, `LogInPrompt`, mounted once by the shell; the guard at every handler that starts a write and at the choosing of a rating; the five form components, at their seven addresses, drawn for a guest; and the vocabulary's rows for the prompt and for Done. It leaves out the card sheet's key in a completed run's summary, which stays as it is; and anything the server does for a guest, which stands.

Judgement: The engineer judges on the live server as a guest, at 390 by 844 and at 1440 by 900. New deck, Edit deck, New card, Edit card, New practice, Edit practice and a deck's board each open greyed, with Done alone at the foot, and Done leaves. A press on a greyed input, on Start run, on a completed run's play button on Home, on Re-run, on Re-run these or on End run dims the whole screen at half of ink but for "Log in", with "Log in to use all of Flashy." in white beneath it, as drawings 3 and 4 draw it; a press anywhere else, Escape or "Log in" brings the screen back with nothing changed. On a run's card, Show answer shows the answers, "Rate" opens its four ratings, and choosing one dims the screen. Logged in, every one of those controls acts as it did.

## Records

- PDR 020: A block for everything that can be tapped
- PDR 031: Failures met in place, up to the whole page, with one banner for the connection
- PDR 051: Cancel and Create or Save at the foot of every form, and Done alone where nothing can change
- PDR 053: An example library for guests to look through
- PDR 055: Prompt zone above rated answers in a run
- PDR 058: A dimmed screen telling guests to log in
- ADR 016: Radix Dialog for modal overlays
- ADR 017: React Testing Library with a per-file jsdom environment
- ADR 069: One vocabulary file for the user's words and the code's names
- ADR 088: TanStack Query for the frontend's server state, refetched on mount
- ADR 090: Eight colour tokens named by meaning as the only colours
- ADR 097: One hook for a page's URL search params, that never resets scroll
- ADR 124: Two URL parameters for a form's return addresses, and one function leaving every form by history
- ADR 127: A measured header height and one component for every bar at the foot
- ADR 131: Guest reads answered as the example user, read-only
- ADR 132: One viewer hook, and a reload between viewers
- ADR 133: Radix Popover and tracking scrim for anchored overlays
- ADR 134: One write guard opening a guest's log-in prompt
- ADR 136: One column token for shell and fixed elements

## Tasks

### T1 — The scrim's strength

**Status**

- [x]

**Goal**

`Scrim` dims at the strength its caller names, and its hole stays over its control whatever moves it.

**Dependencies**

None.

**Files**

- `frontend/src/components/ui/Scrim.tsx`
- `frontend/src/components/ui/Scrim.test.tsx`
- `frontend/src/components/ui/PickerCombobox.tsx`
- `frontend/src/components/run/RatingChip.tsx`

**Details**

ADR 133:

```ts
type ScrimProps = {
  anchor: RefObject<HTMLElement | null>;
  onDismiss: () => void;
  /** How dark the dimming is: `fifth` of ink beneath a list of choices, `half` beneath the screen dimmed for a guest. */
  strength: 'fifth' | 'half';
};
```

- `strength` must be required, and `Scrim` must draw ink at 20% for `fifth` and at 50% for `half` (ADR 090). `PickerCombobox` and `RatingChip` pass `fifth`, and look as they do today.
- `Scrim` must measure its anchor's box when it mounts, before the first paint, as today, then on every animation frame while it is mounted, and move the hole when the box has moved. The `resize` listener goes. The frame loop stops when it unmounts.
- Its catch of a press, its swallowing of the click that ends a touch and its scroll lock stay as they are.

Guidance: keep the last box and set state only when a frame's box differs from it, so a still control costs one read a frame and no render.

**Out of scope**

- A second scrim component for the stronger dim: never; ADR 133 rejects it.
- The hole moved by watching the header's height: never; ADR 133 rejects it.
- A `Scrim` held to one bounding element, and the card sheet's key in `frontend/src/components/run/RunBreakdown.tsx` drawn through it: an unsettled decision; the key and its dimming stay as they are.
- The prompt that uses the stronger dim: T2.

**Done when**

- In `frontend/src/components/ui/Scrim.test.tsx`, `dims at a fifth of ink for fifth and at a half for half` passes.
- `moves the hole when the anchor's box moves between two frames, and renders nothing new while it is still` passes.
- `stops measuring once unmounted` passes.
- Every other case of `frontend/src/components/ui/Scrim.test.tsx` but the one of the window's resize still passes.
- `grep -c "addEventListener('resize'" frontend/src/components/ui/Scrim.tsx` prints `0`.
- In headless Chromium as a user at 390 by 844, on a run's card with its answers shown, "Rate" opens its list over the page dimmed as before, and `document.elementFromPoint` at the chip's centre is the chip.

**Debrief**

- `npx vitest run src/components/ui/Scrim.test.tsx`: `dims at a fifth of ink for fifth and at a half for half` passes; it asserts the scrim's class is `bg-(--color-ink)/20` for `fifth` and `bg-(--color-ink)/50` for `half`, since jsdom computes no Tailwind colour.
- `moves the hole when the anchor's box moves between two frames, and renders nothing new while it is still` passes. Frames run only when the test calls them, and every box read returns a fresh object, so a scrim that set state on every frame would render again; with the comparison of boxes removed from `Scrim`, this case fails, and with it restored, it passes.
- `stops measuring once unmounted` passes: after unmount no frame is pending, and running frames reads no box.
- The seven other cases pass, the window's resize case removed: 10 passed (10).
- `grep -c "addEventListener('resize'" frontend/src/components/ui/Scrim.tsx` printed `0`.
- Headless Chromium as a user at 390 by 844, on the active run of "Commands: Basic" with its answers shown: "Rate" opened Again, Hard, Good and Easy over a scrim of class `bg-(--color-ink)/20`, computed background ink at 0.2, box 0 0 390 844; `document.elementFromPoint` at the chip's centre (323.5, 534) was the chip; no `/api` request other than `GET` was sent. The check ran against a second Vite on port 5180 with `VITE_DEV_AUTH` set, since the Vite on 5173 runs without it and stayed untouched; the API on 8000 runs with `DEV_AUTH_USER_ID` and `ENV=development` from `.env`. The second Vite is stopped.
- Departure from guidance: none. The last box is kept in the effect and compared by its four edges, as guided.
- Read: `Scrim`'s effect in `frontend/src/components/ui/Scrim.tsx`, where the first measure stays synchronous before the first paint and each frame schedules the next.

### T2 — The log-in prompt

**Status**

- [x]

**Goal**

A guest's press on any control outside a form that would change the example library, the choosing of a rating included, dims the whole screen but for "Log in" and says to log in beneath it, and changes nothing.

**Dependencies**

- T1: `Scrim`'s `strength`, and its hole that follows its anchor.

**Files**

- `frontend/src/lib/viewer.ts`
- `frontend/src/lib/viewer.test.tsx`
- `frontend/src/components/shell/LogInPrompt.tsx` (new)
- `frontend/src/components/shell/LogInPrompt.test.tsx` (new)
- `frontend/src/components/shell/AppShell.tsx`
- `frontend/src/components/shell/AppShell.test.tsx`
- `frontend/src/components/shell/TopBar.tsx`
- `frontend/src/components/shell/TopBar.test.tsx`
- `frontend/src/components/shell/AuthSlot.tsx`
- `frontend/src/components/shell/AuthSlot.test.tsx`
- `frontend/src/test/setup.ts`
- `frontend/src/test/mocks/clerk.ts`
- `frontend/src/pages/RunPage.tsx`
- `frontend/src/pages/RunPage.test.tsx`
- `frontend/src/pages/PracticeDetailsPage.tsx`
- `frontend/src/pages/PracticeDetailsPage.test.tsx`
- `frontend/src/pages/HomePage.tsx`
- `frontend/src/pages/HomePage.test.tsx`
- `frontend/src/components/run/RerunButton.tsx`
- `frontend/src/components/run/RerunButton.test.tsx`
- `frontend/src/components/run/RunBreakdown.tsx`
- `frontend/src/components/run/RunBreakdown.test.tsx`
- `docs/vocabulary.md`

**Details**

PDR 058 and ADR 134, with drawing 3 and drawing 4's fourth screen as constraints on the dimmed screen. `frontend/src/lib/viewer.ts` gains:

```ts
/** Opens the log-in prompt. `AppShell` provides it; outside the shell it does nothing. */
export const LogInPromptContext: Context<() => void>;

/** For a control that would write. The function it returns runs `write` while `useViewer()` answers `user`; otherwise it opens the log-in prompt and runs nothing. */
export function useWriteGuard(): (write: () => void) => void;
```

`frontend/src/components/shell/LogInPrompt.tsx`:

```tsx
type LogInPromptProps = {
  open: boolean;
  onClose: () => void;
  /** "Log in" in the top bar: the prompt is anchored to it, and it stays lit in the scrim's hole. */
  anchor: RefObject<HTMLButtonElement | null>;
};
export default function LogInPrompt({ open, onClose, anchor }: LogInPromptProps): ReactNode;
```

- `LogInPrompt` must be a non-modal Radix Popover anchored to `anchor`, over `Scrim` at `half` with `anchor` in its hole. Its content is the sentence "Log in to use all of Flashy." alone, with `role="status"`, in white at the banner's text size, straight on the dimmed screen with no block behind it, beneath "Log in" with its right edge on "Log in"'s right edge.
- Opening it must move no focus: focus stays on the control that was pressed.
- A press on the scrim, Escape, a press on "Log in" and a change of address must each close it. A press on "Log in" still opens Clerk's dialog. While it is open the page cannot scroll, and the dimming covers both banners and the whole window.
- `AppShell` must mount `LogInPrompt` once, hold whether it is open, and provide the way to open it through `LogInPromptContext`. `TopBar` and `AuthSlot` hand it the ref of "Log in".
- A guarded press of a guest must send no request and change nothing on the page, its address included.
- These handlers must go through `useWriteGuard`:
  - `frontend/src/pages/RunPage.tsx`: the press on "End run", before its question opens; the choosing of a rating, `rate`; and "Next card".
  - `frontend/src/pages/PracticeDetailsPage.tsx`: "Start run". With an active run, a guest's "Continue run" opens `/runs/<active_run_id>` and sends no request, since it changes nothing.
  - `frontend/src/pages/HomePage.tsx`: a completed run's play button, and the fourth step "Start run".
  - `frontend/src/components/run/RerunButton.tsx`: "Re-run".
  - `frontend/src/components/run/RunBreakdown.tsx`: "Re-run these".
- These are not guarded, since each only shows something: "Show answer", the opening of an answer's "Rate" list, "Edit card", an active run's play button on Home, and every press that opens a form.
- Every existing test of a page or a component must run as a user unless it says otherwise.
- The vocabulary gains one row, in the App area:

```
| App | Telling a guest to log in | "Log in to use all of Flashy." | Beneath "Log in", over the dimmed screen, after a guest presses something that would change the example library | `LogInPrompt`; `useWriteGuard` |
```

Guidance: `Popover.Anchor` takes `virtualRef`; `Popover.Content` with `side="bottom"`, `align="end"` and `onOpenAutoFocus` prevented; the `Scrim` in the popover's portal beneath the content, as `RatingChip` places its own. `frontend/src/test/setup.ts` can give every test file a default of `@clerk/react`'s `useUser` that reads as a user, which `frontend/src/test/mocks/clerk.ts` overrides in the tests that name a viewer.

**Out of scope**

- The form greyed with Done alone beneath the dimming, which drawings 3 and 4 show: T3 and T4. Until then a guest's form looks as a user's does.
- Drawing 4's first three screens, the menu, a sheet and a question on a wide screen: they stand.
- A Radix Dialog for the prompt, the sentence drawn by `Scrim`, or the sentence on an ink block: never; ADR 134 and PDR 058 reject each.
- A sentence at the control that was pressed, or a message that pops up and goes: never; PDR 058.
- "Log in" as the only thing that can be pressed once the screen has dimmed: never; PDR 058.
- The API client refusing a guest's write and opening the prompt: never; ADR 134 rejects it.
- "Rate" itself dimming the screen: never; PDR 058.

**Done when**

- In `frontend/src/lib/viewer.test.tsx`, `the guard runs the write for a user, and for a guest opens the prompt and runs nothing` passes.
- In `frontend/src/components/shell/LogInPrompt.test.tsx`, `says its sentence with role status and takes no focus` passes.
- `closes on a press on the scrim and on Escape` passes.
- In `frontend/src/components/shell/AppShell.test.tsx`, `opens the prompt from the context and closes it on a press on Log in and on a change of address` passes.
- In `frontend/src/pages/RunPage.test.tsx`, `a guest opens the Rate list, and choosing a rating opens the prompt and sets no rating` passes.
- `a guest's End run opens the prompt and no question` passes.
- In `frontend/src/pages/PracticeDetailsPage.test.tsx`, `a guest's Start run opens the prompt and sends nothing, and Continue run opens the active run` passes.
- In `frontend/src/pages/HomePage.test.tsx`, `a guest's play button on a completed run opens the prompt and sends nothing` passes.
- In `frontend/src/components/run/RerunButton.test.tsx`, `a guest's Re-run opens the prompt and sends nothing` passes.
- In `frontend/src/components/run/RunBreakdown.test.tsx`, `a guest's Re-run these opens the prompt and sends nothing` passes.
- `grep -c "LogInPrompt" docs/vocabulary.md` prints `1`.
- In headless Chromium as a guest at 390 by 844, on a practice's page with no active run: a press on "Start run" dims the window, "Log in to use all of Flashy." stands beneath "Log in" with one right edge, `document.elementFromPoint` at "Log in"'s centre is "Log in", and no `/api` request with a method other than `GET` was sent; a press on the dimming brings the page back.
- The same at 1440 by 900, where the dimming's box is the window's and the sentence's right edge is "Log in"'s.
- In headless Chromium as a guest, with the prompt open and the connection then lost: the connection banner appears, and `document.elementFromPoint` at "Log in"'s new centre is still "Log in".
- In headless Chromium as a guest on a run's card: "Show answer" shows the answers, "Rate" opens four ratings, and choosing one dims the window and leaves the chip reading "Rate".

**Debrief**

- `the guard runs the write for a user, and for a guest opens the prompt and runs nothing` passes.
- `says its sentence with role status and takes no focus` passes: the status reads exactly "Log in to use all of Flashy.", the scrim's class is `bg-(--color-ink)/50`, and "Start run", focused before the prompt opened, keeps focus.
- `closes on a press on the scrim and on Escape` passes.
- `opens the prompt from the context and closes it on a press on Log in and on a change of address` passes, as a guest under the real `AppShell`: the guarded press keeps focus on the pressed control, "Log in" closes the prompt and calls Clerk's `openSignIn` once, and a navigation to `/practices` closes it.
- `a guest opens the Rate list, and choosing a rating opens the prompt and sets no rating` passes: the four ratings list, Good opens the prompt, the chip still reads "Rate", the address is unchanged and Next card stays disabled.
- `a guest's End run opens the prompt and no question` passes, with no end request.
- `a guest's Start run opens the prompt and sends nothing, and Continue run opens the active run` passes: Continue run opens `/runs/r1`, and neither press sends a request other than a GET.
- `a guest's play button on a completed run opens the prompt and sends nothing` passes.
- `a guest's Re-run opens the prompt and sends nothing` passes; `onError` is not called.
- `a guest's Re-run these opens the prompt and sends nothing` passes; the address stays `/?kind=down`.
- With `useWriteGuard` changed to run every write, all eight guest tests above fail; restored, they pass. Full suite: 765 passed.
- `grep -c "LogInPrompt" docs/vocabulary.md` printed `1`.
- Headless Chromium as a guest at 390 by 844, on the page of "French from English" with no active run: "Start run" dimmed the window, the scrim's box 0 0 390 844 in ink at 0.5; the sentence 197 to 374 by 99 to 119, white, 14px on a 20px line, on no background, "Log in" 297 to 374 by 45 to 89, so one right edge at 374 and 10px beneath, as drawing 3 places it; `document.elementFromPoint` at "Log in"'s centre (335.5, 67) was "Log in"; focus stayed on "Start run"; the root's overflow was `hidden`. A press on the dimming removed the prompt and the scrim, the address unchanged. No `/api` request but GET was sent.
- At 1440 by 900: the scrim's box 0 0 1440 900; the sentence 847 to 1024, "Log in" 947 to 1024, one right edge at 1024 and 10px beneath, as drawing 4's fourth screen places it; `elementFromPoint` at (985.5, 67) was "Log in"; a press on the dimming brought the page back at the same address; no request but GET.
- With the prompt open at 1440 by 900 and the browser then taken offline, the offline banner appeared above the guest's banner, "Log in" moved from y 45 to y 83, the prompt stayed open, `elementFromPoint` at the new centre (985.5, 105) was "Log in", and the sentence's right edge was still 1024, 10px beneath. Escape closed it.
- On the run card of "Two at random" at 390 by 844: "Show answer" showed the answers and two chips, "Rate Korean" opened Again, Hard, Good and Easy with no prompt, and Good dimmed the window, the scrim 0 0 390 844 in ink at 0.5, the chip still reading "Rate" at the same address; no request but GET.
- Every browser check ran against the dev server on 5173, its `/api` routed by Playwright to `DEV_AUTH_USER_ID= uv run uvicorn app.main:app --port 8001`, now stopped.
- Departure from guidance: `LogInPrompt` also prevents `onFocusOutside`. Without it, choosing a rating opened the prompt and Radix closed it at once, since the rating's list hands focus back to its chip, outside the prompt; the browser check found it, and `stays open while focus moves` in `frontend/src/components/shell/LogInPrompt.test.tsx` fails without it.
- Departure from guidance: `frontend/src/test/setup.ts` imports `src/test/mocks/clerk`, whose mock of `@clerk/react` then covers every test file, and signs in before each test; `frontend/src/test/mocks/clerk.ts` is unchanged.
- In the page and component tests, a spy given through `LogInPromptContext` stands in for the shell, so "opens the prompt" there means the opener was called; the shell's test shows the opener opening the prompt.
- Added beyond the Done when: `a guest's Start run step opens the prompt and sends nothing` in `frontend/src/pages/HomePage.test.tsx`, and a test each in `TopBar.test.tsx` and `AuthSlot.test.tsx` that "Log in" reaches `logInButtonRef`.
- Read: `AppShell` holds the prompt as the `location.key` it was opened at, so any change of address closes it with no effect to run. `PracticeDetailsPage`'s button sends a user's Continue run through the start, as before.
- Look at: the scrim's hole is "Log in"'s box, so its four corners outside the rounded button stay undimmed, where drawings 3 and 4 dim behind it. The "Rate" chip's hole has the same corners. Changing the hole's shape is in `Scrim`, `frontend/src/components/ui/Scrim.tsx`, outside this task's Files.

### T3 — A guest's card and deck forms

**Status**

- [x]

**Goal**

New card, Edit card, New deck and Edit deck open for a guest greyed and unchangeable, with Done alone at the foot, and a press on anything they hold opens the log-in prompt.

**Dependencies**

- T2: `useWriteGuard`, and the prompt it opens.

**Files**

- `frontend/src/components/library/CardStandaloneForm.tsx`
- `frontend/src/components/library/CardStandaloneForm.test.tsx`
- `frontend/src/components/library/CardFieldsForm.tsx`
- `frontend/src/components/library/CardFieldsForm.test.tsx`
- `frontend/src/components/library/DeckEditor.tsx`
- `frontend/src/components/library/DeckEditor.test.tsx`
- `frontend/src/components/ui/PickerCombobox.tsx`
- `frontend/src/components/ui/PickerCombobox.test.tsx`
- `frontend/src/components/ui/ReadOnlyButton.tsx` (new)
- `frontend/src/components/ui/ReadOnlyButton.test.tsx` (new)

**Details**

PDR 058 and ADR 134, with drawing 2's second screen as a constraint on a guest's form. `CardStandaloneForm` and `DeckEditor` read `useViewer()`, and while it answers `guest`:

- Every text input must be `readOnly`, and every other control the form holds that a user could press must carry `aria-disabled="true"`. None of them may be `disabled`, since a browser gives a handler no press on a disabled control.
- A control a user's form disables too stays `disabled` as it is, since its press would change nothing for anyone: in `DeckEditor`, a field's type `<select>`, the first field's move up, the last field's move down, and remove while the deck has two fields.
- Each is greyed: an input keeps its white surface and its line-grey outline and writes its value in the aside grey, as drawing 2 draws it; a button takes the look of a Create that is not ready in `SubmitButton`, a line-grey outline, a white surface, aside-grey words and no shadow.
- A press on any of them must go through `useWriteGuard`, so it opens the prompt, and must change nothing: no value, no field's place, no list opened by the deck picker.
- The bar at the foot must hold "Done" as its one button, in `FormBar`. It fills the bar's width, as drawing 2 draws it and as `DeckBoardPage`'s Done does. Done leaves as the form's Cancel leaves when nothing is unsaved, and asks nothing. On Edit deck, which has a Done today, it leaves as that Done leaves.
- The form shows no sentence of its own about being a guest.
- "Delete card" and "Delete deck" stay where they are, greyed, and a press opens the prompt; no deletion-impact read is sent.
- Edit deck shows no Undo.
- Every handler that starts a write must go through `useWriteGuard` as well: `handleSubmit` and `handleDelete` in `CardStandaloneForm`, and `handleSave` and `handleDeleteDeck` in `DeckEditor`.

A shared input takes the press as a prop, and reads no viewer itself:

```ts
// CardFieldsForm's props, and PickerCombobox's, each gain:
/** When given, every input is read only and greyed, opens nothing, and a press on one calls this. */
onReadOnlyPress?: () => void;
```

`DeckPicker` hands it to `PickerCombobox` with its other props.

A guest's greyed button is one shared component, `frontend/src/components/ui/ReadOnlyButton.tsx`, which holds `aria-disabled` and the greyed look. A form never writes `aria-disabled` itself: `frontend/src/test/formParts.test.ts` fails on a form's source that does, and that test stays as it is and must pass.

```tsx
type ReadOnlyButtonProps = {
  /** Runs on a press; the button does nothing else. */
  onPress: () => void;
  /** The button's shape and size; the component adds the greyed colours. */
  className?: string;
  'aria-label'?: string;
  children: ReactNode;
};
/** A button that shows what cannot be changed: `aria-disabled`, greyed, never `disabled`. */
export default function ReadOnlyButton(props: ReadOnlyButtonProps): ReactNode;
```

While `useViewer()` answers `user`, each form is as it is today.

**Out of scope**

- A guest's Edit card with no "Delete card" beneath its fields, as drawing 2's second screen, drawing 3 and drawing 4's fourth screen show it: not built; the button stays, greyed, as ADR 134 greys what a form holds.
- The inputs `disabled`, as the drawing's markup writes them: never; ADR 134.
- A form that works until Create, Save or Delete: never; PDR 058 rejects it.
- A sentence on the form saying the guest is not logged in: never; PDR 058.
- New practice, Edit practice and a deck's board: T4.
- Any length, weight or outline in drawing 2 that differs from what the app draws today, but for the greyed inputs and Done: never.

**Done when**

- In `frontend/src/components/ui/ReadOnlyButton.test.tsx`, `is aria-disabled, never disabled, and a press calls onPress` passes.
- Every case of `frontend/src/test/formParts.test.ts` passes, the file unchanged.
- In `frontend/src/components/library/CardFieldsForm.test.tsx`, `with onReadOnlyPress every input is read only and a press on one calls it` passes.
- In `frontend/src/components/ui/PickerCombobox.test.tsx`, `with onReadOnlyPress a press opens no list and calls it` passes.
- In `frontend/src/components/library/CardStandaloneForm.test.tsx`, `a guest's Edit card is read only, with Done alone, and a press on a field opens the prompt` passes.
- `a guest's Delete card opens the prompt and asks no question` passes.
- `a guest's New card holds a greyed deck picker and Done alone` passes.
- In `frontend/src/components/library/DeckEditor.test.tsx`, `a guest's Edit deck is read only, with Done alone and no Undo, and a press on a field's name opens the prompt` passes.
- `a guest's Delete deck opens the prompt and reads no deletion impact` passes.
- Every case those four files held before this task still passes, as a user.
- In headless Chromium as a guest at 390 by 844: Edit card of a "Common words" card shows five greyed inputs holding the card's values, "Delete card" greyed, and a bar holding "Done" alone; a press on the first input dims the window with the sentence beneath "Log in"; a press on the dimming brings the form back, and the input's value is what it was; "Done" opens the deck's page.
- In headless Chromium as a guest at 390 by 844, New deck, Edit deck and New card each show a bar holding "Done" alone, and no element in `<main>` is `disabled` but those a user's form disables too.

**Debrief**

- `is aria-disabled, never disabled, and a press calls onPress` passes: the button is `type="button"`, enabled, `aria-disabled="true"`, keeps its caller's classes, and a press calls `onPress` once with no argument.
- Every case of `frontend/src/test/formParts.test.ts` passes, 5 of 5; `git diff --quiet HEAD -- src/test/formParts.test.ts` holds.
- `with onReadOnlyPress every input is read only and a press on one calls it` passes: both inputs read only, enabled, white with aside-grey words; a click calls it once, and typing after it changes no value and calls no `onChange`.
- `with onReadOnlyPress a press opens no list and calls it` passes: the combobox is read only, enabled and greyed; a click calls it once and opens no list; ArrowDown, Enter and typing then open nothing, choose nothing and leave "Deck 3".
- `a guest's Edit card is read only, with Done alone, and a press on a field opens the prompt` passes: every input read only, "Delete card" `aria-disabled`, nothing `:disabled`, the bar's buttons `["Done"]`; a press on [Front] opens the prompt, typing and Enter change nothing and send no request; Done lands on `/decks/d1`.
- `a guest's Delete card opens the prompt and asks no question` passes, with no request.
- `a guest's New card holds a greyed deck picker and Done alone` passes: the picker is read only, a press opens the prompt and no list, and Done lands on `/library`.
- `a guest's Edit deck is read only, with Done alone and no Undo, and a press on a field's name opens the prompt` passes: the first field's Move up, the last field's Move down, both Removes of a two-field deck and each field's type stay `disabled`; Move Front down, Move Back up, Add field and Delete deck are enabled and `aria-disabled`; presses on a field's name, Move Front down, Add field and Deck name open the prompt four times, and the fields still read Front, Back, the name French Vocab, with no request; Done lands on `/decks/d1`.
- `a guest's Delete deck opens the prompt and reads no deletion impact` passes: no request of any method is sent after the press.
- Every case the four files held before passes, as a user: the full suite is 774 passed, T2's 765 and this task's 9. With `guest` forced false in both forms, all six guest cases of the two forms fail; restored, they pass.
- Headless Chromium as a guest at 390 by 844, Edit card of the "Common words" card holding water: five inputs read only, holding "water", "水", "물", "eau", "agua", the card's values; each white, outlined in rgb(213, 218, 226), words in rgb(92, 102, 114), as drawing 2 draws them; "Delete card" `aria-disabled`, white, the same outline and grey, no shadow; the bar `["Done"]`, Done 16 to 374 wide; nothing in `<main>` `:disabled`. A press on the first input and "zz" typed dimmed the window, the scrim 0 to 390 by 0 to 844, the sentence 197 to 374 by 99 to 119 beneath "Log in" at 297 to 374 by 45 to 89, `elementFromPoint` at "Log in"'s centre was "Log in", and focus stayed on the input. A press on the dimming removed the scrim, and the input still read "water". Done opened `/decks/<Common words id>`. No `/api` request but GET was sent.
- At 390 by 844 as a guest, each bar's buttons were `["Done"]`. New deck: every input read only; `:disabled` in `<main>` were each Field type, Move Term up, Remove Term, Move Definition down and Remove Definition, which a user's New deck disables too; `aria-disabled` were Move Term down, Move Definition up and Add field. Edit deck of "Common words", five fields: `:disabled` were each Field type, Move English up and Move Spanish down; every other move, every Remove, Add field and Delete deck were `aria-disabled`. New card: the picker read only, nothing `:disabled`. No request but GET on any of them.
- The browser checks ran against the dev server on 5173, its `/api` routed by Playwright to `DEV_AUTH_USER_ID= uv run uvicorn app.main:app --port 8001`, now stopped.
- Departure from guidance: none.
- Added beyond the Done when: `a guest's New deck holds Done alone, which leaves as Cancel does` in `frontend/src/components/library/DeckEditor.test.tsx`, which pins the controls a user's New deck disables too.
- Read: `CardStandaloneFormBody`'s form now calls `preventDefault` in its `onSubmit` before the guard, and `handleSubmit` takes no event, so a guest's Enter in a deck of one field submits nothing and reloads nothing. `FieldButton` in `frontend/src/components/library/DeckEditor.tsx` keeps a button `disabled` where a user's form disables it, and draws a `ReadOnlyButton` for a guest everywhere else.
- Read: "Delete card" and "Delete deck" put the press that opens their question through the guard, besides `handleDelete` and `handleDeleteDeck`, so a guest reads no deletion impact.

### T4 — A guest's practice forms and board

**Status**

- [x]

**Goal**

New practice, Edit practice and a deck's board open for a guest greyed and unchangeable, with Done alone at the foot, so every form does.

**Dependencies**

- T3: `PickerCombobox`'s `onReadOnlyPress`; `ReadOnlyButton`; the greyed look of a guest's form; `frontend/src/components/ui/PickerCombobox.tsx`, which it shares.
- T2: `useWriteGuard`; `docs/vocabulary.md`, which it shares.
- T1: `Scrim`'s hole that follows its anchor; `frontend/src/components/ui/Scrim.tsx` and `frontend/src/components/ui/Scrim.test.tsx`, which it shares.

**Files**

- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`
- `frontend/src/pages/PracticeEditPage.tsx`
- `frontend/src/pages/PracticeEditPage.test.tsx`
- `frontend/src/pages/DeckBoardPage.tsx`
- `frontend/src/pages/DeckBoardPage.test.tsx`
- `frontend/src/components/library/FieldAssignmentBoard.tsx`
- `frontend/src/components/library/FieldAssignmentBoard.test.tsx`
- `docs/vocabulary.md`
- `frontend/src/components/ui/Scrim.tsx`
- `frontend/src/components/ui/Scrim.test.tsx`
- `frontend/src/components/ui/PickerCombobox.tsx`

**Details**

PDR 058 and ADR 134. `PracticeCreatePage`, `PracticeEditPage` and `DeckBoardPage` read `useViewer()`, and while it answers `guest` each keeps every constraint T3 gives a guest's form: `readOnly` or `aria-disabled` and never `disabled`, greyed, each greyed button a `ReadOnlyButton`, each press through `useWriteGuard`, "Done" as the one button in `FormBar`, and no sentence of its own.

- New practice: the name, the deck picker and each picked deck's remove button are greyed. A deck the address already names stays listed, and "N selected" stays above "Done" while one is.
- Edit practice: the name is greyed, and "Delete practice" stays, greyed, its press opening the prompt and no question.
- A deck's board: `FieldAssignmentBoard` is drawn `readOnly`, with "Done" alone, as it is today for a board that cannot be changed. Where a user could change the board, a practice's board with no active run, a guest's press on a chip or a count opens the prompt, and no line stands above the board. Where a user could not, the board and its line are what a user sees.
- `FieldAssignmentBoard`'s props gain:

```ts
/** With `readOnly`, when given: every chip and count is `aria-disabled` in place of `disabled`, and a press on one calls this. */
onReadOnlyPress?: () => void;
```

- Every handler that starts a write must go through `useWriteGuard`: `createMutation` in `PracticeCreatePage`, `saveMutation` and `deleteMutation` in `PracticeEditPage`, and `saveMutation` in `DeckBoardPage`.
- The vocabulary's row "Leaving when nothing is unsaved" must read, in Where, `Edit deck; a deck's board, while its practice has an active run or opened from a completed run's page; every form, while not logged in`.

While `useViewer()` answers `user`, each form is as it is today.

**Out of scope**

- A guest moving a field on a board: never; PDR 058.
- A board's chips `disabled` for a guest where a user could change them: never; ADR 134.
- The card sheet's key in a completed run's summary: an unsettled decision; it stays as it is.
- Anything the server does for a guest: it stands; a guest's write that reached it would still answer 401.

**Done when**

- In `frontend/src/components/library/FieldAssignmentBoard.test.tsx`, `read only with onReadOnlyPress, a chip is aria-disabled, opens no sheet and calls it` passes.
- In `frontend/src/pages/PracticeCreatePage.test.tsx`, `a guest's New practice is greyed, with Done alone, and a press on the picker opens the prompt` passes.
- In `frontend/src/pages/PracticeEditPage.test.tsx`, `a guest's Edit practice is read only, with Done alone, and Delete practice opens the prompt` passes.
- In `frontend/src/pages/DeckBoardPage.test.tsx`, `a guest's board of a practice with no active run is greyed with no line, and a press on a chip opens the prompt` passes.
- `a guest's board of a practice with an active run reads as a user's` passes.
- Every case those four files held before this task still passes, as a user.
- `grep -c "every form, while not logged in" docs/vocabulary.md` prints `1`.
- In headless Chromium as a guest, at 390 by 844 and at 1440 by 900, `/decks/new`, `/decks/<id>/edit`, `/cards/new`, `/cards/<id>/edit`, `/practices/new`, `/practices/<id>/edit` and the board of "French from English" at `/practices/<id>/decks/<id>` each show a bar whose one button is "Done", no element in `<main>` is `disabled` but those a user's form disables too, and "Done" leaves the form.
- In headless Chromium as a guest, a screenshot of Edit card with a press made on its first input, at 390 by 844 beside drawing 3 and at 1440 by 900 beside drawing 4's fourth screen, differs from the drawing only in what T2's and T3's Out of scope name.
- In headless Chromium as a guest at 390 by 844: presses on "Start run" on the page of "French from English", on its completed run's play button on Home, on "Re-run" and "Re-run these" on that run's page, and on "End run" on an active run's card each dim the window with the sentence beneath "Log in", and Escape brings each page back.
- In headless Chromium as a user, with the three variables set, at 390 by 844: Edit card shows Cancel and Save, a value typed in a field stays, and "Start run" on a practice's page opens a run's card.

**Debrief**

- `read only with onReadOnlyPress, a chip is aria-disabled, opens no sheet and calls it` passes: each chip and each count is enabled and `aria-disabled="true"`, a chip greyed and without `tappable-sm`; a press on a chip calls it once and opens no sheet, a press on a count calls it again and leaves the counts checked as they were, and neither `onMove` nor `onToggleCount` is called.
- `a guest's New practice is greyed, with Done alone, and a press on the picker opens the prompt` passes: from `?deck=d2`, Name and the picker are read only, Name outlined in line grey with aside-grey words, "Remove Ports" `aria-disabled`, nothing `:disabled`, the bar `["Done"]` above "1 selected"; presses on the picker, on Name and on "Remove Ports" open the prompt three times, open no list, change no value and no `deck` or `name` param, and send nothing but GET; Done lands on `/practices`.
- `a guest's Edit practice is read only, with Done alone, and Delete practice opens the prompt` passes: Name read only and greyed, "Delete practice" `aria-disabled`, nothing `:disabled`, the bar `["Done"]`; a press on Name, typing, then "Delete practice" open the prompt twice, change no value, ask no question and send no request; Done lands on `/practices/p1`.
- `a guest's board of a practice with no active run is greyed with no line, and a press on a chip opens the prompt` passes: no "A run is active.", the bar `["Done"]`, nothing `:disabled`, all three chips and the count `aria-disabled`; a press on a chip and one on the count open the prompt twice, open no sheet, leave the count checked and Port Number on the prompt side; Done leaves for `/practices/p1` and nothing but GET is sent.
- `a guest's board of a practice with an active run reads as a user's` passes: "A run is active." stands, the chip is `disabled` with no `aria-disabled` anywhere, the bar `["Done"]`, and a press opens neither the prompt nor a sheet.
- Every case the four files held before passes, as a user: the full suite is 780 passed, T3's 774, this task's 5, and one case of `frontend/src/components/ui/Scrim.test.tsx` below. With `guest` forced false in the three pages, the three page cases for a guest fail; with `onReadOnlyPress` ignored in `FieldAssignmentBoard`, its new case fails; restored, all pass. Every case of `frontend/src/test/formParts.test.ts` passes, the file unchanged.
- `grep -c "every form, while not logged in" docs/vocabulary.md` printed `1`.
- Headless Chromium as a guest, at 390 by 844 and at 1440 by 900 alike, each bar's buttons were `["Done"]`, every text input in `<main>` read only, no request but GET was sent, and Done left each form: New deck to `/library`; Edit deck of "Common words" to `/decks/<Common words id>`; New card to `/library`; Edit card of the card holding water to `/decks/<Common words id>`; New practice to `/practices`; Edit practice of "French from English" and its board of "Common words" to `/practices/<French from English id>`. `:disabled` in `<main>` were, in New deck, each Field type, Move Term up, Remove Term, Move Definition down and Remove Definition, and in Edit deck, each Field type, Move English up and Move Spanish down, which a user's form disables too; in the five other forms nothing. `aria-disabled` were "Delete card", "Delete practice", and the board's five chips.
- On the board at 390 by 844, a press on the chip [Chinese] dimmed the window, the scrim 0 to 390 by 0 to 844, the sentence 197 to 374 by 99 to 119 beneath "Log in" at 297 to 374 by 45 to 89, `elementFromPoint` at "Log in"'s centre "Log in", no sheet and no line; Escape brought the board back at the same address.
- Edit card with a press on its first input, screenshotted at 390 by 844 beside drawing 3 and at 1440 by 900 beside drawing 4's fourth screen, each drawing rendered from the canvas: the sentence 197 to 374 and 847 to 1024 by 99 to 119, "Log in" 297 to 374 and 947 to 1024 by 45 to 89, so one right edge and 10px beneath, as each drawing places them. It differs from the drawings in "Delete card", which T3's Out of scope names, and in the browser's focus outline on the pressed input, which no Out of scope names: T2 keeps focus on the pressed control. Before this task's change to `Scrim`, the corners of "Log in"'s box stayed undimmed, where the drawings dim them; now `elementFromPoint` at its box's top-left corner is the scrim.
- Headless Chromium as a guest at 390 by 844, each of these dimmed the window, the scrim 0 to 390 by 0 to 844, the sentence 197 to 374 by 99 to 119 beneath "Log in" at 297 to 374 by 45 to 89, `elementFromPoint` at "Log in"'s centre "Log in", and Escape removed the scrim and the sentence at the same address, with no request but GET: "Start run" on the page of "French from English"; "Practice French from English", its completed run's play button on Home; "Re-run" on that run's page; "Re-run these" on it at `?kind=up`; and "End run" on the active run of "Two at random".
- Headless Chromium as a user at 390 by 844, against a Vite on port 5180 with `VITE_DEV_AUTH` and its `/api` routed to an API on port 8002 with `DEV_AUTH_USER_ID` and `ENV=development`: Edit card showed `["Cancel","Save"]` and no guest's banner, and "zz" typed in the first field read "pwdzz", with no prompt and no request. The dev user's one practice, "Commands: Basic", has an active run, so its page shows "Continue run", which goes through the same guarded start as "Start run": it sent `POST /api/practices/<id>/runs` and opened the run's card, the existing run, with "Show answer" on it. No practice was made to show "Start run".
- The guest checks ran against the dev server on 5173, its `/api` routed by Playwright to `DEV_AUTH_USER_ID= uv run uvicorn app.main:app --port 8001`. The APIs on 8001 and 8002 and the Vite on 5180 are stopped; 5173 and 8000 were left untouched.
- Departure, with the engineer's approval: `frontend/src/components/ui/Scrim.tsx` cuts its hole with the anchor's own rounded corners, and `frontend/src/components/ui/PickerCombobox.tsx` gives its anchor, the `<div>` around the input, the input's `rounded-field`. The holes of "Log in", the "Rate" chip and the deck picker each now fit their control: as a user, `elementFromPoint` at the top-left corner of the chip's box and of the picker's box is the scrim, at its centre the control. `rounds the hole's corners as the anchor's are, at most half its shorter side` in `frontend/src/components/ui/Scrim.test.tsx` fails with a radius forced to 0, and two cases there check the hole in the path's form.
- Departure from guidance: none in the Details.
- Read: `holeClipPath` and `cornerRadii` in `frontend/src/components/ui/Scrim.tsx`, where the radii are read only when the anchor's box moves. In `frontend/src/components/library/FieldAssignmentBoard.tsx`, a guest's chip is a `ReadOnlyButton`, and a guest's count keeps its checkbox, `aria-disabled`, whose change calls `onReadOnlyPress` in place of `onToggleCount`. `DeckBoardPage` greys a board for a guest only where `readOnlyLine` is null, so a board no one can change reads as a user's.
