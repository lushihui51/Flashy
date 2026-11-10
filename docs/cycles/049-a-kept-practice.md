# 049 — A kept practice

Waits for: 046, its decks owned by their user (`deck.user_id`, `uq_deck_user_id`) and every file it removes subjects from; 047, its `useLeaveForm` in `frontend/src/lib/leaveForm.ts` and every opener's `cancelTo`; 048, its `DeckMark`, its `fieldLabel`, and `docs/vocabulary.md`, which it shares.

Canvas: https://claude.ai/artifact/HnVa41szMKm1HkChh9FktD

## Goal

Outcome: The user makes a practice by picking its decks and a name, keeps it, and runs it from its own page as many times as they like; All practices lists every practice; Edit practice renames or deletes one; and every existing run is the one run of a practice of its own.

Scope: The cycle covers the `practice`, `practice_configuration` and `run_counted_card` tables and the renames of the run's tables, in ADR 122's one migration; the API's practice and run paths but the board's and the end of a run; creating a practice from its decks and a name, each deck's starting configuration, and the first practice stamped; starting or continuing a practice's run, and cutting every run, a re-run and a run of chosen cards included, from the practice's configurations; a run's day and its count of cards; a practice's mastery; New practice, All practices, Edit practice and a practice's page as drawings 8, 15, 4-edit and 4-practice draw them; the practice mark and the run mark; a deck's page holding its cards alone; the run page, its summary and Home reading the new paths; and the vocabulary's practice and run rows. It leaves out the board opened from a deck's line, cycle 050's; ending a run, the completed run's page with its heading, count and deck lines, Re-run as the page's main action and the summary's new words, cycle 051's; Home's runs and its bar, cycle 052's; and a name wrapping to two lines, cycle 053's.

Judgement: The engineer judges on the live server at 390 wide, against the dev database migrated by T1: All practices lists every practice, among them one per former run under the run's name, each row as drawing 15 draws it, and narrows by deck; New practice with Commands then Ports picked shows "Commands + Ports" in grey in Name and "2 selected", and Create lands on the new practice's page; that page reads as drawing 4-practice, with Start run, the pencil, a line per deck and no runs; Start run opens the run page on a card, and the practice's page then reads Continue run and lists the run under Runs as its day, Active and "0 of N cards"; a second practice named "Commands + Ports" is refused beside Name with "A practice with this name already exists."; Edit practice renames the practice and leaves it where it was on All practices; Delete practice asks "Delete this practice?" over "Its runs will be gone. Its decks and your mastery stay as they are.", lands on All practices, and leaves every deck's circle as it was; a deck's page shows its cards and no tabs and no Practice button; and a completed run's summary's Re-run opens a new run of the same practice.

## Records

- PDR 035: A practice kept as a named set of decks, run as many times as the user likes
- PDR 037: Runs at the user's initiative, with nothing due
- PDR 038: One active run per practice, which the user can end at any card
- PDR 039: A deck's configuration held by its practice and changed between runs
- PDR 040: A next run started from a completed run, of the whole practice or the cards chosen
- PDR 041: One summary of what a run did to each card's mastery, on the completed run's page
- PDR 044: A field kept in its deck or deleted with all it held
- PDR 045: A deck's and a practice's mastery as the average over their cards
- PDR 046: Mastery shown as a circle filled as far as the user is ready
- PDR 047: What the user changed most recently first, with runs and practices by what the user last did in a run
- PDR 049: A drawn mark of its kind beside every name
- PDR 051: Cancel and Create or Save at the foot of every form, and Done alone where nothing can change
- ADR 105: A practice table above its runs, each run reaching its owner through its practice
- ADR 106: No requeue exception to the blank-value filter, for a card edited during a run
- ADR 107: A practice's configuration per deck, copied into a frozen run configuration when each run is cut
- ADR 109: One validator for a configuration against its deck's live fields, refusing a save and asserting at the cut
- ADR 110: A partial unique index for one active run per practice
- ADR 112: One function cutting every run from its practice's configurations as they stand
- ADR 113: A table of the cards a run could ask, written when the run is cut, for its count
- ADR 114: A run's day worked out on read in the user's zone, with no stored name
- ADR 115: A practice's name unique by a constraint, and suggested by one server function
- ADR 116: Readiness as the only mastery figure leaving the mastery module, folded over a practice's cards
- ADR 117: `last_activity_at` on decks, cards and runs, with practices ordered by their runs
- ADR 118: One deletion closure for every deletion of a deck, field or card, a practice deleted by its cascades
- ADR 119: Total removal of a deleted field's influence, every configuration pruned to live fields
- ADR 122: Every existing run migrated as the one run of a practice of its own
- ADR 123: One server-composed read for Home, its steps ended by a first practice stamped at creation
- ADR 124: Two URL parameters for a form's return addresses, and one function leaving every form by history
- ADR 125: Server-composed reads for a run's page and its summary, naming the run's day and practice
- ADR 126: Independence of persistent entities from ephemeral ones, with a practice persistent and its runs ephemeral

## Tasks

### T1 — The practice above its runs

**Status**

- [ ]

**Goal**

Every run belongs to a practice the user keeps, made from its decks and a name and holding one configuration per deck, the run's tables carry the run's names, every run is cut from its practice's configurations, the API answers on its practice and run paths, every existing run is the one run of a practice of its own, and every page that read a run or a configuration works on the new paths, each in its least working form.

**Dependencies**

None.

**Files**

- `alembic/versions/<revision>_a_practice_above_its_runs.py` (new)
- `app/main.py`
- `app/refusals.py`
- `app/models/__init__.py`
- `app/models/practice.py` (new)
- `app/models/practice_configuration.py` (new)
- `app/models/practice_payloads.py` (new)
- `app/models/run.py` (renamed from `app/models/practice_run.py`)
- `app/models/run_configuration.py` (renamed from `app/models/practice_deck.py`)
- `app/models/run_card.py` (renamed from `app/models/practice_card.py`)
- `app/models/run_counted_card.py` (new)
- `app/models/run_payloads.py` (renamed from `app/models/practice_run_payloads.py`)
- `app/models/deck_practice_config.py` (deleted)
- `app/models/deletion_payloads.py`
- `app/models/home_payloads.py`
- `app/models/mastery_log.py`
- `app/database_ops/practice.py` (new)
- `app/database_ops/practice_configuration.py` (renamed from `app/database_ops/deck_practice_config.py`)
- `app/database_ops/run.py` (renamed from `app/database_ops/practice_run.py`)
- `app/database_ops/run_configuration.py` (renamed from `app/database_ops/practice_deck.py`)
- `app/database_ops/run_card.py` (renamed from `app/database_ops/practice_card.py`)
- `app/database_ops/run_generation.py` (renamed from `app/database_ops/practice_generation.py`)
- `app/database_ops/run_counted_card.py` (new)
- `app/database_ops/home.py`
- `app/database_ops/mastery_log.py`
- `app/database_ops/app_user.py`
- `app/services/practice.py` (new)
- `app/services/practice_configuration.py` (renamed from `app/services/deck_practice_config.py`)
- `app/services/run.py` (renamed from `app/services/practice_run.py`)
- `app/services/run_generation.py` (renamed from `app/services/practice_generation.py`)
- `app/services/activity.py`
- `app/services/deck_copy.py`
- `app/services/deck_batch_edit.py`
- `app/services/deletion.py`
- `app/services/home.py`
- `app/services/mastery.py`
- `app/routers/api/practice.py` (new)
- `app/routers/api/run.py` (renamed from `app/routers/api/practice_run.py`)
- `app/routers/api/deck_practice_config.py` (deleted)
- `app/routers/api/deletion_impact.py`
- `app/routers/api/home.py`
- `tests/conftest.py`
- `tests/api_tests/test_practices.py` (new)
- `tests/api_tests/test_runs.py` (renamed from `tests/api_tests/test_practice_run.py`)
- `tests/api_tests/test_practice_configuration.py` (renamed from `tests/api_tests/test_deck_practice_config.py`)
- `tests/api_tests/test_activity_tracking.py`
- `tests/api_tests/test_auth_scoping.py`
- `tests/api_tests/test_deck_batch_edit.py`
- `tests/api_tests/test_deck_copy.py`
- `tests/api_tests/test_deck_delete_cascade.py`
- `tests/api_tests/test_deletion_impact.py`
- `tests/api_tests/test_deletion.py`
- `tests/api_tests/test_home.py`
- `tests/api_tests/test_mastery.py`
- `frontend/src/api/openapi.json`
- `frontend/src/api/types.ts`
- `frontend/src/api/practice.ts` (new)
- `frontend/src/api/run.ts` (renamed from `frontend/src/api/practice_run.ts`)
- `frontend/src/api/deck_practice_config.ts` (deleted)
- `frontend/src/api/deletion_impact.ts`
- `frontend/src/api/unwrap.ts`
- `frontend/eslint.config.js`
- `frontend/src/components/ui/ConfirmDialog.tsx`
- `frontend/src/App.tsx`
- `frontend/src/components/shell/navItems.ts`
- `frontend/src/components/shell/CreateSheet.tsx`
- `frontend/src/components/shell/CreateSheet.test.tsx`
- `frontend/src/components/shell/TopBar.test.tsx`
- `frontend/src/pages/HomePage.tsx`
- `frontend/src/pages/HomePage.test.tsx`
- `frontend/src/pages/DeckDetailPage.tsx`
- `frontend/src/pages/DeckDetailPage.test.tsx`
- `frontend/src/pages/PracticeOverviewPage.tsx`
- `frontend/src/pages/PracticeOverviewPage.test.tsx`
- `frontend/src/pages/PracticeDetailsPage.tsx`
- `frontend/src/pages/PracticeDetailsPage.test.tsx`
- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`
- `frontend/src/pages/practicePrefilterChain.test.tsx` (deleted)
- `frontend/src/pages/RunPage.tsx` (renamed from `frontend/src/pages/PracticeRunPage.tsx`)
- `frontend/src/pages/RunPage.test.tsx` (renamed from `frontend/src/pages/PracticeRunPage.test.tsx`)
- `frontend/src/components/run/RunRow.tsx` (moved from `frontend/src/components/practice/PracticeRunRow.tsx`)
- `frontend/src/components/run/RunStatusBadge.tsx` (moved from `frontend/src/components/practice/PracticeStatusBadge.tsx`)
- `frontend/src/components/run/RerunButton.tsx` (moved from `frontend/src/components/practice/RerunButton.tsx`)
- `frontend/src/components/run/RerunButton.test.tsx` (moved from `frontend/src/components/practice/RerunButton.test.tsx`)
- `frontend/src/components/run/RunBreakdown.tsx` (moved from `frontend/src/components/practice/RunBreakdown.tsx`)
- `frontend/src/components/run/RunBreakdown.test.tsx` (moved from `frontend/src/components/practice/RunBreakdown.test.tsx`)
- `frontend/src/components/run/RatingChip.tsx` (moved from `frontend/src/components/practice/RatingChip.tsx`)
- `frontend/src/components/run/RatingChip.test.tsx` (moved from `frontend/src/components/practice/RatingChip.test.tsx`)
- `frontend/src/components/run/ratingTiers.ts` (moved from `frontend/src/components/practice/ratingTiers.ts`)
- `frontend/src/components/run/FieldValue.tsx` (moved from `frontend/src/components/practice/FieldValue.tsx`)
- `frontend/src/components/run/RunProgressBar.tsx` (moved from `frontend/src/components/practice/RunProgressBar.tsx`)
- `frontend/src/components/practice/DeckChips.tsx` (renamed from `frontend/src/components/practice/SessionDeckChips.tsx`)
- `frontend/src/components/practice/ConfigurationPickList.tsx` (deleted)
- `frontend/src/components/practice/SelectedConfigurationList.tsx` (deleted)
- `frontend/src/components/practice/PracticeFilterBar.tsx` (deleted)
- `frontend/src/components/library/DeckEditor.tsx`
- `frontend/src/components/library/DeckEditor.test.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.tsx` (deleted)
- `frontend/src/components/library/DeckConfigurationEditor.test.tsx` (deleted)
- `frontend/src/components/library/DeckConfigurationRow.tsx` (deleted)
- `frontend/src/lib/practiceConfigurationGroups.ts` (deleted)
- `frontend/src/lib/practiceSelection.ts` (deleted)
- `frontend/src/lib/practiceSelection.test.ts` (deleted)
- `frontend/src/lib/runCopy.ts` (renamed from `frontend/src/lib/practiceCopy.ts`)
- `frontend/src/lib/deckConfigurationBoard.ts`
- `frontend/src/lib/datetime.ts`
- `frontend/src/lib/datetime.test.ts`
- `frontend/src/lib/deletionSummary.ts`
- `frontend/src/lib/failureSentence.ts`
- `frontend/src/lib/failureSentence.test.ts`
- `frontend/src/lib/returnTo.test.ts`
- `frontend/src/components/ui/Breadcrumb.test.tsx`
- `frontend/src/test/practice.test.ts` (new)
- `frontend/src/test/run.test.ts` (renamed from `frontend/src/test/practice_run.test.ts`)
- `frontend/src/test/deck_practice_config.test.ts` (deleted)
- `frontend/src/test/home.test.ts`
- `frontend/src/test/formParts.test.ts`
- `frontend/src/test/testUtils.tsx`
- `AGENTS.md`
- `README.md`
- `docs/vocabulary.md`

**Details**

The schema, ADR 105, ADR 107, ADR 110, ADR 113, ADR 114, ADR 115, ADR 117 and ADR 122:

- One migration must, in one transaction and in this order:
  1. Create `practice` (`id`, `user_id` not null `ON DELETE CASCADE` to `app_user`, `name`, `created_at` as `TimestampMixin` gives it, and `uq_practice_user_id` on `(user_id, name)`) and `practice_configuration` (`id`, `practice_id` and `deck_id` each not null `ON DELETE CASCADE`, the six array and count columns, `UNIQUE (practice_id, deck_id)`). No table gains `updated_at` (ADR 117).
  2. Add `practice_run.practice_id`, nullable; create one practice per run as ADR 122 lists, with the run's user, name and `created_at`, a later practice whose name its user's earlier one already has taking the next untaken number in parentheses, as "Cycle 032 T3 judgement (1)"; set each run's `practice_id`; then make it not null, `ON DELETE CASCADE`.
  3. Give each practice one `practice_configuration` per copy of its run, its six arrays pruned to the deck's live fields as ADR 119 prunes a deleted field: a dead id removed, each random-draw count lowered to its pool's size, the count of a pool left empty dropped, and a configuration left with a side naming no field replaced whole by the deck's starting configuration, so every configuration passes `validate_configuration`.
  4. Add `practice_run.last_activity_at`, set to the later of the run's `created_at` and its latest review's `reviewed_at`.
  5. Drop `practice_run.name`, `practice_run.user_id`, `practice_deck.source_config_id`, `practice_deck.source_config_name` and `deck_practice_config`.
  6. Rename `practice_run` to `run`, `practice_deck` to `run_configuration`, `practice_card` to `run_card`, and every foreign key column after the table it references (`practice_run_id` to `run_id` in `run_configuration`, `run_card` and `mastery_log`); rename every constraint and index the naming convention in `app/database.py` derives to the name it now derives, the names left from `practice_session` included; rename the explicit `ix_practice_card_run_status_position` to `ix_run_card_run_status_position`, `ix_mastery_log_run` keeping its name; and rename every NOT NULL constraint PostgreSQL named after an old table or column, as `practice_session_name_not_null`, to `<table>_<column>_not_null` of its table and column now, or let it go with its dropped column.
  7. Create `run_counted_card` (`run_id`, `card_id`, primary key `pk_run_counted_card` on both, each `ON DELETE CASCADE`, index `ix_run_counted_card_card_id`), and write each run's rows as the distinct cards of its `run_card` rows (ADR 122).
  8. Create `uq_run_practice_id_active` on `run (practice_id) WHERE status = 'active'` and `ix_run_practice_id` on `run (practice_id, last_activity_at)`.

  Its downgrade must raise. Applied migrations keep their names.
- The models must follow the schema: `Practice` and `PracticeConfiguration` new; `Run`, `RunConfiguration`, `RunCard` and `RunCountedCard`; `MasteryLog.run_id`. `Run` has no `name` and no `user_id`, and carries `last_activity_at`. Every name in the code in which "practice" or "session" means one go through a practice must become "run", in models, `db_*` functions, services, routes, payloads, tests and the frontend: `PracticeRun` to `Run`, `PracticeCard` to `RunCard`, `PracticeDeck` to `RunConfiguration`, `practice_card_id` to `run_card_id`, `generate_practice_card_fields` to `generate_run_card_fields`, `session_status` to `status`, and the like. "Practice" stays only for the thing the user keeps. The renames, every one of them, across `app/`, `tests/`, `frontend/src/`, the vocabulary's Code cells, `AGENTS.md` and `README.md`:
  - Models and payloads: `PracticeRun` to `Run`, `PracticeRunRead` to `RunRead`, `PracticeCard` to `RunCard`, `PracticeCardRead` to `RunCardRead`, `PracticeCardStatus` to `RunCardStatus`, `PracticeDeck` to `RunConfiguration`, `PracticeRunState` to `RunState`, `PracticeRunBreakdown` to `RunBreakdown`, `PracticeRunChosenCards` to `RunChosenCards`; `PracticeRunCreate`, `PracticeRunRerun`, `PracticeRunSummary`, `PracticeRunDeckSummary` and `HomeActivePractice` go, replaced by the payloads below; `app/models/practice_run_payloads.py` to `app/models/run_payloads.py`.
  - Fields and columns: `practice_run_id` to `run_id`, `practice_card_id` to `run_card_id`, `practice_card_ids` to `run_card_ids`, `rated_practice_card` to `rated_run_card`, `requeued_practice_card` to `requeued_run_card`, `active_practices` to `active_runs`, `session_status` to `status`; `session_name` goes.
  - Functions: every `db_*` function's `practice_run` to `run`, `practice_card` to `run_card` and `practice_deck` to `run_configuration`, as `db_read_practice_cards_for_run` to `db_read_run_cards_for_run` and `db_read_active_practice_runs_with_decks` to `db_read_active_runs_with_decks`; `db_stage_set_practice_deck_source_config_name`, `db_stage_unlink_practice_decks_from_config` and `db_delete_practice_run` go; `start_practice_run` to `start_run`, `rerun_practice_run` to `rerun`, `start_chosen_cards_run` to `start_chosen_cards`, the three cutting through `cut_run`; `get_practice_run_state` to `get_run_state`, `get_practice_run_breakdown` to `get_run_breakdown`, `get_current_practice_card` to `get_current_run_card`, `generate_practice_card_fields` to `generate_run_card_fields`; `app/services/practice_generation.py` and `app/database_ops/practice_generation.py` to `run_generation.py`; each route handler after its path, as `read_run_state` and `rate_run_card`, and `api_practice_run_router` to `api_run_router` beside a new `api_practice_router`; `ACTIVE_PRACTICE_LIMIT` to `ACTIVE_RUN_LIMIT`; `decks_by_session` to `decks_by_run`.
  - Frontend: the run's components move from `frontend/src/components/practice/` to `frontend/src/components/run/`, as Files lists them, `PracticeRunRow` becoming `RunRow` and `PracticeStatusBadge` `RunStatusBadge`, and `components/practice/` keeps only what shows a practice; `PracticeRunPage` to `RunPage`, its `PracticeRunBody` to `RunBody` and `PracticeCardView` to `RunCardView`; `SessionDeckChips` to `DeckChips`; `practiceCopy.ts` to `runCopy.ts`; `HomePage`'s `ActivePractices` to `ActiveRuns`; `practiceThese` to `rerunThese`; `practiceSessionId` and `sessionId` to `runId`, `practiceCardId` to `runCardId`; the api functions `createPracticeRun` to `startRun`, `readPracticeRun` to `readRun`, `readPracticeRunState` to `readRunState`, `readPracticeRunBreakdown` to `readRunBreakdown`, `rerunPracticeRun` to `rerunRun` and `ratePracticeCard` to `rateRunCard`, `readPracticeRuns`, `deletePracticeRun` and `PracticeRunFilters` going; the query keys `['practice_runs', …]`, `['practice_run', id]`, `['practice_run_summary', id]` and `['practice_run_breakdown', id]` to `['practices']`, `['run', id]`, `['practice', id]` and `['run_breakdown', id]`.
  - A local name `session`, `sessions`, `new_session`, `sessionQuery` or the like that holds a run becomes `run`, `runs`, `new_run`, `runQuery`, in production code and tests alike.
  - These keep their names, since "session" or "practice" means something else in them: `Session`, `SessionDep` and `get_session`, the database's session; `verify_clerk_session`, Clerk's; `first_practice_at`, `db_stage_set_first_practice_at` and `FirstPracticeSteps`, the first practice the user creates; `PRACTICE_NAV`, `PracticeOverviewPage`, `PracticeDetailsPage` and `PracticeCreatePage`, which show practices.
- Every read and write of a run, or of a row that hangs from a run, must be scoped by joining `practice` and comparing `practice.user_id` in the statement (ADR 105); another user's practice or run is a 404 (ADR 034).
- `uuid`, `date` and `datetime` are the payload types below; `date` is a calendar date with no time.

The API. Payloads in `app/models/practice_payloads.py` and `app/models/run_payloads.py`:

```python
class PracticeCreate(AppModel):
    # None or blank after stripping: the practice takes suggest_practice_name's name.
    name: str | None = None
    # In the order the user picked them; at least one.
    deck_ids: list[uuid.UUID]

class DeckNameRead(AppModel):
    deck_id: uuid.UUID
    deck_name: str

class RunRead(AppModel):
    id: uuid.UUID
    practice_id: uuid.UUID
    status: RunStatus
    # The date of created_at in the user's stored zone (ADR 114).
    day: date
    # 0 for the practice's first run of that day, by created_at then id.
    day_index: int
    created_at: datetime
    last_activity_at: datetime

class PracticeSummary(AppModel):
    id: uuid.UUID
    name: str
    created_at: datetime
    # Most recently changed deck first (PDR 047).
    decks: list[DeckNameRead]
    # The practice's active run, or None.
    active_run_id: uuid.UUID | None

class PracticeDetail(PracticeSummary):
    # Newest last_activity_at first, then id (ADR 117).
    runs: list[RunRead]

class SuggestedPracticeName(AppModel):
    name: str

class RunState(AppModel):
    practice_id: uuid.UUID
    practice_name: str
    day: date
    day_index: int
    status: RunStatus
    progress: RunProgress
    current_card: CurrentRunCard | None

class RunChosenCards(AppModel):
    card_ids: list[uuid.UUID]
```

- Paths, each scoped to the user: `POST /api/practices` (`PracticeCreate`, 201, `PracticeSummary`); `GET /api/practices` (`list[PracticeSummary]`, ordered by the latest `last_activity_at` of the practice's runs, or its `created_at` with none, descending, then id, ADR 117); `GET /api/practices/suggested-name?deck_ids=` (`SuggestedPracticeName`); `GET /api/practices/{id}` (`PracticeDetail`); `POST /api/practices/{id}/runs` (200, `RunRead`, the practice's active run or a new one, ADR 110); `GET /api/runs/{id}` (`RunRead`); `GET /api/runs/{id}/state` (`RunState`); `GET /api/runs/{id}/breakdown` (the breakdown, renamed `RunBreakdown`); `POST /api/runs/{id}/rerun` (no body, 201, `RunRead`); `POST /api/runs/{id}/chosen_cards` (`RunChosenCards`, 201, `RunRead`); `POST /api/run_cards/{id}/rate` (the rating body as today). `/api/practice_runs…`, `/api/practice_cards…` and `/api/deck_practice_configs…` go, and no route deletes a single run (ADR 118).
- `POST /api/practices` must refuse a missing deck or one not the user's with a 404 naming it, a repeated deck id with a plain-string 400 from the `IntegrityError` on `UNIQUE (practice_id, deck_id)`, with no check of its own (ADR 107), and a taken name with `Refusal("practice_name_taken")` from an `IntegrityError` on `uq_practice_user_id`, answered as a 400 with the coded detail (ADR 115); a create with no name whose second try at the name also meets the constraint is refused with `practice_name_taken` too. `GET /api/practices/suggested-name` answers a deck not the user's with a 404 naming it. It must write `app_user.first_practice_at` while it is null, in the practice's own transaction; starting a run writes nothing to it (ADR 123).
- `suggest_practice_name(db, user_id, deck_ids)` in `app/services/practice.py` must return the decks' names in the order given joined by " + ", with the first free number from 1 added in parentheses, as "Ports (1)", when that name is taken. A create with no name calls it inside its transaction, and when `db_try_stage_create_practice` returns `None` on the name, works the name out once more (ADR 115).
- Creating a practice must give each picked deck, in one statement over the picked decks, a `practice_configuration` copied from the `run_configuration` of the run holding the deck's most recently rated card, found through the latest `review_log.reviewed_at` over the deck's cards, its `review_group_id` and that `run_card`'s run, with `card_ids` ignored; a deck never rated, or whose copy fails `validate_configuration`, takes the starting configuration (ADR 109). The starting configuration is one function in `app/services/practice_configuration.py`, shared with the deletion closure's reset (ADR 119): the deck's first live field by position always shown on the prompt side, every other live field always shown on the answer side:

```python
def starting_configuration(live_field_ids: list[uuid.UUID]) -> dict[str, list]:
    """The six array and count columns, keyed by column name, for a deck whose live field ids are given in position order."""
```
- `validate_configuration` keeps the four rules of ADR 109 and lives in `app/services/practice_configuration.py`; at the cut a violation raises an `AssertionError`. `config_not_found`, `duplicate_deck`, `stale_config` and `nothing_to_rerun` go, with their frontend sentences.
- Every run must be cut by one function, `cut_run(db, strategy, practice, card_ids=None) -> Run` in `app/services/run.py`, for starting a practice, a re-run and a run of chosen cards (ADR 112): for each `practice_configuration` of the practice it validates the configuration, copies it into a `run_configuration` with `card_ids` null for a whole run or that deck's chosen cards for a run of chosen cards, empty for a deck that holds none, generates the deck's cards, and writes one `run_counted_card` per card the copies could ask, judged by the same askability test generation uses, held in one function both call (ADR 113), and written by `db_stage_create_run_counted_cards(db, run_id, card_ids)` in `app/database_ops/run_counted_card.py`:

```python
def card_is_askable(values: Mapping[uuid.UUID, str], configuration: RunConfiguration) -> bool:
    """Whether a card with these values, by field id, has a non-blank value among the fields each side of the configuration names."""
``` A run that writes no `run_card` is refused with `no_cards`, writing nothing. A re-run and a run of chosen cards of a run that is itself active are refused with `run_active`, and otherwise with `practice_has_active_run` while the practice has an active run, both before anything is cut; the completed run supplies only the chosen cards, each checked to be one of its cards (ADR 110, ADR 112).
- Starting a practice must, in one transaction, read its active run, complete it when it has no pending card, return it while it is still active, and otherwise create one through `db_try_stage_create_run`, reading the concurrent start's run when that returns `None` (ADR 110).
- `touch()` takes `Deck | Card | Run`; a run is touched when cut, on every rating in it, and on nothing else in this task (ADR 117). `DeckPracticeConfig` leaves `touch()`.
- Every read that returns a run must return `day` and `day_index`, worked out in its `db_*` read by one window function over the practice's runs (ADR 114).
- The deletion closure must plan the practices that hold a deleted deck and drop configuration deletion: `DeletionImpact` gains `practice_ids` and loses `configuration_ids`; an explicitly deleted field leaves every practice's configuration of its deck as ADR 119 gives, a configuration left with a side naming no field taking the deck's starting configuration whole, and leaves every remaining run copy of the deck pruned with no reset. `DeletionImpactRead` loses `configurations_deleted` and gains `practices_affected: int`.
- Home's read must keep its shape but for the run: `HomeRead` becomes `steps`, `active_runs: list[HomeRun]` with `HomeRun(RunRead)` adding `practice_name: str`, `decks: list[DeckNameRead]` and `progress: RunProgress`, up to three active runs, newest `last_activity_at` first, and `recent_decks` as today, read over the new tables, each deck row's Practice opening `/practices`.
- Regenerate `frontend/src/api/openapi.json` and `frontend/src/api/types.ts` with `npm run gen:api`.
- `frontend/src/api/practice.ts` must offer `createPractice(payload)`, `readPractices()`, `readPractice(practiceId)`, `readSuggestedPracticeName(deckIds)` and `startRun(practiceId)`, and `frontend/src/api/run.ts` `readRun(runId)`, `readRunState(runId)`, `readRunBreakdown(runId)`, `rerunRun(runId)`, `startChosenCards(runId, cardIds)` and `rateRunCard(runCardId, ratings)`, each unwrapping its response as the api modules do today.
- `frontend/eslint.config.js`'s rule messages must stop naming `formatDate` and `formatDateTime`; `unwrap.ts`'s handling and comments for `config_id` go; `ConfirmDialog.tsx`'s comment stops naming a practice's delete.

The frontend, each page in its least working form; T2 to T5 bring the four practice screens to their drawings:

- `App.tsx` must route `/practices` to `PracticeOverviewPage`, `/practices/new` to `PracticeCreatePage`, `/practices/:practiceId` to `PracticeDetailsPage` and `/runs/:runId` to `RunPage`; every `/practice…` and `/deck-configurations…` route goes. Every link and navigation in Files follows.
- `PracticeOverviewPage` must list every practice from `GET /api/practices`, one row each, its name linking to `/practices/:practiceId`, with "Add practice" opening `/practices/new` with its own `cancelTo`; its tabs and filters go.
- `PracticeDetailsPage` must read `GET /api/practices/{id}` under the query key `['practice', practiceId]` and show the practice's name, its decks' names, a button reading "Start run" with no active run and "Continue run" with one, which calls `POST /api/practices/{id}/runs` and opens `/runs/:runId`, and one row per run linking to `/runs/:runId`, each its day as `formatRunDay` writes it and its Active or Completed badge. A refusal of Start run shows its sentence beside the button.
- `PracticeCreatePage` must ask for Name and the decks alone, the decks picked through `DeckPicker` and listed beneath with a way to remove each, and send `PracticeCreate`; Create lands on the new practice's page through `useLeaveForm`, and Cancel leaves through it for `cancelTo`, else `/practices`. The picked decks, in the order picked, and a typed name must stay in the page's URL, as one `deck` parameter per pick and a `name` parameter, written through `useViewParams`, so a refresh keeps them; the picker's "New deck…" opens New deck with the page's own address as `cancelTo` and `returnTo`, and the new deck's id it brings back is added to the picks.
- `DeckDetailPage` must list the deck's cards and nothing else beside its heading, pencil and Add card: its tabs, its Configurations tab and its Practice button go.
- `RunPage` must read `GET /api/runs/{id}/state` under the query key `['run', runId]`, name the practice in its breadcrumb as "All practices › <practice name>", the practice linking to `/practices/:practiceId`, and title the browser tab with the practice's name. Its summary, Re-run and "Practice these" work as today on the new paths, and its completed view's "Done" opens the practice's page: Re-run and "Practice these" start the run at once, with no confirm, and open `/runs/:newRunId`.
- `frontend/src/lib/datetime.ts` must offer `formatRunDay(day: string, dayIndex: number): string`, writing `day` as the server sends it and adding " (N)" when `dayIndex` is above 0, never parsing `day` into a `Date`; `formatDate` and `formatDateTime` are removed, and `userTimeZone()` and the ESLint rule stay (ADR 114).
- Home must read the renamed payload: each active row names its run's practice, links to `/practices/:practiceId`, and its Start practice continues `/runs/:runId`; a recently practiced deck's Practice opens `/practices`.
- `PracticeFilterBar` goes, since the Practice page and New practice drop their filters.
- `deckConfigurationBoard.ts` must stop reading `DeckPracticeConfigCreate`, which leaves the schema: `ConfigPayloadArrays` is written out in the module as the six arrays, `prompt_field_ids`, `answer_field_ids`, `prompt_pool_ids` and `answer_pool_ids` as `string[]` and `prompt_pool_counts` and `answer_pool_counts` as `number[]`, and `boardFromConfig` takes it.
- `failureSentence` must take an optional map of sentences by code, for a control whose sentence for a code differs from the app's:

```ts
export function failureSentence(error: unknown, notFound: string, byCode?: Partial<Record<string, string>>): string;
```

  It must give `practice_has_active_run` "Finish the active run first.", `practice_name_taken` "A practice with this name already exists." and `no_cards` "This run would have no cards. Either the practice's decks have no cards, or every card is blank in every field one side shows.", the sentence beside Start run and Re-run; "Practice these" passes `{ no_cards: "These cards can't be run. Each is blank in every field one side shows." }`. `nothing_to_practice` goes with `nothing_to_rerun`, every run that writes no card being refused with `no_cards` (ADR 112).
- The deck delete confirm must read "This also deletes N cards, N fields and N runs, and takes the deck out of N practices. This can't be undone.", each count present only above zero; the save that removes fields reads "This removes N fields from N cards, deletes N cards and deletes N active runs. This can't be undone."
- `AGENTS.md` and `README.md` must carry every rename and path this task makes, `submit_rating` in `app/services/run.py` among them, and `README.md` must describe a practice as a kept set of decks run many times and a run as one go through it.
- Tests: `tests/api_tests/test_practices.py` covers create with a typed name, with no name taking the suggestion, a taken name refused, a repeated deck refused, another user's deck a 404, each deck's configuration copied from its last rated run or the starting one, `first_practice_at` written once, start creating a run and then continuing it, two concurrent starts landing on one run, and the order of `GET /api/practices`; `test_runs.py` covers the cut writing counted cards, `no_cards`, `practice_has_active_run` on a re-run and a run of chosen cards, a re-run cut from the practice's configurations as they stand, and the run's `day` and `day_index` across a zone change; every other test in Files is brought to the new tables and paths.

The vocabulary, `docs/vocabulary.md`, each row's columns as given, every other column as it stands:

- "Accepting a warning": Where New card.
- "Switching the deck a form is filling in": Where New card.
- "The deck page's tabs", "The Configurations tab's toolbar label", "Practicing a deck", "Adding a configuration to the list in view", "Leaving New practice to make a configuration", "The page where a configuration is made", "A configuration's row", "A configuration's suggested name", "A configuration name already taken", "New configuration with a blank name", "Edit configuration with a blank name", "Switching the board's deck", "Confirming a configuration's deletion", "What deleting a configuration leaves alone", "A chosen configuration deleted since it was chosen", "A chosen configuration that yields no prompts", "Two chosen configurations of one deck", "The chosen configurations will not load", "Confirming a re-run", "What a re-run makes" and "A re-run that nothing survives": User reads "—"; Where "—".
- "The Cards tab's toolbar label": Concept "The deck page's toolbar label".
- "A deck with no cards", "Adding a card to the list in view" and "A blank value": Where Deck page.
- "Deleting a subject or deck that takes other things with it, each count present only above zero", as the row stands after cycle 046: Concept "Deleting a deck that takes other things with it, each count present only above zero"; User reads "This also deletes N cards, N fields and N runs, and takes the deck out of N practices. This can't be undone."; Where Edit deck.
- "What a save that removes fields takes with it": User reads "This removes N fields from N cards, deletes N cards and deletes N active runs. This can't be undone."
- "A named set of decks the user keeps and runs as many times as they like": Where All practices; New practice; Edit practice; a practice's page; Home.
- "One sitting of a practice, from its first card until it ends": Concept "One go through a practice, from its first card until it ends"; User reads "run"; "Runs" over a practice's runs; Where a practice's page; the run page; a completed run's page; Home.
- "Starting a practice's run, or continuing its active one": User reads "Start run" while no run is active; "Continue run" while one is; Where a practice's page, as its main action.
- "The copy of each configuration a practice takes at start": Concept "The copy of how the practice asks each deck that a run takes at start".
- "A practice that would have no cards": Concept "A run that would have no cards"; User reads "This run would have no cards. Either the practice's decks have no cards, or every card is blank in every field one side shows."; Where a practice's page, after Start run; a completed run's page, after Re-run or Re-run these; Home, after a play button.
- "A practice of chosen cards that nothing survives": Concept "A run of chosen cards that would have no cards"; User reads "These cards can't be run. Each is blank in every field one side shows."; Where a completed run's page, under Re-run these.
- A new row in the Practice area: Concept "Starting a next run while one is active"; User reads "Finish the active run first."; Where a completed run's page, under Re-run or Re-run these.
- A new row in the Practice area: Concept "A practice name already taken"; User reads "A practice with this name already exists."; Where New practice; Edit practice; under Name; Code `practice_name_taken`.
- A new row in the Run area: Concept "A run's day"; User reads the day it was run, as "2026-11-03"; a later run of one day adds the next number, as "2026-11-03 (1)"; Where Home, in a run's block; a practice's page, under "Runs"; a completed run's page, its heading; Code `day`; `day_index`; `formatRunDay`.
- "A run that can still be continued": User reads "active"; "Active" as badge and as Home's section; Where a practice's page, under "Runs"; Home.
- "A run that has finished": User reads "completed"; "Completed" as badge; "Recently completed" as Home's section; Where a practice's page, under "Runs"; a completed run's page; Home.
- "The page a practice runs on": Concept "The page a run runs on"; User reads no heading of its own; its practice named in the row of places.
- "The practice's progress, a wordless bar, spoken": Concept "A run's progress, a wordless bar, spoken".
- A row whose User reads and Where both read "—" must keep in its Code cell only the names the code still gives its concept, and must leave the file once none is left. Every Code cell must follow every name and path this task renames or deletes.

**Out of scope**

- New practice's suggested name in grey, its "Choose decks" search and "N selected": T2.
- All practices' filter by deck, its rows' decks and circle, and the practice mark: T3.
- Edit practice, renaming and deleting a practice: T4.
- A practice's page's circle, pencil, deck lines and run rows as drawing 4-practice draws them, the run mark and "N of M cards": T5.
- `PUT /api/practices/{id}/configurations/{deck_id}` and the board as a form: cycle 050.
- `POST /api/runs/{id}/end`, the completed run's page's heading, count and deck lines, and the summary's words: cycle 051.
- Home's runs, its play buttons and `recent_runs`: cycle 052.
- A refusal of a practice's save of its board while a run is active: never, ADR 107.
- `FieldAssignmentBoard` and `frontend/src/lib/deckConfigurationBoard.ts`, which stay with no user until cycle 050 builds the board on them: never deleted here.

**Done when**

- `uv run alembic heads` prints one revision, this task's, followed by `(head)`.
- With `R` the count of `practice_run` rows, `D` the count of `practice_deck` rows and `C` the count of distinct `(practice_run_id, card_id)` pairs of `practice_card`, each read before the upgrade: after `alembic upgrade head` on the dev database, `psql "$DATABASE_URL" -tAc "select (select count(*) from practice), (select count(*) from run), (select count(*) from practice_configuration), (select count(*) from run_counted_card), to_regclass('deck_practice_config') is null, to_regclass('practice_run') is null"` prints `R|R|D|C|t|t`.
- `uv run pytest tests/api_tests/test_practices.py tests/api_tests/test_runs.py tests/api_tests/test_practice_configuration.py tests/api_tests/test_deletion.py tests/api_tests/test_home.py tests/api_tests/test_auth_scoping.py tests/api_tests/test_schema_guard.py tests/api_tests/test_layering_guard.py -q` passes.
- `git grep -nE "practice_run|practice_card|practice_deck|deck_practice_config|PracticeRun|PracticeCard|PracticeDeck|practiceSession|sessionId|session_name|session_status|SessionDeckChips|PracticeStatusBadge|practiceCopy|practice_generation|active_practices|ActivePractices|practiceThese|practiceCardId|formatDateTime" -- app tests frontend/src AGENTS.md README.md` prints nothing, and `ls frontend/src/components/practice` prints `DeckChips.tsx` alone.
- On the live server at 390 wide: New practice with a name and two decks lands on the new practice's page; Start run opens the run page on a card, its breadcrumb reading "All practices › <practice>"; the practice's page then reads Continue run and lists the run; a deck's page shows no tabs and no Practice button.

**Debrief**

None.

### T2 — New practice

**Status**

- [ ]

**Goal**

New practice reads as drawing 8 draws it: its heading, Name with the suggested name in grey, "Choose decks" with its search and the picked decks beneath each with its cross, and the bar's Cancel, "N selected" and Create, greyed until a deck is picked.

**Dependencies**

- T1: `POST /api/practices`, `GET /api/practices/suggested-name` and `practice_name_taken`.

**Files**

- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`
- `frontend/src/api/practice.ts`
- `frontend/src/test/practice.test.ts`
- `docs/vocabulary.md`

**Details**

Drawing 8, under ADR 115 and PDR 051:

- The page must read, top to bottom: the heading "New practice"; Name, an empty input showing in grey, as its placeholder, the suggested name from `GET /api/practices/suggested-name?deck_ids=` for the decks picked, in the order picked, read through TanStack Query keyed by those ids, and blank while none is picked; "Choose decks", with its search, placeholder and spoken name "Search decks", opening a list spoken "Decks", each row a deck's name with its mark and "New deck…" as the last row; then the picked decks beneath, flat, each its mark, its name and "N cards · N fields" beneath, with a cross spoken "Remove <name>". The bar at the foot holds Cancel, "N selected" once a deck is picked, and Create, greyed and not ready while no deck is picked.
- A name the user has typed must stay whatever they pick afterwards; Create sends the typed name, or none when Name is blank.
- "New deck…" must open New deck with both return addresses, so Create there brings the user back with the new deck picked.
- `practice_name_taken` must render "A practice with this name already exists." beside Name and be revealed through `FormPart` and `SubmitButton`, as `DeckEditor` reveals a taken name.
- Tests: the grey suggestion follows picks and removals; a typed name survives a later pick; Create is not ready with no deck; a taken name shows beside Name.
- `docs/vocabulary.md`, each row's columns as given:
  - "A new practice's name": Concept "A new practice's suggested name"; User reads its decks' names in the order picked, joined by " + ", in grey inside Name, as "Commands + Ports"; a name another practice already has, with the next untaken number in parentheses, as "Ports (1)"; Where New practice.
  - "The chosen configurations": Concept "The chosen decks"; User reads "Choose decks"; "Search decks", spoken, on its search; "Decks", spoken, on the list it opens, each row a deck's name alone and "New deck…" as the last row; each picked deck beneath with its cross; "Remove <name>", spoken; "N selected", in the bar at the foot between Cancel and Create, once a deck is picked; Where New practice.
  - "New practice with a blank name" and "New practice with nothing chosen": User reads "—"; Where "—".

**Out of scope**

- Each deck's board on New practice: never.
- A name wrapping in the picked decks: cycle 053.

**Done when**

- `cd frontend && npx vitest run src/pages/PracticeCreatePage.test.tsx src/test/practice.test.ts` passes.
- On the live server at 390 wide, New practice reads as drawing 8's three screens: empty with Name's hint blank and Create greyed; the deck list open from "Choose decks"; and with Commands then Ports picked, Name's grey hint "Commands + Ports", "2 selected" and Create live.

**Debrief**

None.

### T3 — All practices

**Status**

- [ ]

**Goal**

All practices reads as drawing 15 draws it, every practice a row of its mark, its name, its circle and its decks, narrowed by deck, and named "All practices" in the side menu, and a practice's name on All practices and in the run page's row of places carries the practice mark.

**Dependencies**

- T2: `docs/vocabulary.md` as T2 leaves it.

**Files**

- `app/models/practice_payloads.py`
- `app/database_ops/mastery_log.py`
- `app/services/mastery.py`
- `app/services/practice.py`
- `app/routers/api/practice.py`
- `tests/api_tests/test_practices.py`
- `tests/api_tests/test_mastery.py`
- `frontend/src/api/openapi.json`
- `frontend/src/api/types.ts`
- `frontend/src/components/ui/PracticeMark.tsx` (new)
- `frontend/src/components/ui/PracticeMark.test.tsx` (new)
- `frontend/src/components/practice/DeckLine.tsx` (new)
- `frontend/src/components/practice/DeckLine.test.tsx` (new)
- `frontend/src/components/practice/DeckChips.tsx` (deleted)
- `frontend/src/pages/PracticeOverviewPage.tsx`
- `frontend/src/pages/PracticeOverviewPage.test.tsx`
- `frontend/src/pages/RunPage.tsx`
- `frontend/src/pages/RunPage.test.tsx`
- `frontend/src/pages/HomePage.tsx`
- `frontend/src/pages/HomePage.test.tsx`
- `frontend/src/pages/PracticeDetailsPage.tsx`
- `frontend/src/pages/PracticeDetailsPage.test.tsx`
- `frontend/src/components/run/RunRow.tsx`
- `frontend/src/components/shell/navItems.ts`
- `frontend/src/components/shell/TopBar.test.tsx`
- `frontend/src/components/shell/SideDrawer.test.tsx`
- `docs/vocabulary.md`

**Details**

PDR 045, PDR 046, PDR 049 and drawing 15, under ADR 116:

- `PracticeSummary` must gain `readiness: float | None`, the practice's readiness, None when its decks hold no card, read for every requested practice in one statement, `db_fetch_practice_mastery_read_rows`, each row owned by its practice through `practice_configuration`, and folded in `practice_readiness` through `_fold_collections` (ADR 116). `PracticeDetail` carries it too.
- `PracticeMark` must draw drawing 15's flash: the path `M13 2 3 14h9l-1 8 10-12h-9l1-8z` on a 24 by 24 view box, stroke `currentColor` at width 2 with round caps and joins, no fill, `role="img"`, `aria-label="Practice"`, inline before the name and sized to its text as `DeckMark` is.
- `DeckLine` must write several decks in one line, each its `DeckMark` and name, joined by " · ", as "Commands · Ports"; it replaces `DeckChips`.
- All practices must read as drawing 15: the heading "All practices", "Add practice", the filter "All decks" through `DeckPicker` narrowing the rows to the practices holding the chosen deck, client-side over the whole list `GET /api/practices` returns, the chosen deck kept in the URL's `deck` parameter (PDR 017); then one row per practice in the order received, its `PracticeMark` and name, its circle at the right when it has a readiness, and its decks beneath as `DeckLine` writes them; tapping the row opens the practice's page. A row shows no progress, no date and no play button. "No practices yet." stands with none, and "No practices match these filters." with "Clear filters" when the filter empties the list.
- The side menu's place must read "All practices".
- The run page's breadcrumb must show the practice's name after its `PracticeMark`, as "All practices › " then the mark and the name. Home's active rows keep naming their practice with no mark, since cycle 052 redraws them, and write their decks through `DeckLine`, which replaces `DeckChips` there and everywhere else it stands, `RunRow` and `PracticeDetailsPage` included. A recently practiced deck's Practice on Home opens `/practices?deck=<deck id>`.
- Tests: practice readiness over two decks of different sizes weighs each card once, and is None with no card; the filter narrows and clears; the row carries the mark, the decks and the circle.
- `docs/vocabulary.md`, each row's columns as given:
  - "A list its filters empty": Where All practices.
  - "The main places": User reads "Home"; "Your library"; "All practices".
  - "A thing's address, widest place first": Concept "Several decks named in one line"; User reads each deck's name with its mark, joined by " · ", as "Commands · Ports"; Where a run's row on Home; All practices' rows.
  - "The page listing every practice the user has": User reads "All practices"; Where Its heading; side menu; Home's foot; the row of places.
  - "Adding a practice to the list in view": Where All practices' header.
  - "Narrowing practices by state": User reads "—"; Where "—".
  - A new row in the Practice area: Concept "A practice's mark"; User reads a flash of lightning, drawn as an outline in the color of the words beside it; "Practice", spoken; Where beside every practice's name, never beside the word "practice"; Code `PracticeMark`.

**Out of scope**

- A name wrapping to two lines and shortened after that, in drawing 15: cycle 053.
- A practice's page: T5.
- Home's runs and the run's block on its rows: cycle 052.

**Done when**

- `uv run pytest tests/api_tests/test_practices.py tests/api_tests/test_mastery.py -q` passes.
- `cd frontend && npx vitest run src/components/ui/PracticeMark.test.tsx src/components/practice/DeckLine.test.tsx src/pages/PracticeOverviewPage.test.tsx src/pages/RunPage.test.tsx` passes.
- On the live server at 390 wide, All practices reads as drawing 15, and choosing a deck in its filter leaves only the practices holding it.

**Debrief**

None.

### T4 — Edit practice

**Status**

- [ ]

**Goal**

Edit practice, reached at `/practices/:practiceId/edit`, renames a practice and deletes it, as drawing 4-edit draws it, a taken name refused beside Name and a deletion taking the practice's runs and leaving the user's mastery.

**Dependencies**

- T3: `docs/vocabulary.md` as T3 leaves it.

**Files**

- `app/models/practice_payloads.py`
- `app/database_ops/practice.py`
- `app/services/practice.py`
- `app/routers/api/practice.py`
- `tests/api_tests/test_practices.py`
- `tests/api_tests/test_auth_scoping.py`
- `frontend/src/api/openapi.json`
- `frontend/src/api/types.ts`
- `frontend/src/api/practice.ts`
- `frontend/src/test/practice.test.ts`
- `frontend/src/App.tsx`
- `frontend/src/pages/PracticeEditPage.tsx` (new)
- `frontend/src/pages/PracticeEditPage.test.tsx` (new)
- `frontend/src/test/formParts.test.ts`
- `docs/vocabulary.md`

**Details**

Drawing 4-edit, under ADR 115, ADR 118, ADR 124 and PDR 051:

```python
class PracticeUpdate(AppModel):
    name: str
```

- `PATCH /api/practices/{id}` (`PracticeUpdate`, 200, `PracticeSummary`) must rename the practice, refuse a taken name with `practice_name_taken` from the constraint, and touch nothing, so the practice stays where it was in every list (PDR 047).
- `DELETE /api/practices/{id}` (204) must call a committing `db_delete_practice`, one `DELETE` scoped to the user whose cascades remove the practice's configurations and runs with their copies, card rows and counted cards, set `mastery_log.run_id` null and leave `review_log` alone; it does not go through the deletion closure (ADR 118).
- Edit practice must read as drawing 4-edit: the heading "Edit practice", Name holding the practice's name, then "Delete practice"; the bar at the foot holds Cancel and Save. A blank Name is "Name is required." beside Name, and `PATCH` refuses a blank name with a plain-string 400 no screen reaches. A taken name shows "A practice with this name already exists." beside Name. Edit practice asks nothing before Cancel leaves with unsaved changes, being none of the forms that ask. Name and Save are drawn through `FormPart` and `SubmitButton`, and `frontend/src/test/formParts.test.ts`'s list of forms gains `PracticeEditPage.tsx`.
- Delete practice must ask "Delete this practice?" over "Its runs will be gone. Its decks and your mastery stay as they are.", with Cancel and Delete; on Delete it deletes the practice and leaves through `useLeaveForm` for `/practices`.
- Save and Cancel must leave through `useLeaveForm`: Cancel to `cancelTo`, else the practice's page; Save to `returnTo`, else the practice's page.
- Tests: a rename moves no practice in `GET /api/practices`; a taken name is refused; deleting a practice deletes its runs and leaves every card's readiness as it was; another user's practice is a 404 on both paths.
- `docs/vocabulary.md`, each row's columns as given:
  - A new row in the Practice area: Concept "The page where a practice is changed"; User reads "Edit practice"; Where Its heading; Code `/practices/:practiceId/edit`; `PracticeEditPage`; `PATCH /api/practices/{id}`.
  - A new row in the Practice area: Concept "Deleting a practice"; User reads "Delete practice"; Where Edit practice; Code `DELETE /api/practices/{id}`.
  - "Confirming a practice's deletion": Where Edit practice.
  - "What deleting a practice takes and leaves": User reads "Its runs will be gone. Its decks and your mastery stay as they are."; Where Edit practice.
  - "A name left blank": Where New deck, under Deck name and under a field's name; Edit deck, under Deck name and under a field's name; Edit practice, under Name.
- `frontend/src/api/practice.ts` gains `renamePractice(practiceId, name)` and `deletePractice(practiceId)`.

**Out of scope**

- The pencil that opens Edit practice: T5.
- Deleting a single run: never, ADR 118.

**Done when**

- `uv run pytest tests/api_tests/test_practices.py tests/api_tests/test_auth_scoping.py -q` passes.
- `cd frontend && npx vitest run src/pages/PracticeEditPage.test.tsx src/test/practice.test.ts` passes.
- On the live server at 390 wide, `/practices/<id>/edit` reads as drawing 4-edit; Save with a new name lands on the practice's page under that name; Delete practice and Delete land on All practices, without the practice.

**Debrief**

None.

### T5 — A practice's page

**Status**

- [ ]

**Goal**

A practice's page reads as drawing 4-practice draws it: its mark, name and circle, "Start run" or "Continue run" in yellow beside the pencil to Edit practice, a line per deck, and every run under "Runs" as its mark and day, its badge and "N of M cards".

**Dependencies**

- T3: `PracticeMark` and `readiness` on `PracticeDetail`.
- T4: `/practices/:practiceId/edit`.

**Files**

- `app/models/run_payloads.py`
- `app/models/practice_payloads.py`
- `app/database_ops/run.py`
- `app/services/practice.py`
- `tests/api_tests/test_practices.py`
- `tests/api_tests/test_runs.py`
- `frontend/src/api/openapi.json`
- `frontend/src/api/types.ts`
- `frontend/src/components/ui/RunMark.tsx` (new)
- `frontend/src/components/ui/RunMark.test.tsx` (new)
- `frontend/src/components/run/RunRow.tsx`
- `frontend/src/components/run/RunRow.test.tsx` (new)
- `frontend/src/components/run/RunStatusBadge.tsx`
- `frontend/src/pages/PracticeDetailsPage.tsx`
- `frontend/src/pages/PracticeDetailsPage.test.tsx`
- `docs/vocabulary.md`

**Details**

PDR 040, PDR 046 and drawing 4-practice, under ADR 113 and ADR 114:

```python
class RunListing(RunRead):
    # N: distinct card_id among the run's run_card rows that are not pending.
    reached_cards: int
    # M: the run's run_counted_card rows.
    counted_cards: int
```

- `PracticeDetail.runs` must become `list[RunListing]`, both counts read for every run of the practice in one grouped statement (ADR 113, ADR 091).
- `RunMark` must draw drawing 4-practice's run mark: a circle of radius 10.5 at the centre of a 24 by 24 view box with the flash path `M13 5 7 13h5l-1 6 6-8h-5l1-6z` at stroke width 1.8 inside it, stroke `currentColor` with round caps and joins, no fill, `role="img"`, `aria-label="Run"`, sized to the text beside it as `DeckMark` is.
- The page must read as drawing 4-practice, under the row of places "All practices": the heading, the practice's `PracticeMark` and name, its circle at the far right when it has a readiness; beneath, the main action in yellow reading "Continue run" while a run is active and "Start run" when none is, with the pencil spoken "Edit <name>" beside it opening Edit practice with its own address as `cancelTo` and `returnTo`; then one line per deck, its `DeckMark` and name; then "Runs" and one `RunRow` per run, most recent first, each its `RunMark` and day in ink as `formatRunDay` writes it, its Active or Completed badge beside, and "N of M cards" beneath, opening `/runs/:runId`. "No runs yet." stands under "Runs" with none. Nothing else is on the page.
- A deck's line must show its name and nothing that opens yet.
- Tests: the counts over a run ended with cards unreached, made in the test by deleting its pending rows and marking it completed since the end of a run comes later, a run of chosen cards, and a deck's card deleted afterward; the main action's two words; a row's mark, day, badge and count.
- `docs/vocabulary.md`, each row's columns as given:
  - A new row in the Run area: Concept "A run's mark"; User reads a flash inside a circle, drawn as an outline in the color of the words beside it; "Run", spoken; Where beside a run's day on Home, under "Runs" and heading a completed run's page; never on the run page; Code `RunMark`.
  - "A practice's own page": User reads its name with its mark and its circle; each of its decks on a line; "Runs" over its runs.
  - "How many cards were practiced": Concept "How many of its practice's cards a run reached"; User reads "N of M cards"; Where a completed run's page, beside the Completed badge; a practice's page, under each run; Home, in a completed run's details.

**Out of scope**

- A deck's line opening the deck's board, and the chevron drawing 4-practice draws at its end: cycle 050.
- "N of M cards" on a completed run's page and on Home: cycles 051 and 052.
- A name wrapping to two lines: cycle 053.

**Done when**

- `uv run pytest tests/api_tests/test_practices.py tests/api_tests/test_runs.py -q` passes.
- `cd frontend && npx vitest run src/components/ui/RunMark.test.tsx src/components/run/RunRow.test.tsx src/pages/PracticeDetailsPage.test.tsx` passes.
- The cycle's judgement holds.

**Debrief**

None.
