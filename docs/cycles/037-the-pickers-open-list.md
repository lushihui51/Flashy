# 037 — The picker's open list

Canvas: https://claude.ai/artifact/59jQNCW7H16XtZNsFnXXgU

## Goal

Outcome: While any filter's or picker's list is open, the list is a panel pointing at the control that opened it, everything else on the page is dimmed and stays readable, the control and its list stay bright, the user keeps typing in the control, and a tap on the dimmed page closes the list and acts on nothing.

Scope: The cycle covers the app's own `Scrim`, which dims the whole screen in ink at an opacity with a hole over the control, catches the tap that closes the panel so nothing beneath receives it, and locks the page's scroll while open; and `PickerCombobox`, the one filter and picker, whose list becomes a Radix Popover with the scrim rendered in its portal beneath the panel, the panel drawn as drawings 24 and 25 have it. Every caller of the picker, the two filters and the three form pickers, takes the change through the component unchanged. It leaves out the rating chips' popover, which is neither a filter nor a picker and whose dimming no decision settles; the summary's key, which the summary's cycle builds on the same scrim inside its sheet; and a deck option's subject beneath its name, which the drawings show and no decision gives.

Judgement: The engineer judges on the live server at 390 wide: opening "All subjects" on New practice matches drawing 24, the page dimmed with the control bright and the panel pointing at it; opening the deck picker on New card matches drawing 25, the form dimmed the same way; typing while the list is open narrows it; tapping a row beneath the dimming closes the list and that row does nothing; the page cannot scroll while the list is open, and choosing or closing restores it.

## Records

- ADR 016: Radix Dialog for modal overlays
- ADR 017: React Testing Library with a per-file jsdom environment
- ADR 090: Eight colour tokens named by meaning as the only colours
- ADR 098: Radix Popover for anchored non-modal overlays, over the app's own scrim when dimmed

## Tasks

### T1 — The scrim

**Status**

- [x]

**Goal**

The app has one `Scrim` that dims the whole screen but a hole over the control it is given, closes its panel on a tap that reaches nothing beneath, and locks the page's scroll while it is shown.

**Dependencies**

None.

**Files**

- `frontend/src/components/ui/Scrim.tsx` (new)
- `frontend/src/components/ui/Scrim.test.tsx` (new)

**Details**

The component, ADR 098, new at `frontend/src/components/ui/Scrim.tsx`:

```tsx
type ScrimProps = {
  /** The control the panel belongs to: the scrim leaves a hole over its box and dims
   * everything else. */
  anchor: RefObject<HTMLElement | null>;
  /** Called on a pointerdown on the scrim, which reaches nothing beneath; the caller
   * closes its panel. */
  onDismiss: () => void;
};

export default function Scrim({ anchor, onDismiss }: ScrimProps): ReactNode;
```

- It must render one element with `data-testid="scrim"` covering the whole screen, `fixed inset-0`, above the header's `z-40`, in ink at 20%, `bg-(--color-ink)/20`, the one translucent colour ADR 090 allows, as drawings 24 and 25 have the dimming.
- It must leave a hole over the anchor's `getBoundingClientRect()`, measured when it mounts and again on a window resize, through which pointer events reach the control, so the user keeps typing. Guidance: a `clip-path` polygon with an even-odd hole the size of the rect, in CSS px measured from the browser, which ADR 101 allows since a measurement is not a literal; the hole's corners match the control's `rounded-field` radius as far as `clip-path` allows, or stay square.
- A `pointerdown` on it must call `preventDefault()` and then `onDismiss` once, and nothing beneath receives the tap, since the scrim covers it.
- While it is mounted, the page must not scroll: it sets `overflow: hidden` on `document.documentElement` on mount and restores the previous value on unmount.
- It renders no words and takes no `className`.

Tests, in `Scrim.test.tsx`, under jsdom, ADR 017: with an anchor whose `getBoundingClientRect` is mocked to a known rect, the scrim's inline style names that rect's numbers; a `pointerdown` on it calls `onDismiss` once and the event reads `defaultPrevented`; `document.documentElement.style.overflow` is `hidden` while it is mounted and back to its previous value after it unmounts; a click on a button rendered beneath it, dispatched at the button, is the only way the button's handler runs, since a pointerdown on the scrim never reaches it.

**Out of scope**

- The scrim bounded to one element rather than the screen, which the summary's key needs inside its sheet: the summary's cycle, which extends this component.
- Any use of the scrim: T2.

**Done when**

- `cd frontend && npx vitest run src/components/ui/Scrim.test.tsx src/test/theme.test.ts src/test/pxLiterals.test.ts` passes.
- `grep -c "bg-(--color-ink)/20" frontend/src/components/ui/Scrim.tsx` prints `1`.

**Debrief**

Evidence:

- `cd frontend && npx vitest run src/components/ui/Scrim.test.tsx src/test/theme.test.ts src/test/pxLiterals.test.ts` printed `Test Files  3 passed (3)`, `Tests  12 passed (12)`.
- `grep -c "bg-(--color-ink)/20" frontend/src/components/ui/Scrim.tsx` printed `1`.

Departures from guidance: none. The hole is the `clip-path` even-odd polygon the Details suggest, with square corners, which the Details allow, so a control's rounded corners show a sliver of undimmed page until the eye reaches its outline. The scrim stands at `z-50`, the Details fixing only "above the header's `z-40`"; no caller of the picker renders it inside a dialog, whose `z-60` would cover it.

An addition the Details do not name: `swallowNextClick` in `Scrim.tsx`, with three tests beyond those the Details list. The Details say nothing beneath receives the tap "since the scrim covers it", and that reason fails for touch. A touch's click arrives after its pointerdown, by when the caller has closed the panel and removed the scrim, so the click lands on what lay beneath. A plain-page probe in headless Chromium, touch emulated through Playwright, printed `scrim pointerdown`, `click@below`, `BELOW CLICKED`; a mouse in the same page printed only `scrim pointerdown`, since a mouse's click does not fire once its pointerdown's target is gone. So on a touch or a pen pointerdown the scrim now swallows the next click, and a later pointerdown stands that down.

The real component, bundled from the scratchpad into a blank page in the same Chromium at 390 wide, printed:

- Mouse on the page: `dismiss`, scrim gone, `overflow` restored, the button beneath not clicked.
- Emulated touch on the page: `dismiss`, scrim gone, `overflow` restored, the button beneath not clicked; a second tap, the scrim gone, clicked it.
- Mouse in the hole: no `dismiss`, focus in the control, scrim still up, `overflow` `hidden`, and the clip path `polygon(evenodd, 0px 0px, 100% 0px, 100% 100%, 0px 100%, 0px 0px, 16px 120px, 324px 120px, 324px 166px, 16px 166px, 16px 120px)`.

Not checked: a tap on a real device, since none can reach the dev server, so the touch result above is emulation only. The hole and the dimming have not been seen in the app, since nothing uses `Scrim` until T2, and T2's Done when drives a mouse, which cannot show the touch case.

Read: `swallowNextClick` in `frontend/src/components/ui/Scrim.tsx`, the one thing here the Details did not ask for.

### T2 — The picker's list as a panel

**Status**

- [x]

**Goal**

Every filter's and picker's list opens as a Radix Popover panel pointing at its control, over the scrim, drawn as drawings 24 and 25 have it, and the cycle's judgement holds.

**Dependencies**

- T1: `Scrim` in `frontend/src/components/ui/Scrim.tsx`.

**Files**

- `frontend/src/components/ui/PickerCombobox.tsx`
- `frontend/src/components/ui/PickerCombobox.test.tsx`
- `frontend/src/components/practice/PracticeFilterBar.tsx`
- `frontend/src/index.css`
- `frontend/src/components/library/CardStandaloneForm.test.tsx`
- `frontend/src/components/library/DeckEditor.test.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.test.tsx`
- `frontend/src/pages/PracticeOverviewPage.test.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`
- `frontend/src/pages/practicePrefilterChain.test.tsx`

**Details**

The mechanism, ADR 098, in `PickerCombobox.tsx`:

- While any list of choices is open, a filter's or a picker's, the list must open as its own panel pointing at the control that opened it; everything else on the page must be dimmed and stay readable; a tap on the dimmed page must close the list and change nothing.
- The list must be a `@radix-ui/react-popover`, never the absolutely placed box closed on blur it is today: `Popover.Root` controlled by the component's `open`, `Popover.Anchor` around the input, and `Popover.Portal` holding, in this order, `<Scrim anchor={…} onDismiss={close} />` and `Popover.Content` with the list, so the scrim lies in the popover's portal beneath the panel.
- The popover is non-modal: `Popover.Content` prevents its open and close auto-focus, so focus stays in the input and the user keeps typing while the list is open; a focus moving outside, as Tab does, closes the list through Radix's own dismiss. `onBlur` closes nothing any more.
- Escape, choosing an item, choosing the action row and a pointerdown on the scrim each close the list; the arrow keys and Enter keep their behaviour; the `inputRef` prop and the deck form's return of focus to it stay.
- `PICKER_MAX_ITEMS`, the "Showing N of N · type to narrow" footer, the `purpose` variants and every word stay as they are.

The panel's look, drawings 24 and 25:

- The panel is a `tappable` block in surface with `rounded-[1.125rem]` corners and `p-1.5` padding, `w-65` wide, `side="bottom"`, `align="start"`, `sideOffset={14}` and `collisionPadding={16}`, flipping above the control when the screen below is short. Its press shadow is `tappable`'s, 3px, where the drawings have 4px: a shadow's offset lives only in `index.css` utilities, ADR 101, and the one difference stays.
- It carries a pointer at the control through `Popover.Arrow asChild` wrapping a `size-3.5` square in surface rotated 45°, outlined on its top and left by a new `index.css` utility, exactly:

```css
@utility outlined-pointer {
  border-top: 1.5px solid var(--color-ink);
  border-left: 1.5px solid var(--color-ink);
}
```

Radix sets the pointer under the control's centre, where the drawings have it nearer the control's left edge; the pointer still points at the control, and the difference stays.

- Each row is `min-h-11` with `rounded-xl` corners, `px-3 py-2` and a `gap-2.5`, its words `text-base font-semibold` in ink; the highlighted row, the one the arrow keys or the pointer rest on, is tinted ground; the chosen row, the selected item, or the clear row when a filter has nothing chosen, opens with a `Check` icon from lucide at `size-icon`, and every other row keeps a blank of that width so the words line up, as both drawings have it.
- A 1px `line` rule, Tailwind's `border-t`, parts the create row from the items above it; no rule stands before a clear row, which is first.
- While the list is open, the control reads as open: its outline is `outlined-ink` in place of `outlined-line`, and a filter's chevron points up, as drawing 25 has it; `PracticeFilterBar.tsx` changes only if its chevron needs the open state passed down.

Tests: `PickerCombobox.test.tsx` keeps every test it has, opening the list by click as before, and gains three: with the list open, a `pointerdown` on `[data-testid="scrim"]` closes it and a button rendered beside the picker is not clicked; typing while open narrows the options and the input keeps focus; `document.documentElement.style.overflow` is `hidden` while open and restored after a choice. The page and form tests in Files change only where they relied on blur closing the list.

`frontend/src/test/setup.ts` keeps its `ResizeObserver` stub and is not touched.

**Out of scope**

- The rating chips' popover dimming the page: an unsettled decision, raised to the engineer.
- The summary's key over its sheet: the summary's cycle.
- A deck option's subject beneath its name, which the drawings show: an unsettled decision.
- A second way to build a dimmed panel: never, ADR 098.

**Done when**

- `grep -c "react-popover" frontend/src/components/ui/PickerCombobox.tsx` prints `1`, `grep -c "onBlur" frontend/src/components/ui/PickerCombobox.tsx` prints `0`, and `grep -c "^@utility outlined-pointer" frontend/src/index.css` prints `1`.
- `cd frontend && npx vitest run` passes over the whole frontend, the three new picker tests among them.
- The cycle's judgement, in headless Chromium against `localhost:5173`, signed out of Clerk with `DEV_AUTH_USER_ID` and `ENV=development`, at 390 wide, by mouse: on `/practice/new`, a click on "All subjects" shows `[data-testid="scrim"]` with a computed background of `rgba(23, 33, 43, 0.2)`, `document.documentElement.style.overflow` reads `hidden`, the panel's `getBoundingClientRect().top` is below the control's bottom, and `document.activeElement` is the control; typing one letter narrows the options and the control still has focus; a click on a configuration row's position beneath the dimming closes the list, leaves the URL unchanged and restores `overflow`; on `/cards/new`, the deck picker opens the same way and choosing a deck closes it and fills the control. The script prints each check, and its output is the evidence.
- Screenshots at 390 wide of New practice with "All subjects" open and of New card with the deck picker open, saved in the session scratchpad and named in the Debrief, for the engineer to set beside drawings 24 and 25.

**Debrief**

Evidence:

- The three greps printed `1`, `0` and `1`.
- `cd frontend && npx vitest run` printed `Test Files  62 passed (62)`, `Tests  737 passed (737)`. `PickerCombobox.test.tsx` gained the three named tests and four more: a focus moving outside closes the list and a press on the input does not; Escape leaves focus in the input; the check marks the chosen row; the control reads as open.
- The judgement, in headless Chromium at 390 wide by mouse, signed out:
  - On `/practice/new`, a click on "All subjects" printed a scrim background of `oklab(0.242969 -0.00863966 -0.0223459 / 0.2)`, `overflow` `hidden`, panel top 317 below control bottom 303, and the control as `document.activeElement`.
  - **The background does not read `rgba(23, 33, 43, 0.2)` as the Done-when has it.** Tailwind compiles the `bg-(--color-ink)/20` that T1 requires through oklab. Both values drawn to a canvas give `[25, 35, 45, 51]`, so the colour is the same. The engineer ruled that this line counts as met.
  - Typing `l` narrowed 7 options to 5 and typing `z` left only "All subjects"; the control kept focus each time.
  - A click at a configuration row's edit control, the scrim being the element at that point, closed the list, left the path at `/practice/new` and restored `overflow` to empty. With the list closed, the same click went to `/deck-configurations/…/edit`, so the target was live. A wheel over the dimming moved the page by 0.
  - On `/cards/new`, a click on the deck picker printed the same background, `overflow` `hidden`, the panel below the control and focus in the control. Choosing a deck printed `value Commands`, no list and `overflow` empty. The console held no errors.
- Screenshots: `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/abf69c58-e39c-4a8e-9301-999b80e15800/scratchpad/new-practice-all-subjects.png` and `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/abf69c58-e39c-4a8e-9301-999b80e15800/scratchpad/new-card-deck-picker.png`, with `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/abf69c58-e39c-4a8e-9301-999b80e15800/scratchpad/new-card-deck-chosen.png` showing a chosen deck's check and `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/abf69c58-e39c-4a8e-9301-999b80e15800/scratchpad/new-card-short.png` showing a 320-tall screen.

Departures from guidance: none. These are the choices the Details leave open, and where the build differs from a drawing:

- The pointer is `absolute`, turned `-rotate-135` rather than 45°, and centred on the panel's edge. Radix turns the arrow's wrapper 180° when the panel opens below, so -135° reads as drawn, and it points the right way when the panel flips above. A measured arrow's height would be added to `sideOffset`, making the gap 28 rather than the drawings' 14; the gap printed 14.
- A form picker also shows the chevron pointing up while open, since drawing 25 draws one, though the Details name only a filter's. A closed form picker still has no chevron, since no drawing shows one closed.
- The Plus and X icons on the action row are gone, since the Details give every row but the chosen one a blank and drawing 25 draws "New deck…" with one.
- `Popover.Content` takes `role="presentation"`, since focus stays in the input and it is not a dialog.
- A wrapper `div` holds the scrim and the panel, since `Popover.Portal` takes a single child.
- The panel is capped at Radix's available height and its list scrolls, which the Details do not name. The page is locked, so a list taller than the room would otherwise leave rows out of reach. At 320 tall the panel flipped above the control and scrolled 134 of 437.
- Drawing 24 draws the filters as pills that size to their words. The app's filters stay equal-width inputs, since the Details keep typing in the control and leave `PracticeFilterBar.tsx` unchanged, which it is. Its panel is 248 wide where the Details fix `w-65`, and the Details are built.

For the engineer to judge:

- Cancelling New subject returns focus to the picker, whose open-on-focus opens the list again, now dimmed: the browser printed one list, one scrim and `overflow` `hidden` after the dialog closed. The open-on-focus and the return of focus are unchanged code, so the list reopened before too; only the dimming is new.
- Tabbing into a picker opens it and dims the page in the same way.
- The hole's square corners, which T1 reported, show as small bright slivers at the control's rounded corners in both screenshots.

Not checked: a tap on a real device. Emulated touch on the scrim closed the list and left the URL alone, and emulated touch on a row chose it, which is emulation only. The on-screen keyboard's effect on the panel and the hole was not exercised.

Read: the `Popover.Arrow` child in `frontend/src/components/ui/PickerCombobox.tsx`, for the geometry above, and `onInteractOutside` beside it, which keeps a press on the input from closing the list.
