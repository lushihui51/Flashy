# 021 — One add control per collection

## Goal

Outcome: Every collection shows one add control, its toolbar's, and an empty collection shows its sentence alone.

Scope: The empty states of the deck page's Cards and Configurations tabs, the Library's Subjects and Decks tabs and the New practice page's configuration list, and the subject page's Decks row. Not covered: `PracticeOverviewPage.tsx`, replacing the Library's `CreateButton` with `AddButton`, and any change to empty-state copy.

Judgement: None.

## Records

None.

## Tasks

### T1 — Drop the empty-state button on the deck, Library, and New practice pages

**Status**

- [x]

**Goal**

On the five surfaces that render two add controls when empty, the empty state renders its text alone.

**Dependencies**

None.

**Files**

- `frontend/src/pages/DeckDetailPage.tsx`
- `frontend/src/pages/DeckDetailPage.test.tsx`
- `frontend/src/pages/LibraryPage.tsx`
- `frontend/src/pages/LibraryPage.test.tsx`
- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`

**Details**

The add controls each surface must render: the toolbar control renders whenever the page body renders, loading, loaded, or load-errored. The empty-state column is what renders in place of the list once the collection is loaded and empty. No empty-state copy changes.

| Surface | Toolbar control (always) | Empty state |
| --- | --- | --- |
| `DeckDetailPage.tsx`, Cards tab | `AddButton` "Add card" | the `<p>` "No cards in this deck yet.", below the column-header row |
| `DeckDetailPage.tsx`, Configurations tab | `AddButton` "New configuration" | the two-sentence `<p>` "No configurations yet. …" |
| `LibraryPage.tsx`, Subjects tab | count row with `CreateButton` "New subject" | the `<p>` "No subjects yet." |
| `LibraryPage.tsx`, Decks tab | count row with `CreateButton` "New deck" | the `<p>` "No decks yet." |
| `PracticeCreatePage.tsx` | `AddButton` "New configuration" | unfiltered: the `<p>` "No deck configurations yet."; filtered: "No configurations match these filters." plus "Clear filters", unchanged |
| `SubjectDetailPage.tsx` | "Decks" row with `AddButton` "Add deck" | the `<p>` "No decks in this subject yet." |
| `PracticeOverviewPage.tsx` | header "New practice" | unchanged |

Every test that counted two buttons asserts exactly one through `screen.getByRole('button', { name })`, which throws on a second match.

The Library page must keep its own `CreateButton`; switching it to the shared `AddButton` is out of scope for this cycle, which removes duplicate controls only.

- `DeckDetailPage.tsx`: in the Cards tab's empty state, remove `<AddButton label="Add card">` and keep the wrapper's `px-3 py-8`; in the Configurations tab's empty state, remove `<AddButton label="New configuration">` and keep `py-8`. The `flex flex-col items-start gap-3` classes go with the buttons. The toolbar row above each tab, and the comment above the Cards toolbar, are unchanged.
- `LibraryPage.tsx`: `EmptyState` loses `createLabel`, `createTo`, and the `CreateButton` it rendered; it keeps `copy` and renders the `py-8` wrapper with the `<p>` alone. Both call sites pass `copy` only. `CreateButton` itself and the two count rows are unchanged.
- `PracticeCreatePage.tsx`: in the empty-state branch, `{filtered ? <Clear filters button> : <AddButton>}` becomes `{filtered && <Clear filters button>}`, with a comment in the shape of `PracticeOverviewPage.tsx`'s "No New practice button here — the header's is always on screen." The toolbar `AddButton` above the list is unchanged.
- `DeckDetailPage.test.tsx`: `'shows an empty state when the deck has no cards, and still renders the field header'` and `'says what a configuration is when the deck has none'` assert `screen.getByRole('button', { name })` in place of `getAllByRole(...)).toHaveLength(2)`, their comments rewritten to say the toolbar's button is the only one; `'Add card navigates to the card creation form with this deck locked'` and `'each tab carries its own labeled add button, inside the tab'` replace `getAllByRole(...)[0]!` and `.length).toBeGreaterThan(0)` with `getByRole`.
- `LibraryPage.test.tsx`: `'shows an empty state with a create button when there are no subjects'` and `'… when there are no decks'` assert `getByRole` for the one button, comments rewritten.
- `PracticeCreatePage.test.tsx`: `'no configurations at all shows the true-empty state with a New configuration button'` asserts `getByRole` for the one "New configuration" button and keeps its "Clear filters" absence assertion.

**Out of scope**

- `SubjectDetailPage.tsx`: T2.
- `PracticeOverviewPage.tsx`.
- Replacing `CreateButton` with `AddButton`.
- Any change to empty-state copy.
- Hiding the Library's "0 subjects" / "0 decks" count row.

**Done when**

- `grep -c 'label="Add card"' frontend/src/pages/DeckDetailPage.tsx` prints `1`.
- `grep -c 'label="New configuration"' frontend/src/pages/DeckDetailPage.tsx` prints `1`.
- `grep -c 'label="New configuration"' frontend/src/pages/PracticeCreatePage.tsx` prints `1`.
- `grep -c "<CreateButton" frontend/src/pages/LibraryPage.tsx` prints `2`.
- `grep -n "toHaveLength(2)" frontend/src/pages/LibraryPage.test.tsx frontend/src/pages/DeckDetailPage.test.tsx` prints nothing.
- `grep -n "'New configuration' })).toHaveLength" frontend/src/pages/PracticeCreatePage.test.tsx` prints nothing.
- Browser check (ADR 007 bypass, `localhost:5173`): a deck with no cards shows one "Add card" button above the column headers and the sentence below them; its Configurations tab with no configurations shows one "New configuration" button above the two-sentence text.

**Debrief**

No departures from Details. The comment in `PracticeCreatePage.tsx` reads "No New configuration button here — the toolbar's is always on screen."; test names are unchanged, only their assertions and comments.

### T2 — The subject page's Decks row renders regardless of count

**Status**

- [x]

**Goal**

The subject page always renders its "Decks" row with the "Add deck" button, and an empty subject shows the sentence alone beneath it.

**Dependencies**

None.

**Files**

- `frontend/src/pages/SubjectDetailPage.tsx`
- `frontend/src/pages/SubjectDetailPage.test.tsx`

**Details**

- The `mt-4` block renders the `flex items-center justify-between` row (`<h2>Decks</h2>` and `<AddButton label="Add deck">`) unconditionally, keeping its comment. Below it, the existing `decks && decks.length === 0` condition chooses between the sentence and the `<ul>`: when loaded and empty, `<p className="py-8 text-(--color-text-muted)">No decks in this subject yet.</p>` (the `py-8` the empty-state wrapper had; no button); otherwise the `<ul>` with its `mt-1 … border-t` classes exactly as today, which renders empty while `decks` is still undefined, as it does today.
- `SubjectDetailPage.test.tsx`: `'shows an empty state, not an empty section label, when the subject has no decks'` becomes `'renders the Decks row and its Add deck button above the empty state'`: `findByText('No decks in this subject yet.')` present, `getByText('Decks')` present, `getByRole('button', { name: 'Add deck' })` present, `queryByRole('list')` null. Its comment is rewritten: the toolbar's button is the one add control.

**Out of scope**

- Hiding the "Decks" label while empty.
- Restyling the row or the list.
- Every T1 file.

**Done when**

- `grep -c 'label="Add deck"' frontend/src/pages/SubjectDetailPage.tsx` prints `1`.
- `grep -n "not an empty section label" frontend/src/pages/SubjectDetailPage.test.tsx` prints nothing.
- The rewritten test and `'the header carries subject-level actions only; adding a deck belongs to the deck list'` pass.
- Browser check: a subject with no decks shows "Decks" and one "Add deck" button on one row, the sentence beneath, and tapping the button opens the deck form with the subject preselected.

**Debrief**

No departures from Details. The browser check stubbed the subject's deck list to `[]` in Playwright rather than adding an empty subject to the dev database; no subject there has zero decks.
