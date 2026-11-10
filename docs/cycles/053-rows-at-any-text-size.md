# 053 — Rows at any text size

Waits for: 046, 048, 049, 050, 051 and 052, every screen they leave, its rows and its names: `ListRow`, `DeckRow`, `CardList`, `PickerCombobox`, `DeckLine`, `RunRow`, `HomeRunRow`, `RunBreakdown`, `FieldAssignmentBoard`, `DeckEditor`, `PracticeOverviewPage`, `PracticeDetailsPage`, `RunPage`, `HomePage` and `DeckDetailPage`, files this cycle shares with them.

Canvas: https://claude.ai/artifact/6c1PcXHayxZvA6DPin7n1w

## Goal

Outcome: At any text size the browser is set to, nothing on any page scrolls sideways: what a row holds wraps onto further lines, a name in a list wraps to at most two lines and is shortened after that, a name or a heading breaks only between words and is never shortened on its own page, and an input too narrow to type in moves beneath its label and takes the full width.

Scope: The cycle covers every list's row and every name in a list, every page's heading, the top bar, the row of places, the bars at the foot, the summary's counts and order, the deck form's field rows and every other input beside a label or a control, and a source scan holding names to two lines; on every screen the earlier cycles of this docket leave. It leaves out a page's layout at the default text size, which does not change; and how small anything may grow, which the browser's text size alone sets (PDR 050).

Judgement: The engineer judges on the live server at 390 wide with the page's root font size set to 24px through `document.documentElement.style.fontSize = '24px'`: All practices, a deck's page and Edit deck read as drawings 7-practice, 7-deck and 7-editdeck draw them; on Home, Your library, a deck's page, New deck, Edit deck, New card, Edit card, All practices, New practice, a practice's page, Edit practice, a deck's board, the run page and a completed run's page, `document.documentElement.scrollWidth` equals `document.documentElement.clientWidth`; a practice named "Judgement practice of every command before the CompTIA exam next month" reads on two lines ending "…" on All practices and whole on its own page; "Commands" in a deck's heading is never split; the top bar's "Log in", signed out, stays on screen; and at the default text size every one of these pages reads as it did before the cycle.

## Records

- PDR 050: The browser's text size followed by everything, wrapping and never scrolling sideways
- PDR 049: A drawn mark of its kind beside every name

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
- `frontend/src/pages/DeckDetailPage.tsx`
- `frontend/src/pages/HomePage.tsx`
- `frontend/src/pages/PracticeOverviewPage.tsx`
- `frontend/src/pages/PracticeDetailsPage.tsx`
- `frontend/src/pages/RunPage.tsx`
- `frontend/src/pages/DeckBoardPage.tsx`
- `frontend/src/test/nameWrap.test.ts` (new)

**Details**

PDR 050, LPD21 and drawings 7-practice and 7-deck:

- A name in a list, a deck's, a card's, a practice's, a run's practice's on Home, a field's on the board, and a line of decks as `DeckLine` writes it, must wrap onto a second line and be shortened with "…" after two, through `line-clamp-2`, as drawing 7-practice draws "Judgement practice of every command before the CompTIA exam next month". A mark stays on the line of the name's first word.
- A name on its own page, as a heading, must never be shortened, and must break only between words: no `break-all`, `break-words` or `overflow-wrap: anywhere` on any heading or name.
- Every row of the app, the top bar's items, the row of places, a page's heading beside its buttons, the bars at the foot, the summary's counts and its order, and every filter, must wrap what it holds onto further lines when it is wider than the screen, so no page scrolls sideways; nothing shrinks to fit (PDR 050).
- The scan, `frontend/src/test/nameWrap.test.ts`, reads every `.tsx` file under `frontend/src/components` and `frontend/src/pages`, test files left out, and fails on any `truncate`, `text-ellipsis`, `break-all`, `break-words` or `overflow-x-auto` class, naming the file.
- Tests: `ListRow.test.tsx` asserts the title's two-line clamp; the scan passes.

**Out of scope**

- An input too narrow to type in, on the deck form and elsewhere: T2.
- A layout change at the default text size: never.
- Text shrunk to fit a row: never, PDR 050.

**Done when**

- `cd frontend && npx vitest run src/test/nameWrap.test.ts src/components/ui/ListRow.test.tsx` passes.
- On the live server at 390 wide with a 24px root, All practices reads as drawing 7-practice and a deck's page as drawing 7-deck, and on each `document.documentElement.scrollWidth` equals `document.documentElement.clientWidth`.

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
- `frontend/src/components/library/CardFieldsForm.tsx`
- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeEditPage.tsx`
- `frontend/src/components/ui/PickerCombobox.tsx`

**Details**

LPD21 and drawing 7-editdeck:

- At the default text size the deck form must read as it does today, each field one row of its name input, its type and its three buttons. Where that row has no room for the name input to show its value, as at a 24px root on a 390-wide screen, the field must read as drawing 7-editdeck draws it: "Field name" as a visible label above its input at the full width, then "Field type" with its type and the three buttons on a line beneath, wrapping. Guidance: a CSS container query on the field's row, sized in `rem` or `ch`, switches the layout with no script.
- Every other input beside a label or a control, the card form's values, New practice's and Edit practice's Name and the pickers' search, must stay at the full width of its row or move beneath its label when the row narrows; no input narrows below its own text.
- Tests: `DeckEditor.test.tsx` asserts each field's name input has the visible label "Field name" in the DOM and its accessible name stays "Field name".

**Out of scope**

- The "Primary" label and the sentence about the first field, which drawing 7-editdeck draws inside the first field's card: never moved or removed here; they stay where the deck form has them.
- A layout change at the default text size: never.

**Done when**

- `cd frontend && npx vitest run src/components/library/DeckEditor.test.tsx` passes.
- The cycle's judgement holds.

**Debrief**

None.
