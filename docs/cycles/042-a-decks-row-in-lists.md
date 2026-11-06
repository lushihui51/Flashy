# 042 — A deck's row in lists

Waits for: 041, with which it shares `frontend/src/api/types.ts` and `frontend/src/api/openapi.json`.

Canvas: https://claude.ai/artifact/BPQZTsxBi8s4DZhzVVR9Qt

## Goal

Outcome: Every deck's row in a filter's or a picker's list shows the deck's name with its subject's name beneath, in muted grey.

Scope: The cycle covers `subject_name` on every row `GET /api/decks` returns, read in the join that already scopes the query; a `renderBeneath` on the general combobox; one `DeckPicker` that every list of decks goes through, on the Practice page's and New practice's deck filter and on New card's and New configuration's deck picker; and the library's Decks tab taking the subject's name from the row. It leaves out the single-deck reads, which carry no `subject_name`; a deck's row in the library and on a subject's page, which already shows what it shows; and the picker's open list itself, cycle 037's.

Judgement: The engineer judges on the live server at 390 wide: opening the deck filter on the Practice page and on New practice, and the Deck picker on New card and on New configuration, each row reads the deck's name with its subject's name beneath in muted grey, as drawing 39, two decks of one name in different subjects told apart; New configuration's picker shows the subject nowhere else on a row; the library's Decks tab still reads "<subject> · N cards · N fields" under each deck; and `GET /api/decks` runs the same number of statements as before.

## Records

None.

## Tasks

### T1 — The subject's name on every deck row

**Status**

- [x]

**Goal**

Every row `GET /api/decks` returns carries a required `subject_name`, read in the join that scopes the query, and the frontend's lists of decks take the subject's name from the row.

**Dependencies**

None.

**Files**

- `app/models/deck.py`
- `app/database_ops/deck.py`
- `tests/api_tests/test_decks.py`
- `frontend/src/api/openapi.json` (generated)
- `frontend/src/api/types.ts` (generated)
- `frontend/src/pages/LibraryPage.tsx`
- `frontend/src/pages/LibraryPage.test.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.test.tsx`
- `frontend/src/components/library/DeckRow.test.tsx`
- `frontend/src/components/practice/PracticeFilterBar.tsx`

**Details**

- `DeckListing` in `app/models/deck.py` gains `subject_name: str`, so `DeckSummary` carries it on every row (LCD12). `DeckDetail` does not.
- `db_read_decks` in `app/database_ops/deck.py` already joins `Subject`; `db_read_deck_listings` must take the subject's name from that same query, selecting `Deck` and `Subject.name` together, and never with a statement of its own, so `test_list_runs_a_fixed_number_of_statements` keeps its count. Guidance: have `db_read_decks` keep returning `list[Deck]` for its other callers and give `db_read_deck_listings` a private query of its own that selects the pair.
- `test_read_decks_includes_card_count_and_field_names` also asserts `subject_name` on each row, and `test_deck_filter_disambiguates_same_named_decks` in `test_practice_run.py` is the shape to copy for two decks of one name in different subjects.

After the backend, `cd frontend && npm run gen:api`, then:

- `LibraryPage` must hand `DeckRow` the row's own `subject_name` and drop `subjectNameById`; the subjects query stays for the Subjects tab.
- `orderedDeckOptions` in `DeckConfigurationEditor.tsx` must stop joining subjects for the name and take `subject_name` from the row (LCD12); its `DeckOption` type reads it from `DeckSummary`. The subjects query there goes if nothing else reads it.
- `PracticeFilterBar`'s `DeckOption` gains `subject_name`, read from the row; it draws nothing new in this task.
- Tests: `LibraryPage.test.tsx`'s deck fixtures carry `subject_name` and the Decks tab's subtitle test reads it; `DeckConfigurationEditor.test.tsx`'s fixtures carry it.

**Out of scope**

- The subject beneath the name in a list: T2.
- A separate read for pickers: never, LCD12.
- `subject_name` on `DeckDetail`: never; the single-deck reads carry the subject's id.

**Done when**

- `uv run pytest tests/api_tests/test_decks.py tests/api_tests/test_practice_run.py -k "decks or deck_filter or statements"` passes, `test_list_runs_a_fixed_number_of_statements` among them.
- `grep -c "subject_name" app/models/deck.py` prints `1`.
- `cd frontend && npm run gen:api && git status --porcelain src/api` prints nothing after the task's commit.
- `cd frontend && npx vitest run src/pages/LibraryPage.test.tsx src/components/library/DeckConfigurationEditor.test.tsx src/pages/PracticeOverviewPage.test.tsx src/pages/PracticeCreatePage.test.tsx` passes.
- `grep -n "subjectNameById" frontend/src/pages/LibraryPage.tsx frontend/src/components/library/DeckConfigurationEditor.tsx` prints nothing.

**Debrief**

Done-when evidence, in order:

- `uv run pytest tests/api_tests/test_decks.py tests/api_tests/test_practice_run.py -k "decks or deck_filter or statements"`: `23 passed, 104 deselected`, `test_list_runs_a_fixed_number_of_statements` among them, its bound of 4 unchanged. The new `test_read_decks_tells_same_named_decks_apart_by_subject_name` also passes.
- `grep -c "subject_name" app/models/deck.py` printed `1`.
- `npm run gen:api` was run after the last backend edit, and a second run left both generated files byte-identical. The line's own check, `git status --porcelain src/api` after the commit, can only run once this commit exists, and this Debrief is part of the commit.
- `npx vitest run` over the four named test files: `Test Files  4 passed (4)`, `Tests  128 passed (128)`.
- `grep -n "subjectNameById"` over the two files printed nothing.

Whole-repository checks: `npx vitest run` 67 files and 802 tests passed; `npm run lint` clean; `npm run build` clean; `uv run pytest` 401 passed, started with no other connection to the test database.

Departures from guidance:

- `db_read_decks` is gone rather than kept. The guidance kept it for its other callers, and `db_read_deck_listings` was its only caller, so keeping it would have left a function nothing calls. Its query now lives in `db_read_deck_listings`, selecting `Deck` and `Subject.name` together.

Engineer-approved addition to Files: `frontend/src/components/library/DeckRow.test.tsx`, whose fixture is typed `DeckSummary` and failed `npm run build` without `subject_name`. One line added.

Also changed, and within Details:

- `LibraryPage.test.tsx`'s "a deck row shows its counts alone while its subject's name is unknown" described a state that can no longer happen. It now holds the subjects read pending and asserts that each deck row still shows its subject's name.
- `orderedDeckOptions` returns the rows themselves rather than a mapped copy, since `DeckOption` is now a `Pick` of `DeckSummary`.
- `DeckConfigurationEditor` no longer reads subjects, so its test file's subjects fixture and handler went with it.

Nothing shows differently on screen in this task except that the library's Decks tab and New configuration's rows no longer wait on the subjects read for the subject's name. No browser check was run; no Done-when line asks for one.

Read: `db_read_deck_listings` in `app/database_ops/deck.py`, for the removed function.

### T2 — DeckPicker and the subject beneath

**Status**

- [ ] [BLOCKED]

**Goal**

Every list of decks is drawn by one `DeckPicker`, whose rows show the deck's name with its subject's name beneath in muted grey.

**Dependencies**

- T1: `subject_name` on every deck row and on each surface's deck option type.

**Files**

- `frontend/src/components/ui/PickerCombobox.tsx`
- `frontend/src/components/ui/PickerCombobox.test.tsx`
- `frontend/src/components/library/DeckPicker.tsx` (new)
- `frontend/src/components/library/DeckPicker.test.tsx` (new)
- `frontend/src/components/practice/PracticeFilterBar.tsx`
- `frontend/src/components/library/CardStandaloneForm.tsx`
- `frontend/src/components/library/CardStandaloneForm.test.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.test.tsx`
- `frontend/src/pages/PracticeOverviewPage.test.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`
- `docs/vocabulary.md`

**Details**

Drawings 24, 25 and 39 are the rows.

`PickerCombobox` gains one prop (LCD13):

```ts
/** Drawn under the item's name on its row in the list, and nowhere else. */
renderBeneath?: (item: T) => ReactNode;
```

- A row with `renderBeneath` must stack the name over what it returns, the name at `text-base font-semibold` and the line beneath in `text-label` aside colour with 0.0625rem above it, the row keeping its 2.75rem minimum height and its leading mark, as drawing 39; a row without it is unchanged. The locked chip and the input never draw it.

`DeckPicker` in `frontend/src/components/library/DeckPicker.tsx`:

```ts
type DeckPickerItem = { id: string; name: string; subject_name: string };

/** The one picker for a list of decks: `PickerCombobox` with each row's subject beneath its
 * name. Takes every prop of `PickerCombobox` but `renderBeneath` and `renderLeading`. */
export default function DeckPicker<T extends DeckPickerItem>(props: DeckPickerProps<T>): ReactNode;
```

- It must pass `renderBeneath={(deck) => deck.subject_name}` and nothing for `renderLeading`, and forward every other prop, both purposes included.
- `PracticeFilterBar`'s deck filter, `CardStandaloneForm`'s Deck picker and `DeckConfigurationEditor`'s Deck picker must all be `DeckPicker`, and no file but `DeckPicker.tsx` may render `PickerCombobox` with a list of decks (LCD13, LPD24). `DeckConfigurationEditor` drops the `renderLeading` that drew the subject before the name; its locked line in edit mode still reads "<subject> · <deck>".
- Tests: `PickerCombobox.test.tsx` adds that `renderBeneath` draws under each row's name and not on the locked chip; `DeckPicker.test.tsx` checks a row reads the deck's name with its subject beneath for both purposes; `CardStandaloneForm.test.tsx`, `DeckConfigurationEditor.test.tsx`, `PracticeOverviewPage.test.tsx` and `PracticeCreatePage.test.tsx` each have one test that opens the deck list and finds a subject's name on a row.

`docs/vocabulary.md`:

- The row "Choosing a deck" becomes: User reads `"Deck"; each row the deck's name with its subject's name beneath; "New deck…" as the last row`; Code `` `DeckPicker`; `PickerCombobox`; `renderBeneath`; `createLabel`; `deck_id`; `subject_name` ``.
- The row "Narrowing a list" gains, in User reads after `"All decks"`, `, each deck's row with its subject's name beneath`; Code gains `` `DeckPicker` ``.

**Out of scope**

- The subject left out once a subject filter is chosen, or shown only for decks of one name: never, LPD24.
- "Subject · Deck" on one line in a list: never, LPD24.
- A source scan for a direct `PickerCombobox` call with decks: never, LCD13.

**Done when**

- `cd frontend && npx vitest run src/components/ui/PickerCombobox.test.tsx src/components/library/DeckPicker.test.tsx src/components/library/CardStandaloneForm.test.tsx src/components/library/DeckConfigurationEditor.test.tsx src/pages/PracticeOverviewPage.test.tsx src/pages/PracticeCreatePage.test.tsx` passes.
- `grep -ln "PickerCombobox" frontend/src/components/practice/PracticeFilterBar.tsx frontend/src/components/library/CardStandaloneForm.tsx frontend/src/components/library/DeckConfigurationEditor.tsx` prints nothing but a line for `DeckConfigurationEditor.tsx` if it still imports the type for its own option.
- At 390 wide on the live server: the deck filter on the Practice page and on New practice, and the Deck picker on New card and on New configuration, each show rows as drawing 39 with the subject beneath the name, two decks of one name told apart; New configuration's rows show the subject nowhere else; and the library's Decks tab still reads "<subject> · N cards · N fields" under each deck.

**Debrief**

Attempted: the whole of Details: `renderBeneath` on `PickerCombobox`, `DeckPicker`, the three surfaces on it, the tests and the two rows of `docs/vocabulary.md`. Every other Done-when line holds: the named test files pass, and at 390 wide on the live server all four lists show the deck's name with its subject's name beneath, two decks named "Practiced" told apart, with the library's Decks tab unchanged.

Found: the second Done-when line cannot hold. `grep -ln "PickerCombobox"` over the three files prints `frontend/src/components/practice/PracticeFilterBar.tsx`, which the line does not allow. That file renders `PickerCombobox` for its subject filter, a list of subjects with each subject's icon as `renderLeading`, which `DeckPicker` must not take and whose items have no `subject_name`.

Why the file cannot settle it: Details asks only for the deck filter to be `DeckPicker` and forbids `PickerCombobox` only with a list of decks, so the subject filter stays as it is; the Done-when line requires the name gone from the file. Passing the line would take a subject picker in a new file outside Files, which no Details describes. Which of the two is meant is the planner's edit.
