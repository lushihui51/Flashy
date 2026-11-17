# 056 — The wide screen's column

Canvas: https://claude.ai/artifact/2SDutroWHNF2C8vFSgq9J2

## Goal

Outcome: A wide screen shows every page, and everything that opens over one, in the phone's layout in one column in the middle of the window.

Scope: The cycle covers the column's width as one token; the shell's header and `<main>` held to it; the two utilities that hold an element fixed to the viewport to it; the bar at the foot, a sheet, a question, the menu and a sound opened from a card held to it; a picture opened from a card across the window; the source scan over elements fixed to the viewport; and a run's card with its prompt above its answers on every screen. It leaves out a layout made for a wide screen; the guest's banner, "Log in" as a block, the search's removal and the dimmed screen, which drawings 1, 4 and 5 also show and later cycles build.

Judgement: The engineer judges on the live server at 1440 by 900, then at 390 by 844. At 1440 wide, Your library, a deck's page and Edit card each sit in one centred column as drawing 1 places them, with the top bar and the connection banner as wide as the column and nothing of the app at the window's edges; the menu opens from the column's left edge beneath the header, the New sheet rises at the column's width, and Discard on a changed card stands in the column's middle, as drawing 4 places them, each dimming the whole window; the bar at the foot of Edit card is as wide as the column, as drawing 5 places it; and a run's card shows its prompt above its answers, at 1440 by 900 and at 844 by 390. At 390 wide every one of those screens looks as it did.

## Records

- PDR 031: Failures met in place, up to the whole page, with one banner for the connection
- PDR 050: The browser's text size followed by everything, wrapping and never scrolling sideways
- PDR 051: Cancel and Create or Save at the foot of every form, and Done alone where nothing can change
- PDR 052: Phone layout in one column on wide screens
- PDR 055: Prompt zone above rated answers in a run
- ADR 016: Radix Dialog for modal overlays
- ADR 017: React Testing Library with a per-file jsdom environment
- ADR 101: Every length in a component measured, derived, or a fixed design size in rem
- ADR 127: A measured header height and one component for every bar at the foot
- ADR 136: One column token for shell and fixed elements

## Tasks

### T1 — A card's zones on every screen

**Status**

- [x]

**Goal**

A run's card shows its prompt zone above its answer zone on every screen, whatever its size or orientation.

**Dependencies**

None.

**Files**

- `frontend/src/pages/RunPage.tsx`

**Details**

PDR 055: `RunCardView` and `ZONE_CLASS` in `frontend/src/pages/RunPage.tsx` must set the two zones one above the other at every size, so the `landscape:` variants that set them side by side go. Nothing else about a card changes.

**Out of scope**

- The two zones side by side at any width: never in this layout; PDR 055 leaves it to a layout made for a wide screen.
- The column that holds the run page on a wide screen: T2.

**Done when**

- `grep -c "landscape:" frontend/src/pages/RunPage.tsx` prints `0`.
- In headless Chromium on an active run's page, at 1440 by 900 and at 844 by 390, the bottom of the section headed "Prompt" is above the top of the section headed "Answer", and the two sections have one left edge.

**Debrief**

- `grep -c "landscape:" frontend/src/pages/RunPage.tsx` printed `0`.
- On the dev user's active run of "Commands: Basic", signed out with the local bypass, measured by `boundingBox`: at 1440 by 900, Prompt's bottom 516.5 above Answer's top 530.5, both left edges 16; at 844 by 390, the same figures, both left edges 16. At 390 by 844, where the removed variants never applied, the same tops and left edges.
- No departure from the Details: the change removes `landscape:flex-1` from `ZONE_CLASS` and `landscape:flex-row` from the zones' wrapper in `RunCardView`, and nothing else.
- Nothing in the code needs reading beyond that two-line diff.

### T2 — The column

**Status**

- [x]

**Goal**

Every page, the shell's header, the bar at the foot and everything that opens over a page sit in one centred column 40rem wide, and a source scan fails on an element fixed to the viewport that is neither held to the column nor made to cover the window.

**Dependencies**

None.

**Files**

- `frontend/src/index.css`
- `frontend/src/components/shell/AppShell.tsx`
- `frontend/src/components/shell/SideDrawer.tsx`
- `frontend/src/components/ui/FormBar.tsx`
- `frontend/src/components/ui/FormBar.test.tsx`
- `frontend/src/components/ui/BottomSheet.tsx`
- `frontend/src/components/ui/ConfirmDialog.tsx`
- `frontend/src/components/run/FieldValue.tsx`
- `frontend/src/components/run/FieldValue.test.tsx` (new)
- `frontend/src/test/fixedColumn.test.ts` (new)

**Details**

PDR 052 and ADR 136, with drawings 1, 4 and 5 as constraints on where each thing sits against the column and the window:

- `frontend/src/index.css` must hold the column's width as one `@theme` token, `--container-column: 40rem`, and nothing else may write that width.
- `AppShell`'s outer element keeps the ground across the window. Its `<header>` and its `<main>` must each be as wide as the column at most, centred. No page writes the column, and no breakpoint is used.
- `frontend/src/index.css` must define two utilities, each centring a fixed element on the column in the window less the scrollbar's width a dialog's scroll lock removes, read from `--removed-body-scroll-bar-size`: `inset-x-column`, which sets `left` and `right`, and `left-column`, which sets `left` alone. In a window narrower than the column the element spans the window, less the scrollbar's width while a scroll lock has removed one.
- `FormBar`'s bar, `BottomSheet`'s panel and `ConfirmDialog`'s panel must write `inset-x-column` in place of their `inset-x-*`. `ConfirmDialog`'s panel keeps its 1.25rem side margin, inside the column.
- `SideDrawer`'s panel must write `left-column` in place of `left-0`. It still starts at the top of the window, beneath the header that is drawn over it.
- `MediaChip` in `frontend/src/components/run/FieldValue.tsx`: the dialog of a sound must write `inset-x-column` and keep its 1rem side margin inside the column. The dialog of a picture must write `fixed inset-0`. Inside it one surface stands 1rem in from each of the window's four edges, holding the title and, in all the room beneath it, the picture, whole and never cropped; the image's `max-h-[70vh]` goes. A press on the dialog outside that surface closes it, as a press on the dimming closes it today.
- No screen can make a picture or a sound value today, so the two dialogs of `MediaChip` are checked in jsdom alone.
- Every scrim and dialog overlay keeps `inset-0`.
- `frontend/src/test/fixedColumn.test.ts` must scan every `.ts` and `.tsx` file under `frontend/src` but the tests. It removes every comment, then reads every string literal and template literal, and reports one whose words, split at white space, hold `fixed` and none of `inset-0`, `inset-x-column` and `left-column`.

Guidance: with `--container-column` in `@theme`, Tailwind gives `max-w-column`; `<header>` and `<main>` take `mx-auto w-full max-w-column`. The utilities, in `index.css` beside `tappable`:

```css
@utility inset-x-column {
  --column-gutter: max(0px, calc((100% - var(--removed-body-scroll-bar-size, 0px) - var(--container-column)) / 2));
  left: var(--column-gutter);
  right: calc(var(--column-gutter) + var(--removed-body-scroll-bar-size, 0px));
}
@utility left-column {
  left: max(0px, calc((100% - var(--removed-body-scroll-bar-size, 0px) - var(--container-column)) / 2));
}
```

A percentage in `left` is of the viewport less a scrollbar that takes room, which `100vw` is not. The scan walks the source files as `frontend/src/test/stickyOffset.test.ts` does; that test matches whole lines, comments included, which this scan must not. Playwright hides scrollbars unless Chromium is launched with `ignoreDefaultArgs: ['--hide-scrollbars']`.

**Out of scope**

- The guest's banner in ink above the top bar, which drawings 1, 4 and 5 show: a later cycle. The connection banner sits in the header and is held to the column here.
- "Log in" with an outline and a shadow, which drawings 1, 4 and 5 show: a later cycle.
- The top bar with no search beneath it, which every drawing shows: a later cycle. The search stays, in the header and so in the column.
- A form greyed with Done alone at its foot, which drawing 1's third screen and drawing 5 show: a later cycle.
- The dimmed screen with "Log in" lit, drawing 4's fourth screen: a later cycle.
- The decks, cards and mastery the drawings show: never built; a page shows what its account holds.
- Any length, weight or outline in a drawing that differs from what the app draws at 390 wide today: never; the drawings place things against the column and the window, and change nothing inside the column.
- A column written by a page, a breakpoint, or a value in px: never; ADR 136 rejects each.
- A panel Radix places by an inline style, a picker's list or a rating's list: it stays as it is.
- The menu kept open down one side, a table of cards, or any other layout made for a wide screen: an unsettled decision.

**Done when**

- In `frontend/src/test/fixedColumn.test.ts`, `reports fixed beside no column utility and passes each of the three` passes.
- `finds no fixed element outside the column in any source file` passes.
- In `frontend/src/components/run/FieldValue.test.tsx`, `a picture's dialog covers the window and closes on a press outside its surface` passes.
- `a sound's dialog is held to the column` passes.
- `grep -c "container-column: 40rem" frontend/src/index.css` prints `1`.
- In headless Chromium at 1440 by 900, with scrollbars shown, measured by `getBoundingClientRect`:
  - on Your library, a deck's page and Edit card, `<header>` and `<main>` are each 640 wide, with equal gaps to the two edges of the layout viewport, which is `document.documentElement.clientWidth` wide;
  - with the connection lost, the connection banner's left and right edges are `<main>`'s;
  - on Edit card, the bar at the foot has `<main>`'s left and right edges;
  - with the menu open, its panel's left edge is `<main>`'s and the dimming's box is the window's;
  - with the New sheet open, its panel has `<main>`'s left and right edges, on a page short enough not to scroll and on one long enough to scroll;
  - with Discard open on a changed card, its panel's edges are 20px inside `<main>`'s and the dimming's box is the window's.
- In headless Chromium at 390 by 844, `<header>`, `<main>`, the bar at the foot, the New sheet's panel and the menu's panel each have a left edge of 0, the first four a right edge of 390, and Discard's panel edges of 20 and 370.
- Screenshots at 1440 by 900 of Your library, a deck's page, Edit card, the open menu, the New sheet and Discard, each set beside its screen of drawings 1, 4 and 5, differ from it only in what Out of scope names.

**Debrief**

- `reports fixed beside no column utility and passes each of the three` passed. Run against HEAD's `FormBar.tsx`, `BottomSheet.tsx`, `ConfirmDialog.tsx`, `SideDrawer.tsx` and `FieldValue.tsx`, the scan reported each of the five panels; on this branch it reports none.
- `finds no fixed element outside the column in any source file` passed.
- `a picture's dialog covers the window and closes on a press outside its surface` passed.
- `a sound's dialog is held to the column` passed.
- `grep -c "container-column: 40rem" frontend/src/index.css` printed `1`.
- At 1440 by 900, scrollbars shown, signed out with the local bypass, by `getBoundingClientRect`:
  - Your library, which does not scroll: layout viewport 1440; `<header>` and `<main>` 400 to 1040, 640 wide, gaps 400 and 400. A deck's page and Edit card, which scroll: layout viewport 1425; both 392.5 to 1032.5, 640 wide, gaps 392.5 and 392.5.
  - Connection lost, on Your library: the banner 400 to 1040, `<main>` 400 to 1040.
  - Edit card: the bar at the foot 392.5 to 1032.5, `<main>` 392.5 to 1032.5.
  - The menu on Your library: panel's left 400, `<main>`'s 400, the dimming 0,0 to 1440,900. On a deck's page, under a 15px scroll lock: panel's left 392.5, `<main>`'s 392.5, the dimming 0,0 to 1440,900.
  - The New sheet on Your library, which does not scroll: panel 400 to 1040, `<main>` 400 to 1040. On a deck's page, which scrolls, under a 15px scroll lock: panel 392.5 to 1032.5, `<main>` 392.5 to 1032.5. The dimming 0,0 to 1440,900 on both.
  - Discard on a changed card, under a 15px scroll lock: panel 412.5 to 1012.5, `<main>` 392.5 to 1032.5, the dimming 0,0 to 1440,900. Nothing was saved.
- At 390 by 844, scrollbars hidden as on a phone: `<header>` and `<main>` 0 to 390 on Your library, a deck's page and Edit card; the bar at the foot 0 to 390; the New sheet's panel 0 to 390, on a page that scrolls and one that does not; the menu's panel left 0, 288 wide; Discard's panel 20 to 370.
- The six screenshots at 1440 by 900, beside drawings 1, 4 and 5, place every element as the drawings do. They differ in: no guest's banner; "Log in" without an outline and a shadow; the search beneath the top bar; Edit card editable, with Cancel and Save, not greyed with Done alone; and the account's own decks, cards and mastery. Out of scope names each of these. The menu's panel runs from the window's top under the header, as Details says, so it shows beneath the header as drawing 4 shows it.
- Departures from guidance:
  - The scan reads literals with TypeScript's parser, `ts.createSourceFile`, where comments are not nodes, rather than stripping comments from the text. It reads a template literal's own text, substitutions left out, as one class list. Like `stickyOffset.test.ts`, it walks `src/test/`'s helpers as well as the components.
  - On a picture's dialog, a click on the margin outside the surface closes it, not a pointerdown. Radix closes on pointerdown outside a panel. This dialog is the whole window, so its margin is inside the panel, and the click arrives after the release, so nothing on the page beneath is pressed.
  - `ConfirmDialog` keeps its side margin as `mx-5`, and a sound's dialog keeps its margin as `mx-4`, each beside `inset-x-column`.
  - `FormBar.test.tsx`'s first test now asserts `inset-x-column`, and its name reads `is fixed to the foot of the column and carries the mark a reveal clears`.
- Read `MediaChip`'s picture branch in `frontend/src/components/run/FieldValue.tsx`: no screen can make a picture today, so its layout was checked in jsdom alone, which does no layout. Also read `fixedOutsideColumn` in `frontend/src/test/fixedColumn.test.ts`: it is what keeps every future element fixed to the viewport on the column.
