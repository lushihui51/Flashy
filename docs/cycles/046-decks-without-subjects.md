# 046 — Decks without subjects

Canvas: https://claude.ai/artifact/3QXsjktRv6LvMkVKvwJfxw

## Goal

Outcome: The user makes and keeps decks with nothing above them: Your library lists every deck in one list, a deck is made with its name and its fields alone, and no subject appears on any screen, in any address or in any API path.

Scope: The cycle covers the subject's removal from every screen, the deck form included, from every address and API path, from the schema and from the vocabulary; the migration that gives every deck its user and renames a deck whose name another deck of its user has; Your library as one list of decks; a deck's page with "Your library" alone above its heading; every deck filter and picker row naming the deck alone; the top bar's New sheet with three rows of words alone; Home's three steps to a first practice; `copy_deck` copying into the caller's own decks with no configuration; and the README's account of what a deck sits in. It leaves out the deck and field marks drawings 9 and 11 show, cycle 048's; a name wrapping to two lines in a list, cycle 053's; configurations, practices and runs, which stay as they are until cycle 049; and the runs and the All practices bar drawn behind the sheet in drawing 12, cycle 052's.

Judgement: The engineer judges on the live server at 390 wide, against the dev database migrated by T2: Your library shows "N decks", "Add deck" and one list of decks, each row its name over "N cards · N fields" and its circle, with no tabs; the six decks that shared a name read "Empty", "Practiced" and "Untouched", each followed by " (Cycle 032 T3 judgement 2026-11-05 11:47)" or " (Cycle 032 T3 judgement 2026-11-05 11:49)", its former subject's name; New deck asks for Deck name and the fields alone, and a name another deck already has is refused beside Deck name with "A deck with this name already exists."; the New sheet holds New deck, New card and New practice, words alone; a user with no deck sees Home's "Your first practice", "0 of 3" and the steps New deck, New card and New practice; a deck's page has "Your library" alone above its heading, and Delete deck on Edit deck lands on Your library; the Practice page and New practice narrow by deck alone, their rows naming a deck alone; `/subjects/new` shows "Page not found."; and `curl -s -o /dev/null -w '%{http_code}' localhost:8000/api/subjects` prints `404`.

## Records

- PDR 033: Decks with nothing above them
- PDR 034: A form about one thing and nothing it holds, landing on the thing it made
- PDR 045: A deck's and a practice's mastery as the average over their cards
- PDR 046: Mastery shown as a circle filled as far as the user is ready
- PDR 048: Home as the runs the user can continue or start again
- ADR 034: Backend layering — routers, services, database_ops
- ADR 054: A metadata naming convention for every constraint and index
- ADR 108: A deck copy mechanism ahead of share links, copying into the caller's own decks
- ADR 116: Readiness as the only mastery figure leaving the mastery module, folded over a practice's cards
- ADR 118: One deletion closure for every deletion of a deck, field or card, a practice deleted by its cascades
- ADR 120: Decks owned by their user with nothing above them, a clashing name taking its former subject's
- ADR 121: lucide-react as the icon set, imported by name
- ADR 123: One server-composed read for Home, its steps ended by a first practice stamped at creation

## Tasks

### T1 — Every screen but the deck form without subjects

**Status**

- [x]

**Goal**

No screen but the deck form shows, names or links to a subject: Your library lists every deck in one list, a deck's page has "Your library" alone above its heading, every deck filter and picker row names the deck alone, the New sheet and Home's steps read as drawings 12 and 11, and no `/subjects/…` address leads to a page.

**Dependencies**

None.

**Files**

- `frontend/src/App.tsx`
- `frontend/src/pages/LibraryPage.tsx`
- `frontend/src/pages/LibraryPage.test.tsx`
- `frontend/src/pages/SubjectDetailPage.tsx` (deleted)
- `frontend/src/pages/SubjectDetailPage.test.tsx` (deleted)
- `frontend/src/pages/DeckDetailPage.tsx`
- `frontend/src/pages/DeckDetailPage.test.tsx`
- `frontend/src/pages/HomePage.tsx`
- `frontend/src/pages/HomePage.test.tsx`
- `frontend/src/pages/PracticeOverviewPage.tsx`
- `frontend/src/pages/PracticeOverviewPage.test.tsx`
- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`
- `frontend/src/pages/PracticeDetailsPage.test.tsx`
- `frontend/src/pages/practicePrefilterChain.test.tsx`
- `frontend/src/components/shell/CreateSheet.tsx`
- `frontend/src/components/shell/CreateSheet.test.tsx`
- `frontend/src/components/library/DeckRow.tsx`
- `frontend/src/components/library/DeckRow.test.tsx`
- `frontend/src/components/library/DeckPicker.tsx`
- `frontend/src/components/library/DeckPicker.test.tsx`
- `frontend/src/components/library/SubjectForm.tsx`
- `frontend/src/components/library/SubjectForm.test.tsx`
- `frontend/src/components/library/DeckEditor.tsx`
- `frontend/src/components/library/DeckEditor.test.tsx`
- `frontend/src/components/library/CardStandaloneForm.tsx`
- `frontend/src/components/library/CardStandaloneForm.test.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.test.tsx`
- `frontend/src/components/practice/PracticeFilterBar.tsx`
- `frontend/src/components/practice/ConfigurationPickList.tsx`
- `frontend/src/components/practice/SelectedConfigurationList.tsx`
- `frontend/src/components/practice/SessionDeckChips.tsx`
- `frontend/src/lib/practiceConfigurationGroups.ts`
- `docs/vocabulary.md`

**Details**

PDR 033 and PDR 048, the backend unchanged:

- Your library must be one list of decks with no tabs, as drawing 9 draws it: the heading, then "N decks" ("Decks" while the list loads) with "Add deck", then one `DeckRow` per deck, then the failure sentence "Could not load decks." or the empty sentence "No decks yet." where they stand today. The page must read no `tab` parameter, so `/library?tab=subjects` shows the same list. `LibraryPage`'s tab reveal, `TABS`, `TAB_ITEMS` and the subjects query go.
- `App.tsx` must hold no `/subjects/…` route, so every `/subjects/…` address reaches the catch-all `NotFoundPage`. `SubjectDetailPage` and its test are deleted.
- In `SubjectForm.tsx` the routed default export and its tests go; `SubjectFormBody` stays, used by the deck form's New subject overlay until T2.
- `DeckDetailPage`'s `Breadcrumb` must hold one place, "Your library" to `/library`, and the page reads no subject. Its Practice button must open `/practice?deck=<deck id>`.
- `DeckEditor`'s Delete deck must land on `/library`.
- `DeckRow` must take no `subjectName`: its second line is "N cards · N fields" alone.
- `DeckPicker` must draw a row as the deck's name alone; its item type becomes `{ id: string; name: string }`. `CardStandaloneForm` must drop the `subject_name: ''` it builds for the chosen deck.
- `PracticeFilterBar` must hold the deck filter alone, "All decks", its rows each a deck's name alone, with props `decks: { id: string; name: string }[]`, `deckId` and `onChange: (next: { deckId: string | null }) => void`. `PracticeOverviewPage` and `PracticeCreatePage` must neither read nor write a `subject` parameter, call `readPracticeRuns` and `readDeckPracticeConfigs` with `deckId` alone, and keep "Clear filters" clearing the deck.
- New practice's configuration groups, its Selected rows and `SessionDeckChips`' `full` variant must name a deck without its subject, and `practiceConfigurationGroups` must drop `subjectName`.
- `DeckConfigurationEditor` must name a chosen deck by its name alone and list its deck options in the order `GET /api/decks` returns them, the context deck still chosen on arrival as today; it reads no `subject` parameter. `PracticeCreatePage` and `DeckDetailPage` key their configuration reads as `['deck_practice_configs', deckId]`, with `null` for no deck.
- Home's steps must be three, as drawing 11 draws them: "Your first practice", "N of 3", then New deck (done when `has_deck`), New card (done when `has_card`) and New practice. `has_subject` and `has_configuration` are read nowhere. Home's recently practiced deck row must read "N cards · N fields" beneath its name, and its Practice must open `/practice?deck=<deck id>`.
- The New sheet must hold three rows, New deck, New card and New practice, each its words alone with no icon, as drawing 12 draws them; "Create a deck first" stays under New card while the user has no deck. `CreateSheet`'s interface comment must stop naming subjects.
- Every comment in the pages, `components/practice/`, `components/shell/`, `DeckRow`, `DeckPicker` and `practiceConfigurationGroups` that names a subject must be brought to what the code now does or go, by `/home/jadenlu/Projects/Process/rules/comment-rules.md`.
- Tests: `LibraryPage.test.tsx` asserts one list of decks with no tablist, the same at `?tab=subjects`; `CreateSheet.test.tsx` asserts the three rows in order and no `svg` in any row; `HomePage.test.tsx` asserts "0 of 3" and the three step labels; `DeckDetailPage.test.tsx` asserts the breadcrumb's one place and the Practice address; `DeckPicker.test.tsx` and `DeckRow.test.tsx` assert no subject name in a row. Every other test in Files that names a subject on a screen this task changes is brought to the new screen.
- `docs/vocabulary.md` must take these rows' changes, each column as given, every other column as it stands:
  - "The shortcut's rows": User reads "New deck"; "New card"; "New practice".
  - "Finishing a form that changes a thing": Where Edit deck; Edit card; Edit practice; a deck's board, opened from a practice's page while no run is active; the save confirm.
  - "Changing a thing, spoken": User reads "Edit deck" on a deck's pencil; "Edit <name>" on a practice's pencil, as "Edit Commands + Ports"; Where Deck page; a practice's page, on the pencil beside its main action.
  - "Narrowing a list": User reads "All decks", each row a deck's name alone; "Clear filters"; Where All practices.
  - "A list with nothing in it": Where Library; deck page; All practices; New practice; a practice's page, under "Runs".
  - "Deleting a thing that takes nothing else with it": Where Edit card; Edit deck.
  - "The row above a page's heading naming the places it belongs to, widest first": User reads "Back", spoken, on the "<" that goes back; "Breadcrumb", spoken; "Your library" on a deck's page; "All practices" on a practice's page; "All practices › <Practice>" on the run page and a completed run's page; Where Deck page; a practice's page; run page; a completed run's page.
  - "The steps to a first practice": User reads "Your first practice"; "N of 3"; "New deck", "New card", "New practice" as the steps.
  - "Practicing a deck": Code `/practice?deck=`.
  - "The library's tabs", "The Subjects tab's toolbar label", "Adding a subject to the list in view", "The page where a subject is changed", "A subject counted", "The subject page's toolbar label", "Practicing a subject's decks", "Deleting a subject" and "Confirming a subject's deletion": User reads "—"; Where "—".
  - "The Decks tab's toolbar label": Concept "The library's toolbar label".
  - "A deck": Where Library; deck page; forms; New practice; a practice's page; a deck's board; Home.
  - "Adding a deck to the list in view": Where Library.
  - "Choosing a deck": User reads "Deck"; each row a deck's name alone; "New deck…" as the last row; Where New card; Edit card.
  - "A deck counted": Where Library rows.
  - "A deck's row": User reads its name, then "N cards · N fields" beneath, as "48 cards · 12 fields"; Where Library; New practice's picked decks.
  - "How ready the user is to recall a card or field, from not ready to ready": Where Library; deck page; All practices; a practice's page; summary.
  - "A thing that will not load": Where Edit deck; deck page; Edit card; Edit practice; a deck's board; a practice's page; run page; a completed run's page; Home; the whole content of a page that failed while it was being drawn.
  - "A list that will not load": Where Library; All practices; New practice.
  - "Finishing a form that makes a new thing": Where New deck; New card; New practice.
  - "A thing's name": Where New practice; Edit practice.
  - "Why leaving discards": Where New deck; Edit deck; New card; Edit card.
  - "A name left blank": Where New deck, under Deck name and under a field's name; Edit deck, under Deck name and under a field's name.
  - "A subject": Where New deck; Edit deck; the deck form's overlay.
  - "The page where a subject is made", "A subject's description", "A subject's picture", "A subject name already taken" and "Leaving the subject form with unsaved changes": Where the deck form's overlay.
  - "A thing's address, widest place first", which names a subject on screens this task changes: User reads "Deck · Configuration"; Where New practice's groups and Selected rows; a practice's row; a practice's page.
  - "Deleting a subject or deck that takes other things with it, each count present only above zero": Where Edit deck.
- A row whose User reads and Where both read "—" must keep in its Code cell only the names the code still gives its concept, and must leave the file once none is left; "The library's tabs" leaves in this task, the deck page's `TABS` being another concept's. Every Code cell must drop a name this task deletes from the code.

**Out of scope**

- The subject picker, its New subject overlay and `subject_id` in the deck form: T2.
- Anything in `frontend/src/api/` or the backend: T2.
- The deck mark beside each deck's name in drawing 9: cycle 048.
- A row's name wrapping to two lines and shortened after that, in drawing 9: cycle 053.
- New practice's, the Practice page's and the deck page's configurations: cycle 049. The deck page's Practice button changes its address here and leaves the page in cycle 049.
- The runs and the All practices bar drawn behind the sheet in drawing 12: cycle 052.

**Done when**

- `cd frontend && npx vitest run src/pages/LibraryPage.test.tsx src/components/shell/CreateSheet.test.tsx src/pages/HomePage.test.tsx src/pages/DeckDetailPage.test.tsx src/components/library/DeckPicker.test.tsx src/components/library/DeckRow.test.tsx` passes.
- `grep -rln --exclude='*.test.*' "subject" frontend/src/pages frontend/src/components/practice frontend/src/components/shell frontend/src/lib/practiceConfigurationGroups.ts frontend/src/components/library/DeckRow.tsx frontend/src/components/library/DeckPicker.tsx` prints nothing.
- On the live server at 390 wide: `/library` and `/library?tab=subjects` show one list of decks with no tabs; `/subjects/new` shows "Page not found."; a deck's page shows "Your library" alone above its heading, and its Practice lands on the Practice page with that deck in the filter; the New sheet shows New deck, New card and New practice with no icon; signed in through a `DEV_AUTH_USER_ID` no `app_user` row holds yet, Home shows "Your first practice", "0 of 3" and the three steps.

**Debrief**

Evidence, in the order of Done when:

- `npx vitest run` over the six named files: `Test Files 6 passed (6)`, `Tests 68 passed (68)`. The whole frontend: `Test Files 72 passed (72)`, `Tests 794 passed (794)`; `npm run lint` and `npm run build` are clean.
- The `grep -rln` printed nothing and exited 1.
- Headless Chromium through playwright-core at 390 by 844, signed out of Clerk, against localhost:5173 with `ENV=development` and `DEV_AUTH_USER_ID` set:
  - `/library` and `/library?tab=subjects` each showed 0 tablists and 0 tabs, "18 decks", one "Add deck", 18 deck rows, and 0 links to `/subjects/…`. The first rows read "X | 0 cards · 2 fields", "Commands | 54 cards · 12 fields", "Ports | 21 cards · 4 fields" and "Blank 731006 | 4 cards · 3 fields".
  - `/subjects/new` showed "Page not found.".
  - The deck page of "X" had a breadcrumb of one link, "Your library -> /library". Its Practice landed on `/practice?deck=064674c2-ffc3-4d41-8fbc-9284d5c04c0f` with "X" in the deck filter and no subject filter.
  - The New sheet's rows were "New deck", "New card" and "New practice", each holding 0 `svg`.
  - For Home, a second backend ran on port 8001 with `DEV_AUTH_USER_ID=user_cycle046_t1_home_check`, an id no `app_user` row held (`select count(*)` printed `0`), and the page's `/api/…` calls were routed to it. Home showed "0 of 3" and the steps "1 New deck", "2 New card" and "3 New practice" under "Your first practice". That backend has since stopped, and the `app_user` row it made stays in the dev database.

Departures and choices beyond Details:

- `LibraryPage` keeps its `EmptyState` helper, so the `EmptyState` name in "A list with nothing in it" still names code.
- `DeckConfigurationEditor`'s `DeckOption` already carries no subject field, since nothing in the editor reads one any more. T2's constraint on that type now holds as it stands.
- The New sheet's rows take drawing 12's size and type: a 52px minimum height (`min-h-action`), an 18px inset, and `text-base font-semibold` in place of `font-medium`.
- `PracticeFilterBar` lost its two-column wrapper and holds the one `DeckPicker` directly.
- `SubjectForm.test.tsx` keeps only the overlay's blank-name case, the one test that renders `SubjectFormBody`. Every other case rendered the routed page and is gone with it.
- `DeckEditor.test.tsx`'s tests of the return addresses use `/library` in place of `/subjects/s1`, an address that now leads nowhere.
- `HomePage` reads its step flags through `StepFlag`, `Extract<keyof HomeSteps, 'has_deck' | 'has_card'>`. A step that read `has_subject` or `has_configuration` would fail the type check, and `HomePage.test.tsx` sets those two flags opposite to the steps' state.
- In `docs/vocabulary.md`, "Practicing a subject's decks" left the file as well as "The library's tabs", because its one Code name, `/practice?subject=`, is gone from the code. "The page where a subject is made" and "The page where a subject is changed" dropped `/subjects/new` and `/subjects/:subjectId/edit`. Code names the code still holds stay, such as `subject_name` in "A thing's address" and `renderBeneath` in "Choosing a deck".

What to read:

- The `docs/vocabulary.md` diff. Several Where cells, as Details gave them, name screens a later cycle builds ("Edit practice", "a deck's board", "New practice's picked decks"), and they drop screens that stand today, such as Edit configuration and New practice's configuration pencils.
- Two comments outside Files are now false, and T2 lists both files: `ListRow`'s interface comment names `/subjects/:subjectId`'s lists, and `PickerCombobox`'s `PurposeProps` gives "All subjects" as its example.

### T2 — Decks owned by their user

**Status**

- [ ]

**Goal**

Every deck belongs to its user with nothing above it: the schema, the API, the deck form and the vocabulary hold no subject, a deck's name is unique among its user's decks, and every deck that shared a name with another of its user's decks carries its former subject's name in parentheses.

**Dependencies**

- T1: the deck page, Your library, the filters, the pickers, Home's steps and the New sheet with no subject, and `SubjectFormBody` as the one subject screen left.

**Files**

- `alembic/versions/<revision>_decks_owned_by_their_user.py` (new)
- `app/main.py`
- `app/models/__init__.py`
- `app/models/subject.py` (deleted)
- `app/models/deck.py`
- `app/models/deck_payloads.py`
- `app/models/deck_practice_config.py`
- `app/models/deletion_payloads.py`
- `app/models/home_payloads.py`
- `app/models/practice_run_payloads.py`
- `app/models/card.py`
- `app/database_ops/subject.py` (deleted)
- `app/database_ops/deck.py`
- `app/database_ops/card.py`
- `app/database_ops/field_def.py`
- `app/database_ops/home.py`
- `app/database_ops/mastery_log.py`
- `app/database_ops/practice_run.py`
- `app/database_ops/deck_practice_config.py`
- `app/services/activity.py`
- `app/services/deck_create.py`
- `app/services/deck_batch_edit.py`
- `app/services/deck_copy.py`
- `app/services/deletion.py`
- `app/services/field_def_create.py`
- `app/services/mastery.py`
- `app/mastery/readiness.py`
- `app/routers/api/subject.py` (deleted)
- `app/routers/api/deck.py`
- `app/routers/api/card.py`
- `app/routers/api/field_def.py`
- `app/routers/api/deletion_impact.py`
- `app/routers/api/deck_practice_config.py`
- `app/routers/api/practice_run.py`
- `tests/conftest.py`
- `tests/api_tests/test_subjects.py` (deleted)
- `tests/api_tests/test_decks.py`
- `tests/api_tests/test_activity_tracking.py`
- `tests/api_tests/test_auth_scoping.py`
- `tests/api_tests/test_deck_batch_edit.py`
- `tests/api_tests/test_deck_copy.py`
- `tests/api_tests/test_deck_delete_cascade.py`
- `tests/api_tests/test_deck_practice_config.py`
- `tests/api_tests/test_deletion_impact.py`
- `tests/api_tests/test_deletion.py`
- `tests/api_tests/test_home.py`
- `tests/api_tests/test_mastery.py`
- `tests/api_tests/test_practice_run.py`
- `frontend/src/api/openapi.json`
- `frontend/src/api/types.ts`
- `frontend/src/api/subject.ts` (deleted)
- `frontend/src/api/deck.ts`
- `frontend/src/api/deletion_impact.ts`
- `frontend/src/api/practice_run.ts`
- `frontend/src/api/deck_practice_config.ts`
- `frontend/src/components/library/DeckEditor.tsx`
- `frontend/src/components/library/DeckEditor.test.tsx`
- `frontend/src/components/library/CardStandaloneForm.tsx`
- `frontend/src/components/library/CardStandaloneForm.test.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.test.tsx`
- `frontend/src/components/library/SubjectForm.tsx` (deleted)
- `frontend/src/components/library/SubjectForm.test.tsx` (deleted)
- `frontend/src/components/library/SubjectIcon.tsx` (deleted)
- `frontend/src/components/library/SubjectIcon.test.tsx` (deleted)
- `frontend/src/components/library/SubjectIconPicker.tsx` (deleted)
- `frontend/src/components/library/SubjectIconPicker.test.tsx` (deleted)
- `frontend/src/components/ui/Breadcrumb.test.tsx`
- `frontend/src/components/ui/Tabs.test.tsx`
- `frontend/src/components/ui/ConfirmDialog.tsx`
- `frontend/src/components/ui/FullScreenDialog.tsx`
- `frontend/src/components/ui/ListRow.tsx`
- `frontend/src/components/ui/MasteryCircle.tsx`
- `frontend/src/components/ui/PickerCombobox.tsx`
- `frontend/src/lib/subjectIcon.ts` (deleted)
- `frontend/src/lib/subjectIcon.test.ts` (deleted)
- `frontend/src/lib/deckEditorReducer.ts`
- `frontend/src/lib/deckEditorReducer.test.ts`
- `frontend/src/lib/deckEditorDiff.ts`
- `frontend/src/lib/deckEditorDiff.test.ts`
- `frontend/src/lib/deletionSummary.ts`
- `frontend/src/lib/failureSentence.ts`
- `frontend/src/lib/failureSentence.test.ts`
- `frontend/src/lib/pickerConfig.ts`
- `frontend/src/lib/practiceSelection.test.ts`
- `frontend/src/lib/returnTo.test.ts`
- `frontend/src/test/client.test.ts`
- `frontend/src/test/deck.test.ts`
- `frontend/src/test/deck_practice_config.test.ts`
- `frontend/src/test/home.test.ts`
- `frontend/src/test/practice_run.test.ts`
- `frontend/src/test/formParts.test.ts`
- `frontend/src/test/subject.test.ts` (deleted)
- `frontend/src/test/testUtils.tsx`
- `frontend/src/pages/LibraryPage.test.tsx`
- `frontend/src/pages/HomePage.test.tsx`
- `frontend/src/pages/DeckDetailPage.test.tsx`
- `frontend/src/pages/PracticeOverviewPage.test.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`
- `frontend/src/pages/PracticeDetailsPage.test.tsx`
- `frontend/src/pages/practicePrefilterChain.test.tsx`
- `frontend/src/components/library/DeckRow.test.tsx`
- `frontend/src/components/library/DeckPicker.test.tsx`
- `README.md`
- `docs/Flashy-ERD.drawio`
- `docs/vocabulary.md`

**Details**

ADR 120, PDR 033 and PDR 034:

- The migration must do ADR 120's data move in one transaction, in this order: add `deck.user_id` and fill it from each deck's subject's `user_id`, then make it not null with `fk_deck_user_id_app_user`, `ON DELETE CASCADE`; rename every deck whose name another deck of its user also has to its own name, a space and its subject's name in parentheses, as "Verbs (Spanish)"; add `uq_deck_user_id` on `(user_id, name)`, so a clash left over fails the whole migration; then drop `uq_deck_subject_id`, `deck.subject_id` and the `subject` table. Its downgrade must raise, since no downgrade restores a subject. Constraint names must come from the naming convention in `app/database.py` (ADR 054).
- `Deck` must carry `user_id` and `UniqueConstraint("user_id", "name")`, and no `subject_id`. Every read and write of a deck, a card, a field or a configuration must compare `Deck.user_id` in the statement where it joins `Subject` today (ADR 034).
- `DeckCreate`, `DeckBatchEdit`, `DeckDetail`, `DeckListing` and every payload must carry no `subject_id` or `subject_name`. `GET /api/decks` must take no `subject_id`, and `GET /api/practice_runs` and `GET /api/deck_practice_configs` must take no `subject_id`. `deck_batch_edit`'s constraint check must name `uq_deck_user_id` for `deck_name_taken`.
- `app/routers/api/subject.py`, `app/database_ops/subject.py` and `app/models/subject.py` are deleted, and `app/main.py` includes no subject router. `touch()` takes `Deck | Card | DeckPracticeConfig`; a call that touched a subject keeps its other rows, and a call that touched a subject alone, as in deck creation and deck deletion, goes.
- `db_stage_create_deck(db, user_id, name)` takes the user in place of the subject, `db_read_deck_ids_for_subjects` goes, and every `db_*` function left with no caller goes. `deck.user_id` is `ON DELETE CASCADE`, as `practice.user_id` will be. `user_id` and `UniqueConstraint("user_id", "name")` go on the `Deck` table class, not on `DeckBase`, so `DeckRead`, `DeckCreate` and `DeckDetail` carry no `user_id`.
- The deletion closure must hold no subject: `compute_deletion_impact` takes no `subject_ids`, `DeletionImpact` has no `subject_ids`, `GET /api/deletion-impact` takes no `subject_ids` and `DeletionImpactRead` has no `subjects_deleted` (ADR 118). `delete_subject` goes.
- `subject_readiness` in `app/services/mastery.py`, `db_fetch_subject_mastery_read_rows`, and every subject sentence in `app/mastery/readiness.py`'s docstrings go (ADR 116).
- `HomeSteps` must carry `has_deck` and `has_card` alone, read in one statement by `db_read_home_steps` (ADR 123).
- `copy_deck` must take `(db, user_id, source_deck_id)`, copy the source's fields, cards and values into a new deck of `user_id` under the source's name, copy no configuration, mastery, review or run, and raise `ValueError` on a name the caller's decks already hold, rolling the whole copy back (ADR 108). It stays reached by no route.
- After the model change, regenerate `frontend/src/api/openapi.json` and `frontend/src/api/types.ts` with `npm run gen:api`.
- The deck form must ask for Deck name and the fields alone, as drawing 10 draws New deck: its subject picker, its New subject overlay, `subjectError`, `SET_SUBJECT`, `subjectId` in `deckEditorReducer` and `subject_id` in `deckEditorDiff` and the create payload go, and a deck is valid with a name and at least two named fields. Edit deck loads no subject.
- `SubjectForm`, `SubjectIcon`, `SubjectIconPicker`, `lib/subjectIcon.ts`, `api/subject.ts` and their tests are deleted; `readDecks`, `readPracticeRuns`, `readDeckPracticeConfigs` and `readDeletionImpact` take no subject. `failureSentence` holds no `subject_name_taken`. `DeckConfigurationEditor`'s deck option type carries no subject field, and `Tabs.test.tsx`'s sample tabs name no subject. `CardStandaloneForm` must invalidate no `['decks', subjectId]` key.
- Every comment in Files that names a subject must be brought to what the code now does or go, by `/home/jadenlu/Projects/Process/rules/comment-rules.md`.
- `docs/Flashy-ERD.drawio`, on the human's order, must draw no `subject` entity and give `deck` its `user_id` to `app_user` in place of `subject_id`.
- `README.md` must describe decks with nothing above them, a deck's readiness averaged over its cards with no subject's, and the deletion of a deck, field or card, in the sentences that name subjects today, and must stop listing subjects and a subject's icon among what is built.
- Tests: in `tests/api_tests/test_decks.py`, a create whose name another of the user's decks has is refused with `deck_name_taken`, and another user's deck of the same name is allowed; `test_deck_copy.py` covers the copy into the caller's decks and the refused clashing name; `tests/conftest.py`'s `existing_subject` and `multi_subject_library` go, its decks created with the user's id; `test_auth_scoping.py` drops the subject routes. Every other test in Files is brought to the new shapes, its fixtures carrying no subject field once the types are regenerated; `LibraryPage.test.tsx`'s `?tab=subjects` case goes, the library holding no tab parameter to test, and `practicePrefilterChain.test.tsx` drops the deck form's Subject step.
- `docs/vocabulary.md` must take these rows' changes, each column as given, every other column as it stands:
  - "Deleting a subject or deck that takes other things with it, each count present only above zero": Concept "Deleting a deck that takes other things with it, each count present only above zero".
  - "A subject", "The page where a subject is made", "Choosing a subject", "A subject's description", "A subject's picture", "Each picture, spoken only and never shown as text", "A subject name already taken", "Leaving the subject form with unsaved changes" and "A subject left unchosen": User reads "—"; Where "—".
- A row whose User reads and Where both read "—" must keep in its Code cell only the names the code still gives its concept, and must leave the file once none is left; every subject row leaves the file in this task. Every Code cell must drop a name this task deletes from the code.

**Out of scope**

- A number added to a name the parentheses leave clashing: never, ADR 120.
- A route that reaches `copy_deck`: never before share links, ADR 108.
- The deck confirm's counts of runs and practices: cycle 049.
- The deck mark, and a field's name in brackets: cycle 048.
- New practice's configurations and `deck_practice_config` itself: cycle 049; this task drops only their subject.

**Done when**

- `uv run alembic heads` prints one revision, this task's, followed by `(head)`.
- After `alembic upgrade head` on the dev database, `psql "$(grep ^DATABASE_URL .env | cut -d= -f2-)" -tAc "select to_regclass('subject') is null, (select count(*) from deck where name like '% (Cycle 032 T3 judgement 2026-11-05 11:4_)')"` prints `t|6`.
- `uv run pytest tests/api_tests/test_decks.py tests/api_tests/test_deck_copy.py tests/api_tests/test_deletion.py tests/api_tests/test_deletion_impact.py tests/api_tests/test_home.py tests/api_tests/test_auth_scoping.py tests/api_tests/test_schema_guard.py -q` passes.
- `git grep -il "subject" -- app tests frontend/src README.md` prints nothing.
- On the live server at 390 wide: New deck shows Deck name, Fields and Add field with no subject picker, as drawing 10 draws it; a deck named after another of the user's decks is refused beside Deck name with "A deck with this name already exists."; and `curl -s -o /dev/null -w '%{http_code}' localhost:8000/api/subjects` prints `404`.
- The cycle's judgement holds.

**Debrief**

None.
