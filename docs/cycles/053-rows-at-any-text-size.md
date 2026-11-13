# 053 — Rows at any text size

Canvas: https://claude.ai/artifact/6c1PcXHayxZvA6DPin7n1w

## Goal

Outcome: At any text size the browser is set to, nothing on any page scrolls sideways: what a row holds wraps onto further lines, a name in a list wraps to at most two lines and is shortened after that, a name or a heading breaks only between words, but for a single word wider than its whole line, and is never shortened on its own page, and an input too narrow to type in moves beneath its label and takes the full width.

Scope: The cycle covers every list's row and every name in a list, every page's heading, the top bar, the row of places, the bars at the foot, the summary's counts and order, the deck form's field rows, and a source scan failing on the classes `truncate`, `text-ellipsis`, `line-clamp-1`, `break-all` and `overflow-x-auto`; on every screen cycles 046 to 052 leave. It leaves out a page's layout at the default text size, which does not change but for a name too long for one line, which wraps to a second there too; and how large anything may grow, which the browser's text size alone sets (PDR 050).

Judgement: The engineer judges on the live server at 390 wide with the page's root font size set to 24px through `document.documentElement.style.fontSize = '24px'`, with the decks "Commands" and "Ports" and the three practices drawing 7-practice draws over them, among them "Judgement practice of every command before the CompTIA exam next month" over "Commands" alone, each deck holding a card, and "Commands" holding at least the five fields and the card "format" drawing 7-deck draws, one of its values left empty; a run of "Commands + Ports" ended through "End run" and another started after it; each deck, field, card, practice and run is made through the app where the dev database lacks it, added to what the dev database holds, and the counts and the circles' fills read as the app's own: All practices, a deck's page and Edit deck read as drawings 7-practice, 7-deck and 7-editdeck draw them, but for what T1's and T2's Out of scope set aside; on Home, Your library, a deck's page, New deck, Edit deck, New card, Edit card, All practices, New practice, a practice's page, Edit practice, a deck's board reached from a practice's page and from a run, the run page of an active run of "Commands + Ports" and a completed run's page, `document.documentElement.scrollWidth` equals `document.documentElement.clientWidth`; that practice's name reads on two lines ending "…" on All practices and whole on its own page; "Commands" in a deck's heading is never split; the top bar's "Log in", signed out, stays on screen; and at the default text size every one of these pages reads as it did at the commit before T1's on the cycle's branch, but for a name too long for one line, which now takes a second line before it is shortened.

## Records

- PDR 050: The browser's text size followed by everything, wrapping and never scrolling sideways
- PDR 049: A drawn mark of its kind beside every name
- ADR 101: Every length in a component measured, derived, or a fixed design size in rem
- ADR 127: A measured header height and one component for every bar at the foot

## Tasks

### T1 — Names and rows that wrap

**Status**

- [ ]

**Goal**

Every name in a list wraps to at most two lines and is shortened with "…" after that, every row's contents and every heading, top bar, row of places, bar at the foot, count and order wrap instead of running past the screen's edge, a heading breaks only between words, and a source scan fails on a name held to one line.

**Dependencies**

None.

**Files**

- `frontend/src/components/ui/ListRow.tsx`
- `frontend/src/components/ui/ListRow.test.tsx`
- `frontend/src/components/library/DeckPicker.tsx`
- `frontend/src/components/ui/PickerCombobox.tsx`
- `frontend/src/components/ui/Breadcrumb.tsx`
- `frontend/src/components/ui/FormBar.tsx`
- `frontend/src/components/shell/TopBar.tsx`
- `frontend/src/components/shell/AuthSlot.tsx`
- `frontend/src/components/library/CardList.tsx`
- `frontend/src/components/library/FieldAssignmentBoard.tsx`
- `frontend/src/components/practice/DeckLine.tsx`
- `frontend/src/components/run/RunRow.tsx`
- `frontend/src/components/run/HomeRunRow.tsx`
- `frontend/src/components/run/RunBreakdown.tsx`
- `frontend/src/components/run/RatingChip.tsx`
- `frontend/src/components/library/CardStandaloneForm.tsx`
- `frontend/src/pages/LibraryPage.tsx`
- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeEditPage.tsx`
- `frontend/src/pages/DeckDetailPage.tsx`
- `frontend/src/pages/HomePage.tsx`
- `frontend/src/pages/PracticeOverviewPage.tsx`
- `frontend/src/pages/PracticeDetailsPage.tsx`
- `frontend/src/pages/RunPage.tsx`
- `frontend/src/pages/DeckBoardPage.tsx`
- `frontend/src/test/nameWrap.test.ts` (new)
- `frontend/src/components/ui/MarkedName.tsx` (new)
- `frontend/src/components/library/DeckRow.tsx`
- `frontend/src/components/library/DeckRow.test.tsx`
- `frontend/src/pages/HomePage.test.tsx`
- `frontend/src/pages/PracticeDetailsPage.test.tsx`
- `frontend/src/pages/PracticeOverviewPage.test.tsx`
- `frontend/src/pages/RunPage.test.tsx`
- `frontend/src/components/practice/DeckLine.test.tsx`
- `frontend/src/components/ui/Breadcrumb.test.tsx`
- `frontend/src/components/run/HomeRunRow.test.tsx`
- `frontend/src/components/library/CardStandaloneForm.test.tsx`
- `frontend/src/components/library/DeckPicker.test.tsx`
- `frontend/src/pages/LibraryPage.test.tsx`

**Details**

PDR 050, drawings 7-practice and 7-deck:

- Guidance: run the scan below before changing anything, to list the files it fails on.
- A name in a list, a deck's, a card's (its lead value in `CardList` on a deck's page and its title on the summary; a value `FieldValue` shows on the run page or a card's sheet is a value, not a name), a practice's, a run's practice's on Home, a picked deck's on New practice, a deck's in a picker's open list, a field's on the board, and a line of decks as `DeckLine` writes it, must wrap onto a second line and be shortened with "…" after two, through `line-clamp-2`, as drawing 7-practice draws "Judgement practice of every command before the CompTIA exam next month". A deck in `DeckLine` no longer holds its whole name in one `whitespace-nowrap` span: it is written through `MarkedName`, so a long deck name breaks between its words; a one-word name reads as drawing 7-practice draws it. Each deck's line in `HomeRunRow`'s details is written through `MarkedName` too, and wraps to at most two lines as a name in a list does.
- Every name, and every run's day as `formatRunDay` writes it, with its mark inline before it, wherever it stands, in a list, as a heading or beneath one, must be written through `MarkedName`, so the mark always starts the line of the name's first word (PDR 049). It must hold the mark, a space and the name's first character in one `whitespace-nowrap` span, then the rest of the name, and render no element around the two, so the clamp or the heading around it holds both. A mark drawn as a row's leading item, as `DeckPicker`'s `renderLeading` draws it, is not inline and stays as it is. A day as "2026-11-03 (2)" then breaks only at its space, since Unicode's line breaking keeps a hyphen with the digit after it, so the completed run's heading in `RunPage` never runs past the screen.
- A fixed height that holds one line of a name or a day must become a minimum height, so a second line shows: `TopBar`'s `h-14.5`, `FieldAssignmentBoard`'s `chipButton` at `h-tab`, and `HomeRunRow`'s day block at `h-6`, which drops its `whitespace-nowrap`.

```tsx
// frontend/src/components/ui/MarkedName.tsx
type MarkedNameProps = {
  /** The kind's mark: `<DeckMark />`, `<PracticeMark />` or `<RunMark />`. */
  mark: ReactNode;
  /** The name, or the run's day, whole. */
  name: string;
};

export default function MarkedName({ mark, name }: MarkedNameProps): ReactNode;
```

- Guidance: the headings of `DeckDetailPage`, `PracticeDetailsPage` and `DeckBoardPage`, and the practice's name beneath `DeckBoardPage`'s heading, split the name this way inline today, through `Array.from` of the name; `MarkedName` takes that split over. A no-break space after the mark instead of the span still breaks in Chromium.
- Guidance: a name split into two text nodes is no longer found by `getByText` of the whole name, as `DeckRow.test.tsx` finds "Algebra"; such a test finds the row or the heading by its accessible name instead, as `DeckDetailPage.test.tsx` finds the heading "Deck Vocab Deck".
- A name on its own page, as a heading, must never be shortened, and must break only between words: the circle and the buttons beside a heading wrap beneath it once its mark and its longest word no longer fit beside them, the heading then taking its line's full width, as drawing 7-deck draws a deck's page at a 24px root, and at the default text size they stay beside it as today, and a heading or a name carries no `break-all` and no `wrap-anywhere`. A single word wider than its whole line may break inside itself, through `overflow-wrap: break-word` (`break-words` or `wrap-break-word`), since nothing else keeps the page from scrolling sideways (PDR 050). A card's values other than its lead value are not names and keep wrapping as they do today; in `CardList`, through a container query on the card, they stand one per line, as drawing 7-deck draws them, where the card is narrower than `16rem`, and two to a line as today where it is wider, so the default text size keeps today's layout.
- `ListRow`'s subtitle wraps to at most two lines and is shortened after that, as its title is.
- What is not a name wraps whole onto further lines, with no clamp: a picker's action row, as `PickerCombobox`'s `clearLabel` and `createLabel` write it, and a picked deck's counts on New practice.
- The summary's marks key, `MarksKey` in `RunBreakdown`, must stay within the card's sheet at any text size. Guidance: its fixed `w-60` beside `left-3` runs past the sheet at a 24px root; a maximum width of the sheet's room less its offsets holds it.
- Every row of the app, the top bar's items, the row of places, a page's heading beside its buttons, the bars at the foot, the summary's counts and its order, and every filter, must wrap what it holds onto further lines when it is wider than the screen, so no page scrolls sideways; nothing shrinks to fit (PDR 050). The top bar must wrap "+" and "Log in" together onto a second line, at the right, as drawings 7-practice and 7-deck draw it at a 24px root.
- Guidance: drawing 7-deck's heading row does this with the heading at `flex: 1 1 0%` and `max-width: 100%` in a row that wraps, and no `min-width`, so the heading's longest word holds the circle and the buttons beneath it; the headings of `DeckDetailPage` and `PracticeDetailsPage` drop their `min-w-0` for it.
- The run page's row of places keeps the practice's mark as `BreadcrumbPlace`'s `icon`, a leading item beside the name as `DeckPicker`'s mark is, aligned to the name's first line; a long practice name there wraps between its words beside it.
- The four counts of an active run's details, `ProgressCounts` in `HomeRunRow`, keep their two columns, each count wrapping within its column.
- The summary's five counts, in `RunBreakdown`, and the five change counts in `HomeRunRow`'s details must wrap onto further lines when they do not fit, each block at least as wide as what it holds and the blocks of a line sharing its width, as they share one line today.
- The rating chip's open list, in `RatingChip`, must stay within the screen at any text size, its four options wrapping onto further lines.
- The picker's open list, on All practices' deck filter and New practice's decks, must stay within the screen at any text size. Guidance: `PickerCombobox`'s `Popover.Content` is fixed at `w-65`, 390px at a 24px root; a `max-w-(--radix-popover-content-available-width)` beside it caps it at the room Radix measures.
- Guidance: `AppShell` measures the header into `--app-header-height`, so nothing beneath it needs a new offset.
- The scan, `frontend/src/test/nameWrap.test.ts`, reads every `.tsx` file under `frontend/src/components` and `frontend/src/pages`, test files left out, and fails on any `truncate`, `text-ellipsis`, `line-clamp-1`, `break-all` or `overflow-x-auto` class, matched as a whole word inside a string or template literal with comments left out, naming the file.
- Tests: `ListRow.test.tsx` asserts the title's two-line clamp; the scan passes.

**Out of scope**

- An input too narrow to type in, on the deck form: T2.
- A layout change at the default text size beyond a long name's second line: never.
- Text shrunk to fit a row: never, PDR 050.
- A gutter or a button held to a px size at a large text size: never, PDR 050.
- A size drawings 7-practice and 7-deck give in px that differs from the app's rem size at a 24px root, as the practice row's title at 22px, the rows' circles at 30px and 34px, the lead value at 36px and the card's side padding at 22px: never; the app's size stands, and the drawings are read for what wraps, what is clamped and what stands where.
- A card's other values breaking anywhere, as drawing 7-deck draws them: never; they keep `break-words` as today.
- A card's circle at the top of its lead row, as drawing 7-deck draws it: never; it stays centred on the row as today.

**Done when**

- `cd frontend && npx vitest run src/test/nameWrap.test.ts src/components/ui/ListRow.test.tsx` passes.
- On the live server at 390 wide with a 24px root, with the decks and practices the cycle's Judgement gives, All practices reads as drawing 7-practice and a deck's page as drawing 7-deck, and on Home, Your library, a deck's page, All practices, a practice's page, a deck's board, the run page and a completed run's page `document.documentElement.scrollWidth` equals `document.documentElement.clientWidth`.
- On the live server at 390 wide with a 24px root, with a card's sheet open from a completed run's summary and its marks key open, the key's right edge lies within the sheet's.

**Debrief**

None.

### T2 — Inputs that move beneath their label

**Status**

- [ ]

**Goal**

An input too narrow to type in moves beneath its label and takes the full width, the deck form's field rows reading as drawing 7-editdeck draws Edit deck at the largest text, and no page of the app scrolls sideways at a 24px root.

**Dependencies**

- T1: every row and name wrapping, and the scan.

**Files**

- `frontend/src/components/library/DeckEditor.tsx`
- `frontend/src/components/library/DeckEditor.test.tsx`

**Details**

Drawing 7-editdeck:

- At the default text size the deck form must read as it does today, each field one row of its name input, its type and its three buttons. Where the list of fields is narrower than `16rem`, through a container query on `FieldsSection`'s `section`, as at a 24px root on a 390-wide screen and not at the default size, each field must read as drawing 7-editdeck draws it, in a card of its own with the page's ground between the cards, the list's own block and its divider lines gone, each card outlined in the line color with no shadow, as `outlined-line` draws it, rounded by `rounded-block`, `0.75rem` apart, padded `0.75rem` by `0.8125rem` and its parts `0.5rem` apart, the rem sizes nearest the drawing at a 24px root: "Primary" on the first field alone, then "Field name" as a visible label above its input at the full width, then "Field type" as a visible label above its type, the type growing to fill its line beside the three buttons, which wrap beneath it when they do not fit, then the field's sentence, "Name is required." or "Duplicate name", at the card's foot. Both labels are label elements standing apart from their controls, each tied to its input or type by `htmlFor` and an id made from the field's `key`, since a label wrapping its control would hide the control with it; they are shown in the narrow layout alone and not displayed at the default text size, through the same container query. A field marked for removal takes the same layout, its struck-through input under "Field name" and its cross where Remove stands. The input keeps its accessible name "Field name", and the type its accessible name "Field type", in both layouts. Guidance: a CSS container query on the `section`, sized in `rem` or `ch`, switches the layout with no script.
- Tests: `DeckEditor.test.tsx` asserts each field's name input keeps the accessible name "Field name" and the type the accessible name "Field type", and that the label elements "Field name" and "Field type" for the narrow layout are in the DOM; jsdom applies no container query, so the two layouts are checked live.

**Out of scope**

- Removing the "Primary" label, which drawing 7-editdeck leaves out: never; it stands as the Details place it.
- Moving the sentence about the first field into the first field's card, as drawing 7-editdeck draws it: never; it stays above the list.
- A size drawing 7-editdeck gives in px that differs from the deck form's rem size at a 24px root: never; the app's size stands.
- "Fields" in ink at a heavier weight, as drawing 7-editdeck draws it: never; it keeps the deck form's look.
- The Move up, Move down and Remove buttons with an ink outline and a shadow, and the type with a chevron on a white ground, as drawing 7-editdeck draws them: never; they keep the deck form's look.
- A layout change at the default text size beyond a long name's second line: never.

**Done when**

- `cd frontend && npx vitest run src/components/library/DeckEditor.test.tsx` passes.
- The cycle's judgement holds.

**Debrief**

None.
