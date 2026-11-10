# 050 — A practice's board

Waits for: 049, its `practice_configuration` and `run_configuration`, `PracticeDetail` and `RunRead`, `validate_configuration`, `PracticeMark`, `PracticeDetailsPage` with its deck lines, `FieldAssignmentBoard` and `frontend/src/lib/deckConfigurationBoard.ts` kept for this cycle, and `docs/vocabulary.md`, which it shares.

Canvas: https://claude.ai/artifact/MocQEHchmPrmMNRzgvHdGz

## Goal

Outcome: From a practice's page the user opens a deck's board as a form and saves how the practice's next run asks that deck, and, while a run is active or from a run, reads the board unchangeable.

Scope: The cycle covers the practice's and the run's configurations on their reads; `PUT /api/practices/{id}/configurations/{deck_id}`; the board as a form at `/practices/:practiceId/decks/:deckId` and `/runs/:runId/decks/:deckId`, headed by the deck and the practice, with Cancel and Save between runs and Done alone while a run is active or from a run; a practice's page's deck lines opening it; and the vocabulary's board rows. It leaves out the completed run's page's deck lines that open the run's board, cycle 051's; and the board's look, which does not change but for its heading, its greyed state and its line above.

Judgement: The engineer judges on the live server at 390 wide: on a practice with no active run, tapping a deck's line opens the board as drawing 16-edit draws it, headed by the deck's mark and name over the practice's mark and name, with Cancel and Save; moving a field and tapping Cancel lands on the practice's page with the board as it was; moving a field and tapping Save lands there too, and the next Start run asks the deck as saved; with a run active, the same line opens the board greyed, "A run is active." above it, a tap on a field doing nothing and Done alone in the bar, as drawing 16-read draws it; and `/runs/<a completed run's id>/decks/<one of its decks>` shows the board as that run asked it, greyed, "How this run asked it." above it, and Done alone.

## Records

- PDR 039: A deck's configuration held by its practice and changed between runs
- PDR 051: Cancel and Create or Save at the foot of every form, and Done alone where nothing can change
- ADR 070: A frontend map from refusal code to sentence
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
- `app/services/practice.py`
- `app/services/practice_configuration.py`
- `app/services/run.py`
- `app/routers/api/practice.py`
- `app/routers/api/run.py`
- `tests/api_tests/test_practice_configuration.py`
- `tests/api_tests/test_runs.py`
- `tests/api_tests/test_auth_scoping.py`
- `tests/api_tests/test_activity_tracking.py`
- `frontend/src/api/openapi.json`
- `frontend/src/api/types.ts`
- `frontend/src/api/practice.ts`
- `frontend/src/api/run.ts`

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

class DeckConfigurationRead(ConfigurationArrays):
    deck_id: uuid.UUID

class RunDetail(RunRead):
    practice_name: str
    # One per deck the run asked, as it asked it.
    configurations: list[DeckConfigurationRead]
```

- `PracticeDetail` must gain `configurations: list[DeckConfigurationRead]`, one per deck of the practice, read in the same bounded number of statements as the rest of the read (ADR 091).
- `GET /api/runs/{id}` must return `RunDetail`.
- `PUT /api/practices/{id}/configurations/{deck_id}` (`ConfigurationArrays`, 200, `DeckConfigurationRead`) must validate through `validate_configuration` and refuse a violation with a 400 whose detail is the plain-string message naming the first rule broken, writing nothing, since the board's Save is ready only when `boardProblem` finds nothing and no screen reaches the refusal (ADR 070); replace the whole row; touch no `last_activity_at`; and accept the save while the practice has an active run, whose copy it never changes (ADR 107). A deck that is not one of the practice's is a 404.
- `frontend/src/api/practice.ts` gains `savePracticeConfiguration(practiceId, deckId, arrays)` and `frontend/src/api/run.ts` reads `RunDetail`.
- Tests: a save reaches the next run's copy and leaves an active run's copy as it was; a save naming a field of another deck, a field on both sides or a count above its pool is refused and writes nothing; the save moves no practice in `GET /api/practices`; another user's practice is a 404.

**Out of scope**

- A refusal of the save while a run is active: never, ADR 107.
- A request for each field moved: never, LCD5.

**Done when**

- `uv run pytest tests/api_tests/test_practice_configuration.py tests/api_tests/test_runs.py tests/api_tests/test_auth_scoping.py tests/api_tests/test_activity_tracking.py -q` passes.

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
- `frontend/src/lib/deckConfigurationBoard.ts`
- `frontend/src/lib/deckConfigurationBoard.test.ts`
- `frontend/src/pages/PracticeDetailsPage.tsx`
- `frontend/src/pages/PracticeDetailsPage.test.tsx`
- `docs/vocabulary.md`

**Details**

LPD17, LPD20, LCD2, LCD5 and drawing 16, under PDR 051, ADR 124 and ADR 127:

- `App.tsx` must route `/practices/:practiceId/decks/:deckId` and `/runs/:runId/decks/:deckId` to `DeckBoardPage`.
- `DeckBoardPage` must be a form with no row of places, headed by the deck's `DeckMark` and name, and beneath it the practice's `PracticeMark` and name, as drawing 16 draws them. The board below is `FieldAssignmentBoard` over the deck's live fields, from `GET /api/decks/{id}`, and the configuration from `PracticeDetail.configurations` or `RunDetail.configurations`; "Loading fields…" stands while the deck's fields load, and "Could not load this deck." in place of the board when a read fails.
- From a practice's page while the practice has no active run, the board's moves and counts must stay in the form's own state and send nothing until Save (LCD5); the bar at the foot holds Cancel and Save, and Save, ready only when `boardProblem` finds nothing, saves through `savePracticeConfiguration`. Cancel leaves through `useLeaveForm` for `cancelTo`, else the practice's page, sending nothing; Save leaves for `returnTo`, else the practice's page.
- While the practice has an active run, and always at `/runs/:runId/decks/:deckId`, every field must be greyed and do nothing when tapped, the counts too, one line above the board reading "A run is active." from a practice's page and "How this run asked it." from a run's page, and the bar holding Done alone, which leaves through `useLeaveForm` for `cancelTo`, else the practice's page or the run's page (PDR 051).
- `FieldAssignmentBoard` must take a `readOnly: boolean` prop that greys every chip and count and ignores every tap.
- A practice's page's deck line must open `/practices/:practiceId/decks/:deckId` with the page's own address as `cancelTo` and `returnTo`.
- Tests: a move then Cancel sends no request; Save sends one `PUT` with the board's arrays; with an active run, a tap on a field opens no move sheet and the bar holds Done alone; the run's board reads its run's configuration.
- `docs/vocabulary.md`, each row's columns as given, every other column as it stands:
  - "Leaving when nothing is unsaved": Where Edit deck; a deck's board, while its practice has an active run or opened from a completed run's page.
  - "A deck's prompt and answer layout": Concept "How a practice asks one of its decks, never named"; User reads the deck's board; Where a practice's page, through each deck's line; a completed run's page, through each deck's line; a deck's board.
  - "The page where a configuration is changed": Concept "The form showing how a practice asks one of its decks"; User reads the deck's name with its mark, and beneath it the practice's name with its mark; Where Its heading.
  - "The two halves of a card": User reads "Prompt side"; "Answer side"; Where a deck's board.
  - "The deck's fields still loading": Where a deck's board.
  - "The prompt side with no field" and "The answer side with no field": Where a deck's board, at the top of the side.
  - "A prompt draw count that does not fit its area" and "An answer draw count that does not fit its area": Where a deck's board, at the side's "Each card shows" row.
  - A new row in the Configuration area: Concept "Why a deck's board cannot be changed"; User reads "A run is active." from a practice's page; "How this run asked it." from a completed run's page; Where a deck's board, one line above the greyed board; Code `DeckBoardPage`; `readOnly`.

**Out of scope**

- A completed run's page's deck lines: cycle 051.
- A discard confirm on Cancel: never; the board is not among the forms that ask before discarding.
- The board's slots, chips, counts and move sheet, which keep their look but for the greyed state: never changed here.

**Done when**

- `cd frontend && npx vitest run src/pages/DeckBoardPage.test.tsx src/components/library/FieldAssignmentBoard.test.tsx src/lib/deckConfigurationBoard.test.ts src/pages/PracticeDetailsPage.test.tsx` passes.
- The cycle's judgement holds.

**Debrief**

None.
