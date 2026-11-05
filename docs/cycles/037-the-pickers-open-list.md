# 037 — The picker's open list

Canvas: https://claude.ai/artifact/59jQNCW7H16XtZNsFnXXgU

## Goal

Outcome: While any filter's or picker's list is open, the list is a panel pointing at the control that opened it, everything else on the page is dimmed and stays readable, the control and its list stay bright, the user keeps typing in the control, and a tap on the dimmed page closes the list and acts on nothing.

Scope: The cycle covers the app's own `Scrim`, which dims the whole screen in ink at an opacity with a hole over the control, catches the tap that closes the panel so nothing beneath receives it, and locks the page's scroll while open; and `PickerCombobox`, the one filter and picker, whose list becomes a Radix Popover with the scrim rendered in its portal beneath the panel, the panel drawn as drawings 24 and 25 have it. Every caller of the picker, the two filters and the three form pickers, takes the change through the component unchanged. It leaves out the rating chips' popover, which is neither a filter nor a picker and whose dimming no decision settles; the summary's key, which the summary's cycle builds on the same scrim inside its sheet; and a deck option's subject beneath its name, which the drawings show and no decision gives.

Judgement: The engineer judges on the live server at 390 wide: opening "All subjects" on the Practice page matches drawing 24, the page dimmed with the control bright and the panel pointing at it; opening the deck picker on New card matches drawing 25, the form dimmed the same way; typing while the list is open narrows it; tapping a row beneath the dimming closes the list and that row does nothing; the page cannot scroll while the list is open, and choosing or closing restores it.

## Records

- ADR 016: Radix Dialog for modal overlays
- ADR 017: React Testing Library with a per-file jsdom environment
- ADR 090: Eight colour tokens named by meaning as the only colours
- ADR 098: Radix Popover for anchored non-modal overlays, over the app's own scrim when dimmed

## Tasks

### T1 — The scrim

**Status**

- [ ]

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

None.

### T2 — The picker's list as a panel

**Status**

- [ ]

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

The mechanism, ADR 098 and LPD12, in `PickerCombobox.tsx`:

- The list must be a `@radix-ui/react-popover`, never the absolutely placed box closed on blur it is today: `Popover.Root` controlled by the component's `open`, `Popover.Anchor` around the input, and `Popover.Portal` holding, in this order, `<Scrim anchor={…} onDismiss={close} />` and `Popover.Content` with the list, so the scrim lies in the popover's portal beneath the panel.
- The popover is non-modal: `Popover.Content` prevents its open and close auto-focus, so focus stays in the input and the user keeps typing while the list is open; a focus moving outside, as Tab does, closes the list through Radix's own dismiss. `onBlur` closes nothing any more.
- Escape, choosing an item, choosing the action row and a pointerdown on the scrim each close the list; the arrow keys and Enter keep their behaviour; the `inputRef` prop and the deck form's return of focus to it stay.
- `PICKER_MAX_ITEMS`, the "Showing N of N · type to narrow" footer, the `purpose` variants and every word stay as they are.

The panel's look, LPD12, drawings 24 and 25:

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
- The cycle's judgement, in headless Chromium against `localhost:5173`, signed out of Clerk with `DEV_AUTH_USER_ID` and `ENV=development`, at 390 wide, by mouse: on `/practice`, a click on "All subjects" shows `[data-testid="scrim"]` with a computed background of `rgba(23, 33, 43, 0.2)`, `document.documentElement.style.overflow` reads `hidden`, the panel's `getBoundingClientRect().top` is below the control's bottom, and `document.activeElement` is the control; typing one letter narrows the options and the control still has focus; a click on a practice row's position beneath the dimming closes the list, leaves the URL unchanged and restores `overflow`; on `/cards/new`, the deck picker opens the same way and choosing a deck closes it and fills the control. The script prints each check, and its output is the evidence.
- Screenshots at 390 wide of the Practice page with "All subjects" open and of New card with the deck picker open, saved in the session scratchpad and named in the Debrief, for the engineer to set beside drawings 24 and 25.

**Debrief**

None.
