# 053 — Rows at any text size

Waits for: 046, 047, 048, 049, 050, 051 and 052, every screen they leave, its rows, names and inputs, and these files this cycle shares with them: `ListRow`, `PickerCombobox`, `Breadcrumb`, `FormBar`, `TopBar`, `AuthSlot`, `CardList`, `FieldAssignmentBoard`, `DeckLine`, `RunRow`, `HomeRunRow`, `RunBreakdown`, `RatingChip`, `DeckEditor`, `CardFieldsForm`, `CardStandaloneForm`, `LibraryPage`, `DeckDetailPage`, `HomePage`, `PracticeOverviewPage`, `PracticeDetailsPage`, `PracticeCreatePage`, `PracticeEditPage`, `RunPage` and `DeckBoardPage`.

Canvas: https://claude.ai/artifact/6c1PcXHayxZvA6DPin7n1w

## Goal

Outcome: At any text size the browser is set to, nothing on any page scrolls sideways: what a row holds wraps onto further lines, a name in a list wraps to at most two lines and is shortened after that, a name or a heading breaks only between words and is never shortened on its own page, and an input too narrow to type in moves beneath its label and takes the full width.

Scope: The cycle covers every list's row and every name in a list, every page's heading, the top bar, the row of places, the bars at the foot, the summary's counts and order, the deck form's field rows and every other input beside a label or a control, and a source scan holding names to two lines; on every screen cycles 046 to 052 leave. It leaves out a page's layout at the default text size, which does not change but for a name too long for one line, which wraps to a second there too; and how small anything may grow, which the browser's text size alone sets (PDR 050).

Judgement: The engineer judges on the live server at 390 wide with the page's root font size set to 24px through `document.documentElement.style.fontSize = '24px'`: All practices, a deck's page and Edit deck read as drawings 7-practice, 7-deck and 7-editdeck draw them; on Home, Your library, a deck's page, New deck, Edit deck, New card, Edit card, All practices, New practice, a practice's page, Edit practice, a deck's board, the run page and a completed run's page, `document.documentElement.scrollWidth` equals `document.documentElement.clientWidth`; a practice named "Judgement practice of every command before the CompTIA exam next month" reads on two lines ending "…" on All practices and whole on its own page; "Commands" in a deck's heading is never split; the top bar's "Log in", signed out, stays on screen; and at the default text size every one of these pages reads as it did before the cycle, but for a name too long for one line, which now takes a second line before it is shortened.

## Records

- PDR 050: The browser's text size followed by everything, wrapping and never scrolling sideways
- PDR 049: A drawn mark of its kind beside every name

## Tasks

### T1 — Names and rows that wrap

**Status**

- [ ] [BLOCKED]

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
- A name in a list, a deck's, a card's (its lead value in `CardList` on a deck's page and its title on the summary; a value `FieldValue` shows on the run page or a card's sheet is a value, not a name), a practice's, a run's practice's on Home, a picked deck's on New practice, a field's on the board, and a line of decks as `DeckLine` writes it, must wrap onto a second line and be shortened with "…" after two, through `line-clamp-2`, as drawing 7-practice draws "Judgement practice of every command before the CompTIA exam next month". A mark stays on the line of the name's first word.
- A name on its own page, as a heading, must never be shortened, and must break only between words: a heading takes its line's full width, the buttons beside it wrapping beneath it, and a heading or a name carries no `break-all` and no `wrap-anywhere`. A single word wider than its whole line may break inside itself, through `overflow-wrap: break-word` (`break-words` or `wrap-break-word`), since nothing else keeps the page from scrolling sideways (PDR 050). A card's values other than its lead value are not names and keep wrapping as they do today; in `CardList`, through a container query on the card, they stand one per line, as drawing 7-deck draws them, where the card is narrower than `16rem`, and two to a line as today where it is wider, so the default text size keeps today's layout.
- `ListRow`'s subtitle wraps to at most two lines and is shortened after that, as its title is.
- Every row of the app, the top bar's items, the row of places, a page's heading beside its buttons, the bars at the foot, the summary's counts and its order, and every filter, must wrap what it holds onto further lines when it is wider than the screen, so no page scrolls sideways; nothing shrinks to fit (PDR 050).
- The scan, `frontend/src/test/nameWrap.test.ts`, reads every `.tsx` file under `frontend/src/components` and `frontend/src/pages`, test files left out, and fails on any `truncate`, `text-ellipsis`, `line-clamp-1`, `break-all` or `overflow-x-auto` class, matched as a whole word inside a string or template literal with comments left out, naming the file.
- Tests: `ListRow.test.tsx` asserts the title's two-line clamp; the scan passes.

**Out of scope**

- An input too narrow to type in, on the deck form and elsewhere: T2.
- A layout change at the default text size beyond a long name's second line: never.
- Text shrunk to fit a row: never, PDR 050.
- A card's lead value breaking anywhere, as drawing 7-deck draws it: never; it is the card's name, which breaks only between words (PDR 050).

**Done when**

- `cd frontend && npx vitest run src/test/nameWrap.test.ts src/components/ui/ListRow.test.tsx` passes.
- On the live server at 390 wide with a 24px root, All practices reads as drawing 7-practice and a deck's page as drawing 7-deck, and on Home, Your library, a deck's page, All practices, a practice's page, a deck's board, the run page and a completed run's page `document.documentElement.scrollWidth` equals `document.documentElement.clientWidth`.

**Debrief**

- Attempted: the build within Files and Details; files the engineer approved during the build were added to Files: `MarkedName.tsx` (new), `DeckRow.tsx`, `DeckRow.test.tsx`, and the tests in `HomePage`, `PracticeDetailsPage`, `PracticeOverviewPage`, `RunPage`, `DeckLine`, `Breadcrumb`, `HomeRunRow`, `CardStandaloneForm`, `DeckPicker` and `LibraryPage`. With them, at 390 wide with a 24px root, `document.documentElement.scrollWidth` equalled `clientWidth` on all fourteen pages of the judgement, the scan and the full vitest suite passed, and lint and build were clean.
- Found: drawings 7-practice and 7-deck are drawn with 16px side gutters and 52px icon buttons at the largest text, while the app's gutters (`p-4`, `px-4`) and buttons (`h-11`) are in rem and measure 24px and 66px at a 24px root; fixing them in px is barred by `pxLiterals.test.ts` and by PDR 050.
- Found: at those sizes the top bar's menu, logo, "+" and "Log in" take about 420px of a 390px screen, so "+" and "Log in" wrap onto a second line, where the two drawings draw one.
- Found: on a deck's page the mark and "Commands" at `text-page` with the circle need about 368px of a 342px line, so the circle can stand beside the heading only by splitting "Commands", which the judgement forbids; built, the circle and the pencil wrap together beneath the heading, where drawing 7-deck draws the circle beside it.
- Found: holding a mark to its name's first word needs the mark and the name's first letter in one `whitespace-nowrap` span. A no-break space after the mark still breaks in Chromium. A space inside the span holds on screen in Chromium and Firefox but jsdom names it "DeckCommands". So every marked name in a list needs `MarkedName`, and the tests above that find a name by one text node change with it.
- Alternatives 7-practice-A and 7-deck-A on the cycle's canvas draw the pages as built; the engineer agreed to them, and changing a drawing is the planner's, so the file cannot settle it.

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
- `frontend/src/components/library/CardFieldsForm.tsx`
- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeEditPage.tsx`
- `frontend/src/components/ui/PickerCombobox.tsx`

**Details**

Drawing 7-editdeck:

- At the default text size the deck form must read as it does today, each field one row of its name input, its type and its three buttons. Where the field's row is narrower than `16rem`, through a container query on the row, as at a 24px root on a 390-wide screen and not at the default size, each field must read as drawing 7-editdeck draws it, in a card of its own: "Field name" as a visible label above its input at the full width, then "Field type" with its type and the three buttons on a line beneath, wrapping. The input keeps its accessible name "Field name" in both layouts. Guidance: a CSS container query on the field's row, sized in `rem` or `ch`, switches the layout with no script.
- Every other input beside a label or a control, the card form's values, New practice's and Edit practice's Name and the pickers' search, must keep the full width of its row at any text size.
- Tests: `DeckEditor.test.tsx` asserts each field's name input keeps the accessible name "Field name" and that the label element for the narrow layout is in the DOM; jsdom applies no container query, so the two layouts are checked live.

**Out of scope**

- The "Primary" label, which drawing 7-editdeck leaves out, and the sentence about the first field, which it draws inside the first field's card: never moved or removed here; they stay where the deck form has them.
- A layout change at the default text size beyond a long name's second line: never.

**Done when**

- `cd frontend && npx vitest run src/components/library/DeckEditor.test.tsx` passes.
- The cycle's judgement holds.

**Debrief**

None.
