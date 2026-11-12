# 050 — A practice's board

Waits for: 049, its `practice_configuration` and `run_configuration`, `PracticeDetail`, `RunRead` and `DeckNameRead`, `validate_configuration`, `PracticeMark`, `PracticeDetailsPage` with its deck lines, `FieldAssignmentBoard` and `frontend/src/lib/deckConfigurationBoard.ts` kept for this cycle, and `docs/vocabulary.md`, which it shares; 047, its `useLeaveForm`; 048, its `DeckMark` and `fieldLabel`, the board's chips reading "[Port Number]" as drawing 16 draws them.

Canvas: https://claude.ai/artifact/MocQEHchmPrmMNRzgvHdGz

## Goal

Outcome: From a practice's page the user opens a deck's board as a form and saves how the practice's next run asks that deck, and, while a run is active or from a run, reads the board unchangeable.

Scope: The cycle covers the practice's and the run's configurations on their reads; `PUT /api/practices/{id}/configurations/{deck_id}`; the board as a form at `/practices/:practiceId/decks/:deckId` and `/runs/:runId/decks/:deckId`, headed by the deck and the practice, with Cancel and Save between runs and Done alone while a run is active or from a run; a practice's page's deck lines opening it; and the vocabulary's board rows. It leaves out the completed run's page's deck lines that open the run's board, cycle 051's; and the board's look, which does not change but for its heading, its greyed state and its line above.

Judgement: The engineer judges on the live server at 390 wide: on a practice with no active run, tapping a deck's line opens the board as drawing 16-edit draws it, headed by the deck's mark and name over the practice's mark and name, with Cancel and Save; moving a field and tapping Cancel lands on the practice's page with the board as it was; moving a field and tapping Save lands there too, and the next Start run asks the deck as saved; with a run active, the same line opens the board greyed, "A run is active." above it, a tap on a field doing nothing and Done alone in the bar, as drawing 16-read draws it; and `/runs/<a completed run's id>/decks/<one of its decks>` shows the board as that run asked it, greyed, "How this run asked it." above it, and Done alone.

## Records

- PDR 017: A row of the places above a page, led by a way back
- PDR 039: A deck's configuration held by its practice and changed between runs
- PDR 047: What the user changed most recently first, with runs and practices by what the user last did in a run
- PDR 049: A drawn mark of its kind beside every name
- PDR 051: Cancel and Create or Save at the foot of every form, and Done alone where nothing can change
- ADR 070: A frontend map from refusal code to sentence
- ADR 090: Eight colour tokens named by meaning as the only colours
- ADR 091: Whole collections in bounded statements for every collection read
- ADR 107: A practice's configuration per deck, copied into a frozen run configuration when each run is cut
- ADR 109: One validator for a configuration against its deck's live fields, refusing a save and asserting at the cut
- ADR 124: Two URL parameters for a form's return addresses, and one function leaving every form by history
- ADR 127: A measured header height and one component for every bar at the foot

## Tasks

### T1 — Configurations on the reads, and the save

**Status**

- [x]

**Goal**

A practice's read carries its configuration of each deck and a run's read the copy it asked each deck by, and `PUT /api/practices/{id}/configurations/{deck_id}` replaces a practice's configuration of a deck after validation, reaching the practice's next run and never a run already cut.

**Dependencies**

None.

**Files**

- `app/models/practice_payloads.py`
- `app/models/run_payloads.py`
- `app/database_ops/practice_configuration.py`
- `app/database_ops/run_configuration.py`
- `app/database_ops/run.py`
- `app/database_ops/practice.py`
- `app/services/practice.py`
- `app/services/practice_configuration.py`
- `app/services/run.py`
- `app/routers/api/practice.py`
- `app/routers/api/run.py`
- `tests/api_tests/test_practice_configuration.py`
- `tests/api_tests/test_practices.py`
- `tests/api_tests/test_runs.py`
- `tests/api_tests/test_auth_scoping.py`
- `tests/api_tests/test_activity_tracking.py`
- `frontend/src/api/openapi.json`
- `frontend/src/api/types.ts`
- `frontend/src/api/practice.ts`
- `frontend/src/api/run.ts`
- `frontend/src/test/practice.test.ts`
- `frontend/src/test/run.test.ts`
- `frontend/src/pages/PracticeEditPage.test.tsx`

**Details**

ADR 107 and ADR 109. `ConfigurationArrays` and `PracticeConfigurationRead` go in `app/models/practice_payloads.py`, beside `DeckNameRead`; `RunConfigurationRead` and `RunDetail` in `app/models/run_payloads.py`, which imports from it:

```python
class ConfigurationArrays(AppModel):
    prompt_field_ids: list[uuid.UUID]
    answer_field_ids: list[uuid.UUID]
    prompt_pool_ids: list[uuid.UUID]
    prompt_pool_counts: list[int]
    answer_pool_ids: list[uuid.UUID]
    answer_pool_counts: list[int]

class PracticeConfigurationRead(ConfigurationArrays):
    deck_id: uuid.UUID

class RunConfigurationRead(ConfigurationArrays):
    deck_id: uuid.UUID

class RunDetail(RunRead):
    practice_name: str
    # Every deck the run asked, most recently changed deck first (PDR 047).
    decks: list[DeckNameRead]
    # One per deck the run asked, as it asked it.
    configurations: list[RunConfigurationRead]
```

- `PracticeDetail` must gain `configurations: list[PracticeConfigurationRead]`, one per deck of the practice, read in the same bounded number of statements as the rest of the read (ADR 091).
- `GET /api/runs/{id}` must return `RunDetail`, its practice's name, decks and configurations read in a bounded number of statements; a deck of a run of chosen cards counts as asked whether or not it holds a chosen card.
- `PUT /api/practices/{id}/configurations/{deck_id}` (`ConfigurationArrays`, 200, `PracticeConfigurationRead`) must validate through `validate_configuration` and refuse a violation with a 400 whose detail is the plain-string message naming the first rule broken, writing nothing, since the board's Save is ready only when `boardProblem` finds nothing and no screen reaches the refusal (ADR 070); replace the whole row; touch no `last_activity_at`; and accept the save while the practice has an active run, whose copy it never changes (ADR 107). A deck that is not one of the practice's is a 404.
- `frontend/src/api/practice.ts` gains `savePracticeConfiguration(practiceId, deckId, arrays)` and `frontend/src/api/run.ts` reads `RunDetail` through `readRun(runId)`; `practice.test.ts` and `run.test.ts` cover their requests.
- Tests: `GET /api/practices/{id}` carries one configuration per deck; `GET /api/runs/{id}` carries the run's decks and copies, a deck of a run of chosen cards that holds no chosen card included; a save reaches the next run's copy and leaves an active run's copy as it was; a save naming a field of another deck, a field on both sides or a count above its pool is refused and writes nothing; the save moves no practice in `GET /api/practices`; another user's practice is a 404.

**Out of scope**

- A refusal of the save while a run is active: never, ADR 107.
- A request for each field moved: never.

**Done when**

- `uv run pytest tests/api_tests/test_practice_configuration.py tests/api_tests/test_practices.py tests/api_tests/test_runs.py tests/api_tests/test_auth_scoping.py tests/api_tests/test_activity_tracking.py -q` passes.
- `cd frontend && npx vitest run src/test/practice.test.ts src/test/run.test.ts` passes.

**Debrief**

- Done when, the pytest line: `166 passed in 23.33s`. New tests: `TestSave` in `test_practice_configuration.py` (a save replaces the whole row and answers it; a save reaches the next run's copy and leaves the active run's copy as cut; a field of another deck, a field on both sides and a count above its pool are each a plain-string 400 that writes nothing; a deck not the practice's and an unknown practice are 404s); `TestDetail` in `test_practices.py` (one configuration per deck, in the order of `decks`, equal to its row); `TestRunDetail` in `test_runs.py` (the practice's name, the decks and the copies, and a run of chosen cards carrying a deck that holds no chosen card); the PUT on another user's practice in `test_auth_scoping.py::test_practice_endpoints`; `test_saving_a_practices_configuration_moves_no_practice_and_touches_nothing` in `test_activity_tracking.py`.
- Done when, the vitest line: `Test Files 2 passed (2)`, `Tests 23 passed (23)`, with new cases for `savePracticeConfiguration` (its PUT path, body and answer, and a 404) and `readRun` answering a `RunDetail`.
- AGENTS.md's checks: `npx vitest run` 663 passed, `npm run lint` clean, `npm run build` clean; the full `pytest`, run with no other connection to the test database, 379 passed.
- Path added with the engineer's go-ahead: `frontend/src/pages/PracticeEditPage.test.tsx`, whose `PRACTICE` fixture is typed `PracticeDetail` and failed `tsc -b` without `configurations`; it gained one configuration for its deck and nothing it checks changed.
- Departure: `RunListing` moved from `app/models/run_payloads.py` to `app/models/practice_payloads.py`, since `run_payloads.py` now imports `ConfigurationArrays` and `DeckNameRead` from `practice_payloads.py`, which imported `RunListing` back, a circular import. Its name and shape are unchanged; cycles 051 and 052 name it without its module.
- Departure: `RunDetail.decks` carries its comment without "(PDR 047)", which the comment rules forbid on a member; `configurations` on both reads says it comes in the order of `decks`.
- The reads are composed in services: `practice_detail` in `app/services/practice.py`, which `GET /api/practices/{id}` now calls in place of composing in the router, and `read_run_detail` in `app/services/run.py`. Each adds one statement for the configurations, `db_read_practice_configurations` or the new `db_read_run_configurations`.
- The save reads its row with `db_read_practice_configuration`, one statement scoped to the user through the practice, so an unknown or foreign practice and a deck not the practice's are one 404 with the detail "Deck not found".
- Read `save_practice_configuration` in `app/services/practice_configuration.py`: it looks up the row before validating, so a 404 wins over a 400, and it writes all six columns.

### T2 — The board as a form

**Status**

- [x]

**Goal**

A deck's line on a practice's page opens the deck's board as a form, as drawing 16 draws it, saving the practice's configuration of the deck between runs and showing it greyed with Done alone while a run is active, and a run's board shows how the run asked the deck, greyed with Done alone.

**Dependencies**

- T1: `PracticeDetail.configurations`, `RunDetail` and `savePracticeConfiguration`.

**Files**

- `frontend/src/App.tsx`
- `frontend/src/pages/DeckBoardPage.tsx` (new)
- `frontend/src/pages/DeckBoardPage.test.tsx` (new)
- `frontend/src/components/library/FieldAssignmentBoard.tsx`
- `frontend/src/components/library/FieldAssignmentBoard.test.tsx` (new)
- `frontend/src/lib/deckBoard.ts` (renamed from `frontend/src/lib/deckConfigurationBoard.ts`)
- `frontend/src/lib/deckBoard.test.ts` (renamed from `frontend/src/lib/deckConfigurationBoard.test.ts`)
- `frontend/src/pages/PracticeDetailsPage.tsx`
- `frontend/src/pages/PracticeDetailsPage.test.tsx`
- `frontend/src/test/formParts.test.ts`
- `docs/vocabulary.md`

**Details**

Drawing 16, under PDR 051, ADR 124 and ADR 127:

- `App.tsx` must route `/practices/:practiceId/decks/:deckId` and `/runs/:runId/decks/:deckId` to `DeckBoardPage`.
- `DeckBoardPage` must be a form with no row of places, headed by the deck's `DeckMark` and name, and beneath it the practice's `PracticeMark` and name, as drawing 16 draws them. The board below is `FieldAssignmentBoard` over the deck's live fields, from `GET /api/decks/{id}` read under `['deck', deckId]`, the key every other page reads a deck under, and the configuration from `PracticeDetail.configurations`, read under `['practice', practiceId]`, or `RunDetail.configurations`, read under `['run_detail', runId]`, a key of its own beside the run page's `['run', runId]`; "Loading fields…", a plain muted sentence in `--color-aside` as the removed `DeckConfigurationEditor` drew it, stands until every one of its reads has answered or failed; "Deck not found." stands when the deck read answers 404 or the deck is none of the practice's or the run's, "Practice not found." or "Run not found." when that read answers 404, and "Could not load this deck." when a read fails otherwise. Until every read has answered, and once one has failed, the page must hold that sentence alone, with no heading and no bar, as `PracticeEditPage` does once its read fails; when several reads have failed, "Practice not found." or "Run not found." stands, else "Deck not found.", else "Could not load this deck.". The three "not found" sentences must be plain muted sentences, as `PracticeEditPage` draws "Practice not found.", and "Could not load this deck." must go through `FormPart`'s `wrong` look, so the form's own source holds no `role="alert"`, which `formParts.test.ts` forbids. The browser tab reads the deck's name, through `usePageTitle`. A failed Save shows its sentence in the bar, through `failureSentence` with "Deck not found." for a 404.
- From a practice's page while the practice has no active run, the board's moves and counts must stay in the form's own state and send nothing until Save; the bar at the foot holds Cancel and Save, and Save, a `SubmitButton` ready only when `boardProblem` finds nothing, shows the board's problem at its part on a tap while not ready and saves through `savePracticeConfiguration`, then invalidates `['practice', practiceId]` before it leaves, as `PracticeEditPage`'s save does; `FieldAssignmentBoard`'s `problem` must be null until a tap on Save while not ready sets it to `boardProblem`'s answer, and the next move or count must set it back to null, as Edit practice's Name sentence clears when the name changes; `formParts.test.ts`'s list of forms gains `DeckBoardPage.tsx`. Cancel leaves through `useLeaveForm` for `cancelTo`, else the practice's page, sending nothing; Save leaves for `returnTo`, else the practice's page.
- While the practice has an active run, and always at `/runs/:runId/decks/:deckId`, every field must be greyed and do nothing when tapped, the counts too, one line above the board reading "A run is active." from a practice's page and "How this run asked it." from a run's page, and the bar holding Done alone, which leaves through `useLeaveForm` for `cancelTo`, else the practice's page or the run's page (PDR 051).
- `frontend/src/lib/deckConfigurationBoard.ts` must become `frontend/src/lib/deckBoard.ts`, after the board's user word, "the deck's board", since a configuration of a deck is no longer a thing of its own; its exports keep their names but `ConfigPayloadArrays`, which becomes `BoardArrays`, the generated `ConfigurationArrays` type from `frontend/src/api/types.ts`.
- `FieldAssignmentBoard` must take a `readOnly: boolean` prop that greys every chip and count and ignores every tap: a greyed chip and an unchosen greyed count take words in `--color-aside`, a border in `--color-line` and no shadow, and a chosen greyed count is filled `--color-line` with words in `--color-aside`, a border in `--color-line`, no shadow and no pressed offset, so which counts are chosen still shows (ADR 090).
- The per-deck line in `PracticeDetailsPage` must open `/practices/:practiceId/decks/:deckId` with the page's own address as `cancelTo` and `returnTo`, and end in a chevron, `ChevronRight` from lucide-react, as a run's row does.
- Tests: in `DeckBoardPage.test.tsx`, a move then Cancel sends no request; Save sends one `PUT` with the board's arrays; with an active run, a tap on a field opens no move sheet and the bar holds Done alone; the run's board reads its run's configuration. In `FieldAssignmentBoard.test.tsx`, with `readOnly`, a tap on a chip opens no move sheet, a tap on a count calls no `onToggleCount`, and each chip and count carries the greyed look's classes; without it, a tap on a chip opens the move sheet. In `PracticeDetailsPage.test.tsx`, each deck's line links to `/practices/:practiceId/decks/:deckId` with the page's own address as `cancelTo` and `returnTo`.
- `docs/vocabulary.md`, each row's columns as given, every other column as it stands:
  - "Leaving when nothing is unsaved": Where Edit deck; a deck's board, while its practice has an active run or opened from a completed run's page; Code `showDone`; `DeckBoardPage`.
  - "How a practice asks one of its decks, never named": Code `practice_configuration`; `PracticeConfiguration`; `PracticeConfigurationRead`; `ConfigurationArrays`; `PUT /api/practices/{id}/configurations/{deck_id}`; `savePracticeConfiguration`; `deckBoard.ts`; `BoardArrays`.
  - "The copy of how the practice asks each deck that a run takes at start": Code `run_configuration`; `RunConfiguration`; `RunConfigurationRead`.
  - "The form showing how a practice asks one of its decks": Code `/practices/:practiceId/decks/:deckId`; `/runs/:runId/decks/:deckId`; `DeckBoardPage`.
  - "The deck's fields still loading": Code `DeckBoardPage`.
  - A new row in the Configuration area: Concept "Why a deck's board cannot be changed"; User reads "A run is active."; "How this run asked it."; Where a deck's board, one line above the greyed board, the first opened from a practice's page and the second from a completed run's page; Code `DeckBoardPage`; `readOnly`.

**Out of scope**

- A completed run's page's deck lines: cycle 051.
- A discard confirm on Cancel: never; the board is not among the forms that ask before discarding.
- The board's slots, chips, counts and move sheet, which keep their look but for the greyed state: never changed here.
- Drawing 16-read's #8a929c for a greyed chip: never; the app keeps its eight colours (ADR 090).
- `docs/adrs/067-*.md`, a deprecated record that names `deckConfigurationBoard.ts`: never edited; on the human's word a record keeps the names it was written with.

**Done when**

- `cd frontend && npx vitest run src/pages/DeckBoardPage.test.tsx src/components/library/FieldAssignmentBoard.test.tsx src/lib/deckBoard.test.ts src/pages/PracticeDetailsPage.test.tsx` passes.
- The cycle's judgement holds.

**Debrief**

- Done when, the vitest line: `Test Files 4 passed (4)`, `Tests 51 passed (51)`. New tests: `DeckBoardPage.test.tsx` (17: the heading, title and bar; the practice's configuration drawn; a move then Cancel sends no request; Save sends one `PUT` with the board's arrays and leaves for `returnTo`, else the practice's page; a tap on Save while not ready says the problem at its part and a move clears it; a failed Save's "Deck not found." in the bar; with an active run a tap on a field opens no move sheet and the bar holds Done alone; the run's board reads its run's configuration and Done leaves for the run's page; "Loading fields…" alone until every read answers; each of the four sentences, "Practice not found." over "Deck not found."); `FieldAssignmentBoard.test.tsx` (5: read only, a chip opens no sheet, a count calls no `onToggleCount`, every chip and count carries the greyed classes and a chosen count `bg-(--color-line)`; not read only, a chip opens the sheet); `PracticeDetailsPage.test.tsx`'s "opens each deck's board from its line, coming back here either way", replacing the test that each line opens nothing.
- Done when, the judgement, on the live server at 390 by 844 through headless Chromium, on the practice "Cycle 049 T4 check 2026-11-11T22:05:18.648Z" and its deck Ports: the deck's line opened `/practices/<id>/decks/<deck>?cancelTo=…&returnTo=…` headed "Ports" with the deck mark over the practice's mark and name, no row of places, the bar Cancel and Save, the tab "Ports · Flashy", nothing wider than the screen; moving [Protocol Function] to Not used and tapping Cancel landed on the practice's page with the configuration unchanged and the board, reopened, as it was; the same move and Save landed there with [Protocol Function] gone from `answer_field_ids`, and the run Start run then made, `15214137-dd48-458f-95ae-a06da8bff756`, carries that configuration as its copy; with that run active, the line opened the board with "A run is active." above it, each chip in `--color-aside` words, a `--color-line` border and no shadow, a tap on [Port Number] opening no sheet, and Done alone, which landed on the practice's page; `/runs/c4ea3fe6-cda6-494d-9ddc-7301578a3230/decks/<Three fields>`, a completed run, showed "How this run asked it.", the board as the run's copy has it ([Term] prompt, [Meaning] answer), greyed, a tap opening no sheet, and Done alone. Neither configuration held a random draw, so the greyed counts were seen only in `FieldAssignmentBoard.test.tsx`. No page error.
- The dev database keeps what the judgement wrote: that practice's configuration of Ports without [Protocol Function], and its active run `15214137-…`.
- AGENTS.md's checks: `npx vitest run` 687 passed, `npm run lint` clean, `npm run build` clean.
- No departure from guidance. Choices the file left open: a greyed chip is a disabled button and a greyed count a disabled checkbox, so each is still read out and its state still spoken; Done fills the bar as drawing 16-read draws it; the practice's name beneath the heading is `text-body` in `--color-aside` and the line above the board `text-sm`, as drawing 16 sizes them.
- Read `DeckBoardPage`'s `owner`: one object built from the practice's read or the run's, so the sentences, the heading and the bar have one path for both addresses.

