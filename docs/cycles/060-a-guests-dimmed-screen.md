# 060 — A guest's dimmed screen

Canvas: https://claude.ai/artifact/71XNtJPsedfTiKseGFDnx2

## Goal

Outcome: A guest's press that would change the example library dims the whole screen but for the guest's banner and "Log in", with no sentence, and a guest chooses a rating for each answer on a run's card, where "Next card" is the press that dims the screen.

Scope: The cycle covers `Scrim` cutting one hole over each element its caller names; `GuestScrim` in place of `LogInPrompt`, rendering `Scrim` alone with the guest's banner and "Log in" lit; the context that opens it under its new name, and the ref `Banner` and `ExampleBanner` take; the choosing of a rating taken out of the write guard; and the vocabulary's row for telling a guest to log in. It leaves out a guest's forms and every other guarded handler, which stand; a `Scrim` held to one bounding element and the card sheet's key in a completed run's summary, which stay as they are; and anything the server does for a guest.

Judgement: The engineer judges on the live server as a guest, at 390 by 844 and at 1440 by 900. A press on Start run, on a completed run's play button on Home, on Re-run, on Re-run these, on End run or on a greyed form's input dims the whole screen at half of ink but for the guest's banner and "Log in", as drawings 3 and 7 and drawing 4's fourth screen draw it, and no sentence appears. A press on the dimming or on the banner, or Escape, brings the screen back with nothing changed, and a press on "Log in" brings it back and opens Clerk's dialog. On a run's card, a chosen rating shows on its answer, "Next card" comes alive once every answer is rated, and its press dims the screen as drawing 6 draws it; after a reload the ratings still show. A picker's list and a rating's list dim the page as they did. Logged in, every one of those controls acts as it did.

## Records

- PDR 058: A dimmed screen telling guests to log in
- ADR 017: React Testing Library with a per-file jsdom environment
- ADR 069: One vocabulary file for the user's words and the code's names
- ADR 133: Radix Popover and tracking scrim for anchored overlays
- ADR 134: One write guard dimming a guest's screen

## Tasks

### T1 — The scrim's holes

**Status**

- [x]

**Goal**

`Scrim` cuts one hole over each element its caller names, each in its element's own corners and following its box, and dims the rest with or without a panel to close.

**Dependencies**

None.

**Files**

- `frontend/src/components/ui/Scrim.tsx`
- `frontend/src/components/ui/Scrim.test.tsx`
- `frontend/src/components/ui/PickerCombobox.tsx`
- `frontend/src/components/run/RatingChip.tsx`
- `frontend/src/components/shell/LogInPrompt.tsx`

**Details**

ADR 133. `ScrimProps` in `frontend/src/components/ui/Scrim.tsx` becomes:

```tsx
type ScrimProps = {
  /** The elements left lit: the scrim cuts one hole over each one's box, in that element's own
   * corners, and dims everything else. Each hole follows its box wherever it moves while the
   * scrim is mounted. A named element that is not mounted gets no hole. */
  lit: readonly RefObject<HTMLElement | null>[];
  /** Called on a pointerdown on the scrim, which reaches nothing beneath; a caller with a panel
   * closes it. */
  onDismiss?: () => void;
  /** How dark the dimming is: `fifth` of ink beneath a list of choices, `half` beneath the screen dimmed for a guest. */
  strength: 'fifth' | 'half';
};
```

- `anchor` must be gone, and each of `Scrim`'s three callers must pass `lit` holding the one element it passed as `anchor`: `PickerCombobox` its control, `RatingChip` its chip, and `LogInPrompt` "Log in". Each of the three must draw and close as it did.
- `Scrim` must cut one hole over each named element that is mounted, with that element's corner radii as `cornerRadii` reads them, and dim everything else. A named element that is not mounted must get no hole and throw nothing, and the holes of the others stand.
- While mounted, `Scrim` must read each named element's box on every animation frame, and must set state only on a frame where a box has moved, appeared or gone (ADR 133).
- With no `onDismiss`, a pointerdown on the scrim must still have its default prevented and reach nothing beneath, and the click that ends a touch begun on it must still be swallowed.
- `strength`, the scroll lock, `data-testid="scrim"` and `z-50` must stay as they are.

Guidance: `holeClipPath` can take every hole and return one `path(evenodd, …)` of the screen's rectangle followed by one cut-out per hole; two holes that overlapped would dim their overlap, and no caller names two that do. The measuring loop can read the latest `lit` through a ref, so a caller that hands a new array on a re-render restarts nothing. `mockRect` in `Scrim.test.tsx` answers one box for every element, so a case with two holes needs a box per element.

**Out of scope**

- The guest's banner lit beside "Log in": T2. Until then `LogInPrompt` names "Log in" alone and shows its sentence, as today.
- A `Scrim` held to one bounding element, and the card sheet's key over one: an unsettled decision.
- A third strength: never; ADR 133 names two.
- A box read on a resize or when the header's height changes, in place of every frame: never; ADR 133 rejects it.
- A second scrim component: never; ADR 133 rejects it.

**Done when**

- In `frontend/src/components/ui/Scrim.test.tsx`, `cuts one hole over each named element, each in its own corners` passes.
- `moves one hole when its element's box moves between two frames, leaves the other, and renders nothing new while both are still` passes.
- `cuts no hole over a named element that is not mounted, and keeps the other's` passes.
- `with no onDismiss, prevents a pointerdown on it and runs nothing beneath` passes.
- `grep -rn "anchor=" frontend/src --include=*.tsx | grep -c "Scrim"` prints `0`.
- In headless Chromium as a user at 390 by 844, on New card with the deck picker's list open: the scrim's background is ink at 0.2, `document.elementFromPoint` at the centre of the picker's input is that input, and a press on the dimming closes the list.
- As a user on an active run's card with its answers shown: "Rate" opens its four ratings over the page dimmed at 0.2 of ink, `document.elementFromPoint` at the chip's centre is the chip, and a press on the dimming closes the list and leaves the chip reading "Rate".
- As a guest on a practice's page with no active run: a press on "Start run" dims the window at 0.5 of ink, `document.elementFromPoint` at the centre of "Log in" is "Log in", and "Log in to use all of Flashy." stands beneath it, as before this task.

**Debrief**

- `npx vitest run src/components/ui/Scrim.test.tsx --reporter=verbose` printed `✓ … > Scrim > cuts one hole over each named element, each in its own corners`, with `Tests  16 passed (16)`.
- The same run printed `✓ … > Scrim > moves one hole when its element's box moves between two frames, leaves the other, and renders nothing new while both are still`.
- The same run printed `✓ … > Scrim > cuts no hole over a named element that is not mounted, and keeps the other's`.
- The same run printed `✓ … > Scrim > with no onDismiss, prevents a pointerdown on it and runs nothing beneath`. The case also asserts that the click ending a touch begun on the scrim is swallowed and the click after it is not; that is jsdom alone, and no browser check drove a touch.
- `grep -rn "anchor=" frontend/src --include=*.tsx | grep -c "Scrim"` printed `0`.
- As a user at 390 by 844 on New card, the deck picker's list open with 6 options: the scrim's computed background was `oklab(0.242969 -0.00863966 -0.0223459 / 0.2)`, where `--color-ink` is `#17212b`, which is `oklab(0.242972 -0.00865 -0.022351)`; its box was `0,0 390x844` with one hole; `document.elementFromPoint` at the centre of the picker's input was that input, compared by identity. A press on the dimming at 195,800 left `aria-expanded` `false`, no scrim and no option, at `/cards/new`, with no `/api` request but `GET`.
- As a user on the active run's card of "Commands: Basic" with its answers shown: "Rate" opened `["Again","Hard","Good","Easy"]`; the scrim's background was the same ink at `/ 0.2`, with one hole; `document.elementFromPoint` at the chip's centre was the chip, by identity. A press on the dimming at 195,800 left no scrim and no rating's button, the chip reading "Rate", no rating in the address, and no `/api` request but `GET`.
- As a guest on "French from English", which has no active run: a press on "Start run" gave a scrim whose box was the window's, `0,0 390x844`, in the same ink at `/ 0.5`, with one hole; `document.elementFromPoint` at the centre of "Log in" was "Log in", by identity; "Log in" stood at `297,45 77x44` and the `status` reading "Log in to use all of Flashy." at `197,99 177x20`, beneath it and ending at the same right edge, 374. A press on the dimming removed the scrim at the same address, with no `/api` request but `GET`.
- `npx vitest run` printed `Test Files  81 passed (81)` and `Tests  785 passed (785)`; `npm run lint` printed no finding; `npm run build` printed `✓ built`.
- No departure from the guidance. `holeClipPath` takes every hole, the measuring reads `lit` through a ref, and `mockRects` beside `mockRect` in `Scrim.test.tsx` answers each element the box under its `aria-label`.
- In `Scrim.test.tsx`, `names the anchor's rect in its inline style` and `rounds the hole's corners as the anchor's are, at most half its shorter side` now read "a lit element's" and "its element's", and `moves the hole when the anchor's box moves between two frames, and renders nothing new while it is still` gave way to the case with two holes. Two cases stand beyond the four named: `cuts a hole on the frame after a named element mounts, and takes it away on the frame after it is gone`, and `goes on measuring, and keeps the page locked, through a re-render that hands it a new lit array`.
- The user's checks ran against a second API on port 8002 and a second frontend on port 5180, started with the three variables set and stopped after; the guest's check ran against the servers already on 8000 and 5173, which have none of the three.
- Read the two effects at the top of `Scrim` in `frontend/src/components/ui/Scrim.tsx`: the measuring effect has an empty dependency list and reads `litRef`, which a layout effect before it sets on every render, since the lint forbids writing a ref while rendering. A `lit` whose elements change is therefore picked up on the next frame, and on a frame where any box has moved, appeared or gone, every mounted element's corners are read again. An element whose corners change while its box stays still keeps its old corners, as before this task.

### T2 — The screen dimmed for a guest

**Status**

- [ ]

**Goal**

A guest's press that would change the example library dims the whole screen but for the guest's banner and "Log in", with no sentence, through `GuestScrim`, and a press anywhere or Escape brings the screen back.

**Dependencies**

- T1: `Scrim`'s `lit`, and its `onDismiss` left out.

**Files**

- `frontend/src/components/shell/GuestScrim.tsx` (new)
- `frontend/src/components/shell/GuestScrim.test.tsx` (new)
- `frontend/src/components/shell/LogInPrompt.tsx` (deleted)
- `frontend/src/components/shell/LogInPrompt.test.tsx` (deleted)
- `frontend/src/components/shell/AppShell.tsx`
- `frontend/src/components/shell/AppShell.test.tsx`
- `frontend/src/components/shell/Banner.tsx`
- `frontend/src/components/shell/Banner.test.tsx`
- `frontend/src/components/shell/ExampleBanner.tsx`
- `frontend/src/lib/viewer.ts`
- `frontend/src/lib/viewer.test.tsx`
- `frontend/src/components/library/CardStandaloneForm.tsx`
- `frontend/src/components/library/CardStandaloneForm.test.tsx`
- `frontend/src/components/library/DeckEditor.tsx`
- `frontend/src/components/library/DeckEditor.test.tsx`
- `frontend/src/components/run/RerunButton.test.tsx`
- `frontend/src/components/run/RunBreakdown.test.tsx`
- `frontend/src/pages/DeckBoardPage.tsx`
- `frontend/src/pages/DeckBoardPage.test.tsx`
- `frontend/src/pages/HomePage.test.tsx`
- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`
- `frontend/src/pages/PracticeDetailsPage.test.tsx`
- `frontend/src/pages/PracticeEditPage.tsx`
- `frontend/src/pages/PracticeEditPage.test.tsx`
- `frontend/src/pages/RunPage.test.tsx`
- `docs/vocabulary.md`

**Details**

PDR 058 and ADR 134, with drawings 3 and 7 and drawing 4's fourth screen as constraints on the dimmed screen. `frontend/src/lib/viewer.ts` holds, in place of `LogInPromptContext`:

```ts
/** Dims the screen for a guest. `AppShell` provides it; outside the shell it does nothing. */
export const GuestScrimContext: Context<() => void>;

/** For a control that would write. The function it returns runs `write` while `useViewer()` answers `user`; otherwise it dims the screen for a guest and runs nothing. */
export function useWriteGuard(): (write: () => void) => void;
```

`frontend/src/components/shell/GuestScrim.tsx`:

```tsx
type GuestScrimProps = {
  open: boolean;
  /** Called on a pointerdown anywhere in the document and on a keydown of Escape; the caller closes it as well when the address changes. */
  onClose: () => void;
  /** The guest's banner, left lit. */
  banner: RefObject<HTMLElement | null>;
  /** "Log in" in the top bar, left lit. */
  logIn: RefObject<HTMLElement | null>;
};
export default function GuestScrim({ open, onClose, banner, logIn }: GuestScrimProps): ReactNode;
```

`frontend/src/components/shell/Banner.tsx` and `frontend/src/components/shell/ExampleBanner.tsx`:

```tsx
type BannerProps = {
  color: 'wrong' | 'ink';
  Icon?: LucideIcon;
  children: string;
  /** The banner's element. */
  ref?: Ref<HTMLDivElement>;
};
export default function ExampleBanner({ ref }: { ref?: Ref<HTMLDivElement> }): ReactNode;
```

- The component that dims the screen for a guest must be named `GuestScrim`, and the context that opens it `GuestScrimContext`; `useWriteGuard` keeps its name. `LogInPrompt.tsx` and its test file must be deleted.
- No name in the code may keep "prompt" for either. Under `frontend/src`, `LogInPrompt`, `LogInPromptProps`, `LogInPromptContext`, `openPrompt` and `promptKey` must each be gone, no comment may call the screen dimmed for a guest a prompt, and each test title's "opens the prompt" must read "dims the screen". "Prompt" as the name of a card's zone or of a field's side stays.
- `GuestScrim` must render nothing while closed. While open it must render `Scrim` alone, with `strength="half"`, `lit` holding `banner` and `logIn`, and no `onDismiss`: no Radix Popover or Dialog, no sentence, and no element of its own (ADR 134).
- While open, `GuestScrim` must hold two listeners of its own on `document`, added when it opens and removed when it closes: a `pointerdown` anywhere, on the dimming or inside a hole, calls `onClose`, and so does a `keydown` of Escape, and of no other key (ADR 134). Neither listener may prevent its event's default or stop the event. The press that opens it must not close it.
- Opening it must move no focus: focus stays on the control that was pressed.
- A pointer's press on "Log in" on the dimmed screen must close it and open Clerk's dialog, with the one press. Enter or Space on a control that holds focus acts on that control as it does on the page: on a guarded control it changes nothing, and on "Log in" it opens Clerk's dialog over the dimmed screen, which the next pointerdown or Escape closes. A press on the dimming must reach nothing beneath it.
- While it is open the page cannot scroll, and the dimming must cover the connection banner, the menu button, the logo, "+", the page and the bar at the foot, across the whole window (PDR 058, ADR 134).
- `Banner` must hand `ref` to its element, and `ExampleBanner` must hand its `ref` to `Banner`. `ConnectionBanner` takes none.
- `AppShell` must mount `GuestScrim` once, hold whether it is open, close it on a change of address, provide the way to open it through `GuestScrimContext`, and hold the guest's banner's ref beside the one of "Log in", handing the first to `ExampleBanner` and both to `GuestScrim`.
- Every handler that goes through `useWriteGuard` today must still go through it, and a guest's forms stay as they are.
- The vocabulary's row "Telling a guest to log in" must read:

```
| App | Telling a guest to log in | the whole screen dimmed but for the banner and "Log in" | Over every page, after a guest presses something that would change the example library | `GuestScrim`; `useWriteGuard` |
```

Guidance: `GuestScrim` can render as a child of `AppShell`'s root element with no portal, since `Scrim` is fixed at `z-50`, above the header's `z-40` and the foot bar's `z-10`. `AppShell` can hold the dimmed screen as the `location.key` it was opened at, as it holds the prompt today, so a change of address closes it with no effect. The two listeners can go on in an effect that runs while `open`; every guarded press is a click, which comes after its own pointerdown, so the press that opens the screen never reaches the new listener. In the eleven test files that hand a spy through the context, the spy can be named `dimScreen`.

**Out of scope**

- The shadow beneath "Log in", which drawings 3, 4 and 7 leave lit: never; a hole is its element's box (ADR 133), so the shadow dims.
- A greyed form's inputs `disabled`, as the drawings' markup has them: never; ADR 134 marks each `readOnly` or `aria-disabled`.
- Drawing 4's first three screens, the menu, a sheet and a question on a wide screen: they stand.
- The form greyed with Done alone beneath the dimming, which drawings 3, 4 and 7 show: it stands.
- A sentence beneath "Log in", the banner's or another: never; PDR 058 rejects both.
- The guest's banner dimmed, or the connection banner lit: never; PDR 058 and ADR 134.
- One hole over a box enclosing the banner and "Log in": never; ADR 133 rejects it.
- A Radix Popover or Dialog, Radix's `DismissableLayer`, or `AppShell` rendering `Scrim` itself: never; ADR 134 rejects each.
- "Log in" as the only thing that can be pressed once the screen has dimmed: never; PDR 058 rejects it.
- Enter or Space closing the dimmed screen, on "Log in" or on any other control: an unsettled decision.
- The choosing of a rating taken out of the guard: T3. Until then a guest's choice of a rating dims the screen.

**Done when**

- In `frontend/src/lib/viewer.test.tsx`, `the guard runs the write for a user, and for a guest dims the screen and runs nothing` passes.
- In `frontend/src/components/shell/GuestScrim.test.tsx`, `renders nothing while closed, and the scrim alone at half of ink while open, with no sentence and no move of focus` passes.
- `calls onClose on a pointerdown on the scrim, on a pointerdown on a lit element and on Escape, on no other key, and on none of them once closed` passes.
- In `frontend/src/components/shell/Banner.test.tsx`, `hands its element to a ref` passes.
- In `frontend/src/components/shell/AppShell.test.tsx`, `dims the screen from the context and brings it back on a press on Log in, on a press on the guest's banner and on a change of address` passes, with Clerk's `openSignIn` called once by the press on "Log in" and no `status` in the shell but the guest's banner.
- `ls frontend/src/components/shell | grep -c LogInPrompt` prints `0`.
- `grep -rniE "log-?in ?prompt|openPrompt|promptKey|opens the prompt" frontend/src | wc -l` prints `0`.
- `grep -c "LogInPrompt" docs/vocabulary.md` prints `0`, and `grep -c 'the whole screen dimmed but for the banner and "Log in" | Over every page, after a guest presses something that would change the example library | .GuestScrim.; .useWriteGuard. |' docs/vocabulary.md` prints `1`.
- In headless Chromium as a guest at 390 by 844, on a practice's page with no active run: a press on "Start run" dims the window, the scrim's box the window's, in ink at 0.5; `document.elementFromPoint` is the guest's banner at the banner's centre, "Log in" at the centre of "Log in", and the scrim at the centres of the menu button, of "+" and of "Start run"; "Log in to use all of Flashy." stands nowhere on the page but in the banner; focus stays on "Start run"; and no `/api` request with a method other than `GET` was sent. A press on the dimming brings the page back at the same address, and so does a press on the banner, and so does Escape.
- The same at 1440 by 900, where the banner's hole is as wide as the column and `document.elementFromPoint` at the banner's height, left of the column, is the scrim, as drawing 4's fourth screen draws it.
- As a guest with the screen dimmed and the browser then taken offline: the connection banner appears, `document.elementFromPoint` at its centre is the scrim, and at the new centres of the guest's banner and of "Log in" it is each of them.
- As a guest on Edit card at 390 by 844: a press on a greyed input dims the window as drawings 3 and 7 draw it, and a press on "Log in" removes the scrim.

**Debrief**

None.

### T3 — A guest's ratings

**Status**

- [ ]

**Goal**

A guest's chosen rating shows on its answer and stays in the address, and "Next card", alive once every answer is rated, is the press that dims the screen.

**Dependencies**

- T2: `GuestScrimContext`, and `GuestScrim` with the guest's banner and "Log in" lit.

**Files**

- `frontend/src/pages/RunPage.tsx`
- `frontend/src/pages/RunPage.test.tsx`

**Details**

PDR 058 and ADR 134, with drawing 6 as a constraint.

- `rate` in `RunCardView` must not go through `useWriteGuard`: a guest's choice of a rating is written to the address as a user's is, tagged with its card, and sends no request (ADR 134). No rating of a guest's may be held in component state.
- "Next card" must stay guarded, and `disabled` until every answer has a rating, for a guest as for a user. A guest's press on it once it is alive must dim the screen, send no request and leave the address as it was, so the ratings still show once the screen is back and after a reload.
- "End run" must stay guarded.
- In `RunPage.test.tsx`, the case `a guest opens the Rate list, and choosing a rating dims the screen and sets no rating` must give way to the two cases the Done when names.

**Out of scope**

- The shadow beneath "Log in", which drawing 6's second screen leaves lit: never; it dims, as in T2.
- "Rate" itself, or the choosing of a rating, dimming the screen: never; PDR 058 rejects both.
- A guest going on to the next card with nothing kept: never; PDR 058 rejects it.
- "Next card" pressable before every answer is rated: never; it comes alive from the address's ratings with no code of its own (ADR 134).
- A guest's ratings kept anywhere but the address: never; ADR 134 rejects it.
- Every other guarded handler: it stands.

**Done when**

- In `frontend/src/pages/RunPage.test.tsx`, `a guest's chosen rating shows on its answer and in the address, and dims nothing` passes.
- `a guest's Next card, alive once every answer is rated, dims the screen, sends no request and keeps the ratings in the address` passes.
- In headless Chromium as a guest at 390 by 844, on an active run's card of the example library: "Show answer" shows the answers; for each answer, "Rate" opens four ratings, and choosing one closes the list, shows the rating on the chip and dims nothing; "Next card" then reads as drawing 6's first screen draws it, and its press dims the window but for the guest's banner and "Log in", as drawing 6's second screen draws it, with no `/api` request but `GET`; a press on the dimming brings the card back with each chip still reading its rating; and after a reload each chip still reads its rating and "Next card" is still alive.
- The same at 1440 by 900.
- As a guest, at 390 by 844 and at 1440 by 900, each of these dims the window but for the guest's banner and "Log in", with no sentence, and Escape brings the screen back at the same address with no `/api` request but `GET`: "Start run" on a practice's page with no active run; a completed run's play button on Home; "Re-run" on a completed run's page; "Re-run these" on that page; "End run" on an active run's card; and a press on an input of Edit card.
- As a user at 390 by 844, on an active run's card with its answers shown: "Rate" opens its four ratings over the page dimmed at 0.2 of ink with the chip lit, choosing one shows it on the chip, and "End run" opens its question with no scrim.

**Debrief**

None.
