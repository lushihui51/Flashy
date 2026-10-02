# 021 — One add control per collection

Fix cycle from the 2026-09-29 /plan session, prompted by a screenshot of an empty deck's Cards tab showing two "Add card" buttons: the tab's toolbar button and the empty state's own. The same pair renders on the deck page's Configurations tab, both Library tabs, and the New practice page's unfiltered empty state, each pinned by a test asserting two buttons. The subject page renders one, but in the empty state with its toolbar row hidden; the practice overview renders one, in the header, since `8c7120f`. The repeat comes from ADR 023 rule 2 ("labeled buttons, repeated in the collection's empty state"), written the day after `8c7120f` removed the same repeat from the practice pages. Branch: `fix/empty-state-add-button`, cut from `main` at `714bca4`; one commit per task, subject ending `(task 021 T<n>)`.

Earlier task files affected by name only, for the next sync's Superseded bullets: task 003 §4.8's shared grammar ("Empty states have one line of copy and the relevant create button"), its Phase 2.5 card-table empty state ("`No cards in this deck yet.` and `New card`"), and its Phase 2.6 subject empty state ("replace the list with one line of copy and a `New deck` button. Do not render the section label above an empty list") with the matching Done-when bullet; task 004 T3's Details ("plus the New configuration button") and its Notes citing ADR 023 rule 2 for the repeat. Recorded by /justify: ADR 066 amends ADR 023 rule 2, and ADR 023's Status names the superseded clause.

## ADRs

Decisions this file implements; full context and rejected alternatives live in the ADRs.

- **ADR 066 — One add control per collection: the toolbar's, never the empty state's**: a collection's add control is the labeled button in its toolbar row, which renders whenever the page body renders, label included; the empty state is its text alone, plus "Clear filters" where filters produced the empty list. Binds the deck page's Cards and Configurations tabs, the Library's Subjects and Decks tabs, the New practice page's configuration list, and the subject page's deck list; the practice overview already complies. Amends ADR 023 rule 2; reverses task 003 Phase 2.6's "Do not render the section label above an empty list".

## Minor decisions

- **MD-1**: The Library page keeps its own `CreateButton`; switching it to the shared `AddButton` is out of scope for this cycle, which removes duplicate controls only. Rejected: unifying the control shape in passing.

## Contracts

### Rendered add controls per surface (ADR 066)

The toolbar control renders whenever the page body renders — loading, loaded, or load-errored. The empty-state column is what renders in place of the list once the collection is loaded and empty. No empty-state copy changes.

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

## Tasks

T1 and T2 are independent: no shared files, safe to build in parallel sessions.

### T1 — Drop the empty-state button on the deck, Library, and New practice pages

- [ ] **Goal:** On the five surfaces that render two add controls when empty, the empty state renders its text alone (ADR 066).
- **Files:** `frontend/src/pages/DeckDetailPage.tsx`, `frontend/src/pages/DeckDetailPage.test.tsx`, `frontend/src/pages/LibraryPage.tsx`, `frontend/src/pages/LibraryPage.test.tsx`, `frontend/src/pages/PracticeCreatePage.tsx`, `frontend/src/pages/PracticeCreatePage.test.tsx`.
- **Details:**
  - `DeckDetailPage.tsx`: in the Cards tab's empty state, remove `<AddButton label="Add card">` and keep the wrapper's `px-3 py-8` (the `px-3` aligns the sentence with the table's pinned first column); in the Configurations tab's empty state, remove `<AddButton label="New configuration">` and keep `py-8`. The `flex flex-col items-start gap-3` classes go with the buttons. The toolbar row above each tab, and the comment above the Cards toolbar, are unchanged.
  - `LibraryPage.tsx`: `EmptyState` loses `createLabel`, `createTo`, and the `CreateButton` it rendered; it keeps `copy` and renders the `py-8` wrapper with the `<p>` alone. Both call sites pass `copy` only. `CreateButton` itself and the two count rows are unchanged (MD-1).
  - `PracticeCreatePage.tsx`: in the empty-state branch, `{filtered ? <Clear filters button> : <AddButton>}` becomes `{filtered && <Clear filters button>}`, with a comment in the shape of `PracticeOverviewPage.tsx`'s "No New practice button here — the header's is always on screen." The toolbar `AddButton` above the list is unchanged.
  - `DeckDetailPage.test.tsx`: `'shows an empty state when the deck has no cards, and still renders the field header'` and `'says what a configuration is when the deck has none'` assert `screen.getByRole('button', { name })` in place of `getAllByRole(...)).toHaveLength(2)`, their comments rewritten to say the toolbar's button is the only one (ADR 066); `'Add card navigates to the card creation form with this deck locked'` and `'each tab carries its own labeled add button, inside the tab'` replace `getAllByRole(...)[0]!` and `.length).toBeGreaterThan(0)` with `getByRole`.
  - `LibraryPage.test.tsx`: `'shows an empty state with a create button when there are no subjects'` and `'… when there are no decks'` assert `getByRole` for the one button, comments rewritten.
  - `PracticeCreatePage.test.tsx`: `'no configurations at all shows the true-empty state with a New configuration button'` asserts `getByRole` for the one "New configuration" button and keeps its "Clear filters" absence assertion.
- **Out of scope:** `SubjectDetailPage.tsx` (T2); `PracticeOverviewPage.tsx`; replacing `CreateButton` with `AddButton` (MD-1); any change to empty-state copy; hiding the Library's "0 subjects" / "0 decks" count row; ADR 023 and the task 003/004 lines named in the intro (/justify and /sync).
- **Done when:** `grep -c 'label="Add card"' frontend/src/pages/DeckDetailPage.tsx` prints `1`; `grep -c 'label="New configuration"' frontend/src/pages/DeckDetailPage.tsx` prints `1`; `grep -c 'label="New configuration"' frontend/src/pages/PracticeCreatePage.tsx` prints `1`; `grep -c "<CreateButton" frontend/src/pages/LibraryPage.tsx` prints `2`; `grep -n "toHaveLength(2)" frontend/src/pages/LibraryPage.test.tsx frontend/src/pages/DeckDetailPage.test.tsx` prints nothing, and `grep -n "'New configuration' })).toHaveLength" frontend/src/pages/PracticeCreatePage.test.tsx` prints nothing; in `/frontend`, `npx vitest run`, `npm run lint`, and `npm run build` are clean. _Browser check_ (ADR 007 bypass, `localhost:5173`): a deck with no cards shows one "Add card" button above the column headers and the sentence below them; its Configurations tab with no configurations shows one "New configuration" button above the two-sentence text.
- Notes:

### T2 — The subject page's Decks row renders regardless of count

- [ ] **Goal:** The subject page always renders its "Decks" row with the "Add deck" button, and an empty subject shows the sentence alone beneath it (ADR 066).
- **Files:** `frontend/src/pages/SubjectDetailPage.tsx`, `frontend/src/pages/SubjectDetailPage.test.tsx`.
- **Details:**
  - The `mt-4` block renders the `flex items-center justify-between` row (`<h2>Decks</h2>` and `<AddButton label="Add deck">`) unconditionally, keeping its comment. Below it, the existing `decks && decks.length === 0` condition chooses between the sentence and the `<ul>`: when loaded and empty, `<p className="py-8 text-(--color-text-muted)">No decks in this subject yet.</p>` (the `py-8` the empty-state wrapper had; no button, ADR 066); otherwise the `<ul>` with its `mt-1 … border-t` classes exactly as today, which renders empty while `decks` is still undefined, as it does today.
  - `SubjectDetailPage.test.tsx`: `'shows an empty state, not an empty section label, when the subject has no decks'` becomes `'renders the Decks row and its Add deck button above the empty state'`: `findByText('No decks in this subject yet.')` present, `getByText('Decks')` present, `getByRole('button', { name: 'Add deck' })` present, `queryByRole('list')` null. Its comment is rewritten: the toolbar's button is the one add control (ADR 066).
- **Out of scope:** hiding the "Decks" label while empty (rejected by ADR 066); restyling the row or the list; every T1 file.
- **Done when:** `grep -c 'label="Add deck"' frontend/src/pages/SubjectDetailPage.tsx` prints `1`; `grep -n "not an empty section label" frontend/src/pages/SubjectDetailPage.test.tsx` prints nothing; the rewritten test and `'the header carries subject-level actions only; adding a deck belongs to the deck list'` pass; in `/frontend`, `npx vitest run`, `npm run lint`, and `npm run build` are clean. _Browser check_: a subject with no decks shows "Decks" and one "Add deck" button on one row, the sentence beneath, and tapping the button opens the deck form with the subject preselected.
- Notes:
