# 055 — Home's first steps

Waits for: 054, its migration, the alembic chain's head, and `app/models/app_user.py`, `app/database_ops/app_user.py`, `tests/api_tests/test_auth_scoping.py`, `frontend/src/api/openapi.json`, `frontend/src/api/types.ts` and `docs/vocabulary.md`, which it shares.

## Goal

Outcome: Home shows the steps to a first practice until the user has started a run, the fourth step starting a run of the practice they made most recently.

Scope: The cycle covers `app_user.first_run_at` in place of `first_practice_at`, stamped where a run is cut; the migration that renames the column and sets it from each user's earliest run; `practice_id` in Home's `steps`; Home's four steps, the fourth starting a run and opening its first card; the sentence at the fourth step when the run would have no cards; "All practices" at Home's foot once the user has made a practice; the vocabulary's rows for the steps and for a run that would have no cards; and the vocabulary's code names for a practice and for a run's two states. It leaves out Home's two sections of runs, which stay as they are, and anything a guest sees, which later cycles build.

Judgement: The engineer judges on the live server at 390 wide, as a new account. Home reads "0 of 4" over New deck, New card, New practice and Start run, with New deck in yellow. With a deck, a card and a practice made, from the top bar's New, Home reads "3 of 4", the first three struck through, "Start run" in yellow and "All practices" in the bar at the foot. Pressing "Start run" opens the first card of that practice. Back on Home the steps are gone, the run stands under Active, and deleting the deck does not bring the steps back.

## Records

- PDR 031: Failures met in place, up to the whole page, with one banner for the connection
- PDR 037: Runs at the user's initiative, with nothing due
- PDR 054: One meaning per color, with "Log in" yellow
- PDR 057: Home as first steps, then the user's runs
- ADR 019: Server-stamped UTC instants, user-facing dates rendered in the stored user timezone
- ADR 045: Alembic as the only schema path
- ADR 069: One vocabulary file for the user's words and the code's names
- ADR 070: A frontend map from refusal code to sentence
- ADR 088: TanStack Query for the frontend's server state, refetched on mount
- ADR 091: Whole collections in bounded statements for every collection read
- ADR 112: One function cutting every run from its practice's configurations as they stand
- ADR 124: Two URL parameters for a form's return addresses, and one function leaving every form by history
- ADR 135: One Home read, steps ending at first run

## Tasks

### T1 — The first run's stamp

**Status**

- [ ]

**Goal**

The user's first run, cut on any path, stamps `app_user.first_run_at`, and Home's read returns its steps until then, with the practice the fourth step starts.

**Dependencies**

None.

**Files**

- `alembic/versions/<revision>_first_run_at_on_app_user.py` (new, its revision id from `alembic revision`)
- `app/models/app_user.py`
- `app/models/home_payloads.py`
- `app/database_ops/app_user.py`
- `app/database_ops/home.py`
- `app/services/run.py`
- `app/services/practice.py`
- `app/services/home.py`
- `tests/api_tests/test_home.py`
- `tests/api_tests/test_practices.py`
- `tests/api_tests/test_auth_scoping.py`
- `frontend/src/api/openapi.json`
- `frontend/src/api/types.ts`
- `frontend/src/test/home.test.ts`
- `frontend/src/pages/HomePage.test.tsx`
- `docs/vocabulary.md`

**Details**

ADR 135:

- `AppUser.first_run_at: datetime | None`, a nullable `DateTime(timezone=True)` with no default, must replace `first_practice_at`.
- One migration, its `down_revision` the head `uv run alembic heads` prints before it is written, must rename `app_user.first_practice_at` to `first_run_at`, then set it for every user to the earliest `created_at` among the runs of that user's practices, and to null for a user with no run. Its downgrade renames the column back.
- `app/database_ops/app_user.py`: `db_stage_set_first_practice_at` becomes

```python
def db_stage_set_first_run_at(db: Session, user_id: uuid.UUID, at: datetime) -> None:
    """Stamps the user's first run, leaving a stamp already there untouched. No commit."""
```

- `cut_run` in `app/services/run.py` must call it with `practice.user_id` and `utcnow()`, after the `no_cards` refusal can no longer be raised, so a refused run leaves the stamp unwritten. Nothing else may write `first_run_at`: `create_practice` in `app/services/practice.py` stamps nothing.
- `get_home` in `app/services/home.py` must return `steps` as None when `user.first_run_at` is set.
- `HomeSteps` in `app/models/home_payloads.py` gains the third step's fact:

```python
class HomeSteps(AppModel):
    has_deck: bool
    has_card: bool
    # The practice the user made most recently, which the fourth step starts; None while they have none.
    practice_id: uuid.UUID | None
```

- `db_read_home_steps` in `app/database_ops/home.py` must read `practice_id` as the id of the user's practice with the newest `created_at`, then the greatest `id`, and Home's read must keep a number of statements that does not change with the user's data (ADR 091).
- `frontend/src/test/home.test.ts` and `frontend/src/pages/HomePage.test.tsx` must give `practice_id: null` in each `steps` they build, so the frontend builds against the regenerated types; their cases change no further here.
- The vocabulary's row "The steps to a first practice" must name `first_run_at` in its Code in place of `first_practice_at`; its other columns are T3's.
- Three existing cases assert what this task reverses, and each becomes the case Done when names in its place: in `tests/api_tests/test_home.py`, `test_steps_are_null_once_a_practice_is_made_before_it_is_run` becomes `test_steps_stay_once_a_practice_is_made_and_name_it`, and `test_a_refused_practice_leaves_the_steps` becomes `test_a_refused_run_leaves_the_steps_and_no_stamp`; in `tests/api_tests/test_practices.py`, `test_the_first_practice_is_stamped_once_and_a_run_stamps_nothing` becomes `test_making_a_practice_stamps_nothing_and_its_first_run_stamps_once`.

**Out of scope**

- Home's four steps on screen, and the row's User reads and Where: T3.
- A stamp derived from the runs or reviews that exist, or cleared by a deletion: never; ADR 135 rejects it.
- A route that picks the practice the fourth step starts: never; ADR 135 rejects it.
- `active_runs` and `recent_runs`: they stay as they are.

**Done when**

- In `tests/api_tests/test_home.py`, `test_steps_stay_once_a_practice_is_made_and_name_it` passes: with a deck, a card and a practice and no run, `steps` is `{"has_deck": true, "has_card": true, "practice_id": <the practice's id>}`.
- `test_the_newest_of_several_practices_is_the_one_named` passes.
- `test_steps_are_null_once_a_run_is_started` passes.
- `test_a_refused_run_leaves_the_steps_and_no_stamp` passes: a `no_cards` refusal leaves `first_run_at` null.
- `test_the_stamp_and_null_steps_survive_deleting_everything` passes against `first_run_at`.
- `test_a_rerun_and_a_run_of_chosen_cards_leave_the_stamp_as_it_was` passes.
- In `tests/api_tests/test_practices.py`, `test_making_a_practice_stamps_nothing_and_its_first_run_stamps_once` passes.
- `test_the_statement_count_is_equal_for_one_run_of_each_and_for_five` in `tests/api_tests/test_home.py` still passes.
- On a `pg_dump` copy of the dev database, then on the dev database, `uv run alembic upgrade head` applies the migration, `uv run alembic check` prints `No new upgrade operations detected.`, and `select count(*) from app_user u where u.first_run_at is distinct from (select min(r.created_at) from run r join practice p on p.id = r.practice_id where p.user_id = u.id)` prints `0`.
- `grep -rn "first_practice_at" app tests frontend/src docs/vocabulary.md` prints nothing.

**Debrief**

None.

### T2 — The vocabulary's code names

**Status**

- [ ]

**Goal**

The vocabulary's row for a practice gives the practice's code names, and its two rows for a run's state each give `RunStatus` and `status`.

**Dependencies**

- T1: `docs/vocabulary.md`, which it shares.

**Files**

- `docs/vocabulary.md`

**Details**

Three rows change in their Code column alone, and each must read exactly:

- "A named set of decks the user keeps and runs as many times as they like": `` `practice`; `Practice`; `/api/practices`; `practiceId` ``
- "A run that can still be continued": `` `active`; `RunStatus`; `status` ``
- "A run that has finished": `` `completed`; `RunStatus`; `status` ``

**Out of scope**

- `RunStatus` or `status` on the run's own row: never; that row is the run, and the two state rows hold its states.
- A new row for a run's state: never.
- Any other row's Code: never in this cycle.

**Done when**

- `grep -c "RunStatus" docs/vocabulary.md` prints `2`.
- ``grep -c '| `practice`; `Practice`; `/api/practices`; `practiceId` |' docs/vocabulary.md`` prints `1`.

**Debrief**

None.

### T3 — Home's four steps

**Status**

- [ ]

**Goal**

Home shows four steps to a first practice with how many are done, the fourth starting a run of the user's newest practice and opening its first card, until the user has started a run.

**Dependencies**

- T1: `HomeSteps.practice_id` in `GET /api/home`, and `steps` null from the first run on; `frontend/src/pages/HomePage.test.tsx`, which it shares.
- T2: `docs/vocabulary.md`, which it shares.

**Files**

- `frontend/src/pages/HomePage.tsx`
- `frontend/src/pages/HomePage.test.tsx`
- `docs/vocabulary.md`

**Details**

PDR 057, under ADR 135:

- `FirstPracticeSteps` in `frontend/src/pages/HomePage.tsx` must list four steps in this order: "New deck", "New card", "New practice", "Start run". The count beneath the heading reads "N of 4".
- The third step is done when `steps.practice_id` is not null. The fourth is never done while the steps show.
- The first step not done is Home's one main action, in yellow, as today. Every other step not done is plain words, as today.
- "Start run", when it is the main action, must be a `<button>` drawn as the other steps' main action is, the yellow `Link` in `FirstPracticeSteps`, with its shape, its size and its classes, and no plus beside its words. Pressing it calls `startRun(steps.practice_id)` from `frontend/src/api/practice.ts` and, on success, opens `/runs/<the run's id>`.
- A failed start must say its sentence beneath the fourth step, in the list, with `role="alert"`, chosen by `failureSentence(error, 'Practice not found.')`, so a run that would have no cards reads the vocabulary's sentence for it (ADR 070, PDR 031). The steps stay.
- "All practices", in the `FormBar` at Home's foot, must show while the steps show once `steps.practice_id` is not null, as the vocabulary's row "Going to All practices from Home" places it, and must not show before.
- The vocabulary's row "The steps to a first practice" must read, in User reads, `"Your first practice"; "N of 4"; "New deck", "New card", "New practice", "Start run" as the steps`, and in Where, `Home, until the user has started a run`. Its Code stays `` `steps`; `HomeSteps`; `first_run_at` ``.
- The vocabulary's row "A run that would have no cards" must read, in Where, `A practice's page, after Start run; a completed run's page, after Re-run or Re-run these; Home, after a play button or the Start run step`.

Guidance: the fourth step's start is a `useMutation` of its own in `HomePage`, beside the one a completed run's play button uses, so each failure shows at its own place. For the browser check, a new account is a second API beside the dev server, `DEV_AUTH_USER_ID=<an id no account holds> ENV=development uv run uvicorn app.main:app --port 8001`, with Playwright's `page.route` sending the page's `/api` requests to that port; the dev API on port 8000 is left running, and the account's rows stay in the dev database.

**Out of scope**

- A sentence, a count or a mark on Home saying how long ago anything happened or that anything waits: never; PDR 057.
- A way to New practice on Home beside "All practices": never; PDR 057.
- The fourth step pressable before the first three are done: never; only the first step not done is pressable.
- Asking before the fourth step starts the run: never.
- What a guest's press on a step does: a later cycle.
- The vocabulary's row "Starting a practice's run, or continuing its active one": it stays as it is; the fourth step's words are the steps row's.

**Done when**

- In `frontend/src/pages/HomePage.test.tsx`, `a user with nothing made reads "0 of 4" over New deck, New card, New practice and Start run` passes.
- `with a practice made reads "3 of 4" and makes Start run the one main action` passes: the button is the only yellow control and the list holds no link.
- `Start run starts the newest practice and opens its run` passes: the request is `POST /api/practices/<steps.practice_id>/runs` and the address becomes `/runs/<id>`.
- `a start refused for no cards says so beneath the fourth step and keeps the steps` passes.
- `holds no bar while the user has no practice, and All practices once they have one` passes.
- `grep -c '"N of 4"' docs/vocabulary.md` prints `1`, and `grep -c "or the Start run step" docs/vocabulary.md` prints `1`.
- In headless Chromium at 390 by 844, as a new account: Home reads "0 of 4" with New deck in yellow; after a deck, a card and a practice are made from the top bar's New, Home reads "3 of 4" with "Start run" in yellow and "All practices" in the bar at the foot; pressing "Start run" opens the practice's first card; Home then shows no steps and the run under Active; and after the deck is deleted Home still shows no steps.

**Debrief**

None.
