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

- [x]

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
- `frontend/src/components/ui/BottomSheet.tsx`

**Details**

PDR 050, drawings 7-practice and 7-deck:

- Guidance: run the scan below before changing anything, to list the files it fails on.
- A name in a list, a deck's, a card's (its lead value in `CardList` on a deck's page and its title on the summary; a value `FieldValue` shows on the run page or a card's sheet is a value, not a name), a practice's, a run's practice's on Home, a picked deck's on New practice, a deck's in a picker's open list, a field's on the board, and a line of decks as `DeckLine` writes it, must wrap onto a second line and be shortened with "…" after two, through `line-clamp-2`, as drawing 7-practice draws "Judgement practice of every command before the CompTIA exam next month". Every such name also carries `break-words`, as `CardList`'s lead value does today, so a single word wider than its whole line breaks inside itself within the clamp instead of running past its row. A deck in `DeckLine` no longer holds its whole name in one `whitespace-nowrap` span: it is written through `MarkedName`, so a long deck name breaks between its words; a one-word name reads as drawing 7-practice draws it. Each deck's line in `HomeRunRow`'s details is written through `MarkedName` too, and wraps to at most two lines as a name in a list does.
- Every name, and every run's day as `formatRunDay` writes it, with its mark inline before it, wherever it stands, in a list, as a heading or beneath one, must be written through `MarkedName`, so the mark always starts the line of the name's first word (PDR 049). It must hold the mark, a space and the name's first character in one `whitespace-nowrap` span, then the rest of the name, and render no element around the two, so the clamp or the heading around it holds both. A mark drawn as a row's leading item, as `DeckPicker`'s `renderLeading` draws it, is not inline and stays a leading item, but must align to the name's first line, as must the check `ChosenMark` beside it, where `PickerCombobox`'s `rowClassName` centres both on the row today; the action row, which shares `rowClassName`, aligns its check to its first line the same way. `MarkedName` is a component, not a concept the user reads, and takes no row in `docs/vocabulary.md`. A day as "2026-11-03 (2)" then breaks only at its space, since Unicode's line breaking keeps a hyphen with the digit after it, so the completed run's heading in `RunPage` never runs past the screen.
- A fixed height that holds one line of a name or a day must become a minimum height, so a second line shows: `TopBar`'s `h-14.5`, `FieldAssignmentBoard`'s `chipButton` at `h-tab`, and `HomeRunRow`'s day block at `h-6`, which drops its `whitespace-nowrap`. `RunRow`'s day drops its outer `whitespace-nowrap` span too, and its row beside `RunStatusBadge` wraps. A run's day takes no clamp.

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
- A name on its own page, as a heading, must never be shortened, and must break only between words: the circle and the buttons beside a heading wrap beneath it, each once it no longer fits beside the heading's mark and longest word, as drawing 7-deck draws a deck's page at a 24px root, and at the default text size they stay beside it as today wherever the heading's mark and longest word fit beside them; where they do not, they wrap beneath at the default size too, since today's break inside that word is what PDR 050 rules out, and a heading or a name carries no `break-all` and no `wrap-anywhere`. A single word wider than its whole line may break inside itself, through `overflow-wrap: break-word` (`break-words` or `wrap-break-word`), since nothing else keeps the page from scrolling sideways (PDR 050). A card's values other than its lead value are not names and keep wrapping as they do today; in `CardList`, through a container query on the card, they stand one per line, as drawing 7-deck draws them, where the card is narrower than `16rem`, and two to a line as today where it is wider, so the default text size keeps today's layout.
- `ListRow`'s subtitle wraps to at most two lines and is shortened after that, as its title is.
- Edit card's locked deck, in `CardStandaloneForm`, keeps no mark beside the word "Deck" (PDR 049), and its row wraps the deck's name onto further lines beside it, the name at `min-w-0` with `break-words`, as a name on its own page.
- `PracticeEditPage` changes only where the scan or the live check on Edit practice finds a class or a line that breaks a constraint above.
- What is not a name wraps whole onto further lines, with no clamp: a picker's action row, as `PickerCombobox`'s `clearLabel` and `createLabel` write it, and a picked deck's counts on New practice.
- The summary's marks key, `MarksKey` in `RunBreakdown`, must stay within the card's sheet at any text size. Guidance: its fixed `w-60` beside `left-3` runs past the sheet at a 24px root; it is placed against the card's `relative` block in `CardSheetContent`, which stands within the sheet, so a `max-w-[calc(100%-1.5rem)]` beside `left-3` holds it within the card and so within the sheet.
- Every row of the app, the top bar's items, the row of places, a page's heading beside its buttons, the bars at the foot, the summary's counts and its order, and every filter, must wrap what it holds onto further lines when it is wider than the screen, so no page scrolls sideways; nothing shrinks to fit (PDR 050). The top bar must wrap "+" and "Log in" together onto a second line, at the right, as drawings 7-practice and 7-deck draw it at a 24px root.
- Guidance: drawing 7-deck's heading row does this with the heading at `flex: 1 1 0%` and `max-width: 100%` in a row that wraps, the circle and the buttons separate items beside it, and no `min-width`, so the heading's longest word holds the circle and the buttons beneath it; the headings of `DeckDetailPage` and `PracticeDetailsPage` drop their `min-w-0` for it. A card's title in the sheet opened from a summary, the `h2` in `RunBreakdown`'s `CardSheetContent`, is such a heading: its circle wraps beneath it the same way.
- The run page's row of places keeps the practice's mark as `BreadcrumbPlace`'s `icon`, a leading item beside the name as `DeckPicker`'s mark is, which must align to the name's first line where `Breadcrumb`'s `items-center` centres it today; a long practice name there wraps between its words beside it.
- The four counts of an active run's details, `ProgressCounts` in `HomeRunRow`, keep their two columns, each count wrapping within its column.
- The summary's five counts, in `RunBreakdown`, and the five change counts in `HomeRunRow`'s details must wrap onto further lines when they do not fit, each block at least as wide as what it holds and the blocks of a line sharing its width, as they share one line today.
- The rating chip's open list, in `RatingChip`, must stay within the screen at any text size, its four options wrapping onto further lines.
- The picker's open list, on All practices' deck filter and New practice's decks, must stay within the screen at any text size. Guidance: `PickerCombobox`'s `Popover.Content` is fixed at `w-65`, 390px at a 24px root; a `max-w-(--radix-popover-content-available-width)` beside it caps it at the room Radix measures.
- Guidance: `AppShell` measures the header into `--app-header-height`, so nothing beneath it needs a new offset.
- The scan, `frontend/src/test/nameWrap.test.ts`, reads every `.tsx` file under `frontend/src/components` and `frontend/src/pages`, test files left out, and fails on any `truncate`, `text-ellipsis`, `line-clamp-1`, `break-all` or `overflow-x-auto` class, matched where no letter, digit or hyphen stands on either side, so `sm:truncate` and `!truncate` count and `truncate-x` would not, inside a string or template literal with comments left out, naming the file.
- Tests: `ListRow.test.tsx` asserts the title's two-line clamp; the scan passes.

**Out of scope**

- An input too narrow to type in, on the deck form: T2.
- A layout change at the default text size: never, but for a long name's second line and a heading's circle and buttons wrapping beneath a word too long to stand beside them.
- Text shrunk to fit a row: never, PDR 050.
- A gutter or a button held to a px size at a large text size: never, PDR 050.
- A size drawings 7-practice and 7-deck give in px that differs from the app's rem size at a 24px root, as the practice row's title at 22px, the rows' circles at 30px and 34px, the lead value at 36px and the card's side padding at 22px: never; the app's size stands, and the drawings are read for what wraps, what is clamped and what stands where.
- A card's other values breaking anywhere, as drawing 7-deck draws them: never; they keep `break-words` as today.
- A card's circle at the top of its lead row, as drawing 7-deck draws it: never; it stays centred on the row as today.

**Done when**

- `cd frontend && npx vitest run src/test/nameWrap.test.ts src/components/ui/ListRow.test.tsx` passes.
- On the live server at 390 wide with a 24px root, with the decks and practices the cycle's Judgement gives, All practices reads as drawing 7-practice and a deck's page as drawing 7-deck, and on Home, Your library, a deck's page, New card, Edit card, All practices, New practice, a practice's page, Edit practice, a deck's board, the run page and a completed run's page `document.documentElement.scrollWidth` equals `document.documentElement.clientWidth`.
- On the live server at 390 wide with a 24px root, with a card's sheet open from a completed run's summary and its marks key open, the key's right edge lies within the sheet's.

**Debrief**

- Criterion 1: `cd frontend && npx vitest run src/test/nameWrap.test.ts src/components/ui/ListRow.test.tsx` printed "Test Files 2 passed (2)" and "Tests 14 passed (14)". Run before any change, the scan failed on 14 `truncate` classes, in `FieldAssignmentBoard.tsx`, `DeckLine.tsx`, `HomeRunRow.tsx`, `ListRow.tsx`, `PickerCombobox.tsx`, `PracticeCreatePage.tsx`, `PracticeDetailsPage.tsx`, `PracticeOverviewPage.tsx` and `RunPage.tsx`.
- Criterion 2, the data: the dev database already held "Commands" with its 12 fields and the card "format", its "Key subcommands" empty, "Ports", and the practice "Judgement practice of every command before the CompTIA exam next month". Made through the app's screens and left in the dev database: the practices "Commands + Ports" and "Ports before the exam", a run of "Commands + Ports" with three cards rated then ended through "End run", and a second run of it started after.
- Criterion 2, the widths: in headless Chromium, signed out, driven by a mouse, at 390 by 844 with the root set to 24px after each page loaded, `document.documentElement.scrollWidth` and `clientWidth` both read 390 on Home, Home with an active and a completed run's details open, Your library, the page of "Commands", New card, Edit card of "format", All practices, All practices with its filter's list open, New practice with both decks picked, New practice with its picker's list open, the pages of the long practice and of "Commands + Ports", Edit practice, the board of "Commands" from the practice and from the completed run, the active run's page, that page with its answers shown and a rating chip's list open, and the completed run's page. At the commit before, the same pages read 419 to 481 against 390.
- Criterion 2, the drawings: All practices reads as 7-practice, with "+" and "Log in" on a second line at the right, "Log in" from 253 to 366, "Add practice" beneath the heading, "Commands + Ports" and "Ports before the exam" on two lines each, and the long practice on two 30px lines reading "Judgement practice of every…", its `clientHeight` 60 against a `scrollHeight` of 150. The page of "Commands" reads as 7-deck, with "Commands" whole on one line, the heading 47.25px high at a 47.25px line, its circle and pencil beneath it, "Add card" beneath "54 cards · 12 fields", and each card's other values one to a line. The long practice's heading on its own page shows the whole name with no clamp.
- Criterion 3: with the sheet open from the completed run's first row and its key open at a 24px root, the key's right edge is at 347 and the sheet's at 390, and the sheet's scrolling area reads 390 of 390.
- Default text size, 22 screenshots of the same pages at a 16px root before and after: 12 are byte-identical; Home, Home with details open, Your library, All practices and the two open lists differ only from the first name too long for one line downward, which now takes a second line; the deck's page and the completed run's page differ by at most 2 of 255 in any pixel; the card's sheet and its key differ by at most 11 of 255, with every one of the sheet's 87 elements at the same box with and without `BottomSheet`'s change.
- An over-wide word: with "Commands" and the card "net use" each replaced on the page by one unbroken word of 65 characters, Home with details open, Your library, the deck's page, All practices and its open list, New practice, the page of "Commands + Ports", its board, both run pages and the card's sheet still read 390 of 390, at 16px and at 24px; Edit card reads 390 of 390 with the deck's name alone replaced.
- Home's steps to a first practice cannot show in the dev database, so they were drawn from a `/api/home` answered in the browser: at 24px the next step's button now grows to hold "New practice" on two lines, 95px high where its fixed height let the words run 5px past it, and at 16px it stays 44px.
- Every commit's checks: `npx vitest run` passed 732 tests in 76 files, `npm run lint` and `npm run build` printed no error.
- Outside guidance, the spoken space: `PickerCombobox` and `Breadcrumb` now write the space between a leading mark and the name themselves, and `DeckPicker`'s `renderDeckMark` and `RunPage`'s `icon` pass the mark alone. Holding the mark to the first line needs a box around it, and with the caller's space inside that box the tests no longer found the option "Deck Ports" or the link "Practice Evening practice".
- Outside guidance, the picker's rows: `rowClassName` still centres, and a new inner span, `ROW_CONTENT_CLASS`, top-aligns the check, the mark and the name, each mark in a box one line high, `FIRST_LINE_CLASS`. Top-aligning the row itself would lift a one-line row's words by 0.125rem at the default text size, the row's least height being 0.25rem more than its line and padding.
- Outside guidance, the card's container: `CardList` puts the container on each card's `li`, not on its link, so 16rem is measured against the card's whole width. Against the link's inner width a 320-wide phone at the default text size comes to 253px, under 16rem, and would lose its two columns; this is arithmetic, not a live check.
- Outside guidance, the lead value's clamp: at its line height of 1.1 the clamp cut about a pixel off the foot of "g" and "p" at the default text size, so the lead value carries 0.075em of bottom padding taken back by a margin. The cost: a hidden third line that starts with an accented capital shows the top of its accent beneath the second line.
- Outside guidance, smaller choices: `TopBar` drops its spacer for `ml-auto` on the "+" and account group and takes `py-1.75`, so two lines keep the bar's room above and below; `SheetField`'s row of marks wraps; `FieldAssignmentBoard`'s chip clamps an inner span, since a button takes no clamp, with `py-1` and `text-left`; `HomePage`'s next-step link takes `min-h-field`. `AuthSlot.tsx` and `PracticeEditPage.tsx` are unchanged, as the scan and the live check found nothing in them.
- A path outside Files, `frontend/src/components/ui/BottomSheet.tsx`, added on the engineer's go-ahead: the top bar's second line makes the header 249px tall at a 24px root where it was 171px, and the header is drawn above every sheet, so it covered the card's sheet from 68 down, the key's button at 185 to 227 among it, which stood clear before. The panel is now no taller than `100dvh` less `--app-header-height`, and scrolls past that. At 24px the card's sheet starts at 249, its title at 305 to 353, the key's button at 363 to 405 and "Edit card" at 748 to 808, its scrolling area giving up the height, 365 of 543; the board's "Move to…" sheet starts at 249 where it started at 246; the Create sheet starts at 480. At 16px the three start at 363, 469 and 601 against a header of 114, as before. The side drawer's first item starts at 267 and the "End run?" dialog is drawn above the header, so neither is covered. T2 does not list the file, and the two other cycle files that do, 031 and 046, have every task done.
- Read `MarkedName.tsx`, the interface the other pages now depend on; `rowClassName`, `ROW_CONTENT_CLASS` and `ChosenMark` in `PickerCombobox.tsx`, the one place the markup of a shared component changed shape; and the panel's class in `BottomSheet.tsx`, which all four sheets now take.
- Seen while judging, as the Details require: on Your library at 24px the row of "Commands" reads "Command" over "s", since the mark and the word need 196px and the title's line is 187px, so `break-words` breaks inside it. On the run page at 24px "Show answer" wraps onto two lines inside its button.
- Found outside this task's Files, not fixed: a field name of one over-wide word scrolls New card and Edit card sideways at any text size, 497 against 390 at 16px with one label replaced on the page, since `CardFieldsForm`'s label carries no `break-words`.
- Not in the file: no Done-when line checks a sheet, the drawer or a dialog beneath the two-line header; the measurements above stand in for one, and the line is the planner's to write.
- Not checked: any touch interaction, and the top bar signed in.

### T2 — Inputs that move beneath their label

**Status**

- [x]

**Goal**

An input too narrow to type in moves beneath its label and takes the full width, the deck form's field rows reading as drawing 7-editdeck draws Edit deck at the largest text, and no page of the app scrolls sideways at a 24px root.

**Dependencies**

- T1: every row and name wrapping, and the scan.

**Files**

- `frontend/src/components/library/DeckEditor.tsx`
- `frontend/src/components/library/DeckEditor.test.tsx`

**Details**

Drawing 7-editdeck:

- At the default text size the deck form must read as it does today, each field one row of its name input, its type and its three buttons. Where the list of fields is narrower than `16rem`, through a container query on `FieldsSection`'s `section`, as at a 24px root on a 390-wide screen and not at the default size, each field must read as drawing 7-editdeck draws it, in a card of its own with the page's ground between the cards, the list's own block and its divider lines gone, each card filled with `bg-(--color-surface)` as the list is today and outlined in the line color with no shadow, as `outlined-line` draws it, rounded by `rounded-block`, `0.75rem` apart, padded `0.75rem` by `0.8125rem` and its parts `0.5rem` apart, a label and its control being one part with the label `0.375rem` above it and "Primary" `0.25rem` above "Field name"; these rem sizes stand over the drawing's px gaps: "Primary" on the first field alone, then "Field name" as a visible label above its input at the full width, then "Field type" as a visible label above its type, the type starting at its own width and growing to fill its line beside the three buttons, which wrap beneath it only when they do not fit beside it, then the field's sentence, "Name is required." or "Duplicate name", at the card's foot. Both labels are label elements standing apart from their controls, each tied to its input or type by `htmlFor` and an id made from the field's `key`, since a label wrapping its control would hide the control with it; they are shown in the narrow layout alone and not displayed at the default text size, through the same container query. A field marked for removal takes the same layout, its struck-through input under "Field name" and its cross where Remove stands. The input keeps its accessible name "Field name", and the type its accessible name "Field type", in both layouts. Guidance: a CSS container query on the `section`, sized in `rem` or `ch`, switches the layout with no script.
- Tests: `DeckEditor.test.tsx` asserts each field's name input keeps the accessible name "Field name" and the type the accessible name "Field type", and that the label elements "Field name" and "Field type" for the narrow layout are in the DOM; jsdom applies no container query, so the two layouts are checked live.

**Out of scope**

- Removing the "Primary" label, which drawing 7-editdeck leaves out: never; it stands as the Details place it.
- Moving the sentence about the first field into the first field's card, as drawing 7-editdeck draws it: never; it stays above the list.
- A size drawing 7-editdeck gives in px that differs from the deck form's rem size at a 24px root: never; the app's size stands.
- The three buttons forced onto a line beneath the type, as drawing 7-editdeck draws them at its px sizes: never; at the deck form's sizes they stand beside the type where they fit.
- "Fields" in ink at a heavier weight, as drawing 7-editdeck draws it: never; it keeps the deck form's look.
- The Move up, Move down and Remove buttons with an ink outline and a shadow, and the type with a chevron on a white ground, as drawing 7-editdeck draws them: never; they keep the deck form's look.
- A layout change at the default text size beyond a long name's second line: never.

**Done when**

- `cd frontend && npx vitest run src/components/library/DeckEditor.test.tsx` passes.
- The cycle's judgement holds.

**Debrief**

- Criterion 1: `cd frontend && npx vitest run src/components/library/DeckEditor.test.tsx` printed "Test Files 1 passed (1)" and "Tests 56 passed (56)". The new test, "each field's name and type keep their names, and the narrow layout's labels point at them", renders Edit deck with a field added and one staged for removal and finds three textboxes "Field name" and three comboboxes "Field type", and the label elements "Field name" and "Field type" whose `control` is each of them in order, the staged field's included.
- Criterion 2, the data: the dev database already held every deck, field, card, practice and run the Judgement names, as T1 made or found them: "Commands" with 12 fields and the card "format", "Ports", the three practices, the completed run of "Commands + Ports" and the active run "2026-11-13 (1)" after it. Nothing was made or changed in it by this task.
- Criterion 2, the widths: in headless Chromium, signed out, driven by a mouse, at 390 by 844 with the root set to 24px after each page loaded, `document.documentElement.scrollWidth` and `clientWidth` both read 390 on Home, Home with every run's details open, Your library, the page of "Commands", New deck, Edit deck, Edit deck with a field staged for removal and another left blank, New card, Edit card of "format", All practices, New practice, the pages of "Commands + Ports" and of the long practice, Edit practice, the board of "Commands" from the practice and from the completed run, the active run's page and the completed run's page.
- Criterion 2, Edit deck as drawing 7-editdeck: at a 24px root the fields' `section` is 342px wide against 16rem of 384px, so each field is a card: the list has no border, no shadow, a transparent ground and no side padding, and its cards stand 18px (0.75rem) apart, each white, outlined in the line color, rounded 30px (`rounded-block`), padded 0.75rem by 0.8125rem. In the first card "Primary" ends 6px (0.25rem) above "Field name", the label ends 9px (0.375rem) above the input, the input spans the card's whole inner width, 44.5 to 345.5, and "Field type" stands 12px (0.5rem) below it, with the type from 44.5 to 165.5 filling its line beside the three buttons, 171.5 to 345.5, on the same line. A field staged for removal reads the same, its input struck through and disabled under "Field name" and its cross where Remove stands; a blank field's "Name is required." ends 19px above its card's foot, the card's padding and border. The 1.5px outline draws at 1px, as Chromium draws every `outlined-line` at this pixel ratio. The textboxes "Field name" and the comboboxes "Field type" number 12 each at 24px, so both keep their names in the narrow layout.
- Criterion 2, the rest of the Judgement: on All practices at 24px the long practice's name is two lines and shortened, and "Log in" stands from 253 to 366; on its own page the heading has no clamp and shows the whole name, its overflow visible, its last line's descenders 4px past its box; the heading "Commands" is 47.25px high at a 47.25px line, one line. All practices and a deck's page read as T1's Debrief reports them.
- Default text size: with the frontend of `28b7abe`, the commit before T1's, served from a scratch copy on a second port against the same API, full-page screenshots at a 16px root of New deck, Edit deck of "Commands" and Edit deck of "Ports" are byte-identical before and after, as are the page of "Commands", New card, Edit card, New practice, the practice's page, Edit practice, both boards and both run pages; Home, Your library and All practices differ in height alone, which T1's Debrief gives as names too long for one line taking a second.
- Every commit's checks: `npx vitest run` passed 733 tests in 76 files, `npm run lint` printed no error, and `npm run build` exited 0 with only its chunk-size warning.
- Within the Details, the builder's choices: one `FieldRow` lays out both the active field and the staged one. Its wrappers are `display: contents` at the default size, so the row's flex items are the input, the type and the buttons alone as before, and become the card's stacked parts under `@max-[16rem]`. The input and the type keep their `aria-label` beside the label, so their names stay "Field name" and "Field type" where the label is not displayed. The ids are `field-<key>-name` and `field-<key>-type`. Where the buttons wrap beneath the type, they stand 0.5rem below it, as the card's parts do.
- Formatter: the repository's format-on-save rewrapped two unchanged statements, `FIELD_ICON_BUTTON` in `DeckEditor.tsx` and one `waitFor` in `DeckEditor.test.tsx`; neither changes behaviour.
- Read `FieldRow` in `DeckEditor.tsx`, where the `contents` wrappers carry the layout at both sizes.
- Not checked: any touch interaction, and the top bar signed in.
