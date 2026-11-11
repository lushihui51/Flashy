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
- ADR 091: Whole collections in bounded statements for every collection read
- ADR 107: A practice's configuration per deck, copied into a frozen run configuration when each run is cut
- ADR 109: One validator for a configuration against its deck's live fields, refusing a save and asserting at the cut
- ADR 124: Two URL parameters for a form's return addresses, and one function leaving every form by history
- ADR 127: A measured header height and one component for every bar at the foot

## Tasks

### T1 — Configurations on the reads, and the save

**Status**

- [ ]

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

**Details**

ADR 107 and ADR 109:

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

None.

### T2 — The board as a form

**Status**

- [ ]

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
- `DeckBoardPage` must be a form with no row of places, headed by the deck's `DeckMark` and name, and beneath it the practice's `PracticeMark` and name, as drawing 16 draws them. The board below is `FieldAssignmentBoard` over the deck's live fields, from `GET /api/decks/{id}`, and the configuration from `PracticeDetail.configurations`, read under `['practice', practiceId]`, or `RunDetail.configurations`, read under `['run_detail', runId]`, a key of its own beside the run page's `['run', runId]`; "Loading fields…" stands while any of its reads loads; in place of the board, "Deck not found." stands when the deck read answers 404 or the deck is none of the practice's or the run's, "Practice not found." or "Run not found." when that read answers 404, and "Could not load this deck." when a read fails otherwise. The browser tab reads the deck's name, through `usePageTitle`. A failed Save shows its sentence in the bar, through `failureSentence` with "Deck not found." for a 404.
- From a practice's page while the practice has no active run, the board's moves and counts must stay in the form's own state and send nothing until Save; the bar at the foot holds Cancel and Save, and Save, a `SubmitButton` ready only when `boardProblem` finds nothing, shows the board's problem at its part on a tap while not ready and saves through `savePracticeConfiguration`; `formParts.test.ts`'s list of forms gains `DeckBoardPage.tsx`. Cancel leaves through `useLeaveForm` for `cancelTo`, else the practice's page, sending nothing; Save leaves for `returnTo`, else the practice's page.
- While the practice has an active run, and always at `/runs/:runId/decks/:deckId`, every field must be greyed and do nothing when tapped, the counts too, one line above the board reading "A run is active." from a practice's page and "How this run asked it." from a run's page, and the bar holding Done alone, which leaves through `useLeaveForm` for `cancelTo`, else the practice's page or the run's page (PDR 051).
- `frontend/src/lib/deckConfigurationBoard.ts` must become `frontend/src/lib/deckBoard.ts`, after the board's user word, "the deck's board", since a configuration of a deck is no longer a thing of its own; its exports keep their names but `ConfigPayloadArrays`, which becomes `BoardArrays`, the generated `ConfigurationArrays` type from `frontend/src/api/types.ts`.
- `FieldAssignmentBoard` must take a `readOnly: boolean` prop that greys every chip and count and ignores every tap.
- The per-deck line in `PracticeDetailsPage` must open `/practices/:practiceId/decks/:deckId` with the page's own address as `cancelTo` and `returnTo`, and end in a chevron, `ChevronRight` from lucide-react, as a run's row does.
- Tests: a move then Cancel sends no request; Save sends one `PUT` with the board's arrays; with an active run, a tap on a field opens no move sheet and the bar holds Done alone; the run's board reads its run's configuration.
- `docs/vocabulary.md`, each row's columns as given, every other column as it stands:
  - "Leaving when nothing is unsaved": Where Edit deck; a deck's board, while its practice has an active run or opened from a completed run's page.
  - "A deck's prompt and answer layout": Code `practice_configuration`; `run_configuration`; `PracticeConfigurationRead`; `RunConfigurationRead`; `ConfigurationArrays`; `PUT /api/practices/{id}/configurations/{deck_id}`; `savePracticeConfiguration`; `deckBoard.ts`; `BoardArrays`.
  - "The page where a configuration is changed": Code `/practices/:practiceId/decks/:deckId`; `/runs/:runId/decks/:deckId`; `DeckBoardPage`.
  - "The deck's fields still loading": Code `DeckBoardPage`.
  - A new row in the Configuration area: Concept "Why a deck's board cannot be changed"; User reads "A run is active." from a practice's page; "How this run asked it." from a completed run's page; Where a deck's board, one line above the greyed board; Code `DeckBoardPage`; `readOnly`.

**Out of scope**

- A completed run's page's deck lines: cycle 051.
- A discard confirm on Cancel: never; the board is not among the forms that ask before discarding.
- The board's slots, chips, counts and move sheet, which keep their look but for the greyed state: never changed here.
- `docs/adrs/067-*.md`, a deprecated record that names `deckConfigurationBoard.ts`: never edited; on the human's word a record keeps the names it was written with.

**Done when**

- `cd frontend && npx vitest run src/pages/DeckBoardPage.test.tsx src/components/library/FieldAssignmentBoard.test.tsx src/lib/deckBoard.test.ts src/pages/PracticeDetailsPage.test.tsx` passes.
- The cycle's judgement holds.

**Debrief**

None.
