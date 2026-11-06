# 043 — Home

Waits for: 041, its `start_chosen_cards_run`; 042, `DeckSummary.subject_name` and `frontend/src/api/types.ts`.

Canvas: https://claude.ai/artifact/4iDQrMsy1FruYJrS2MmHJ7

## Goal

Outcome: Home shows what the user can do next: the five steps to a first practice until the user has made one, then up to three active practices with their progress and the three decks of their most recently completed practices, and a way to New practice.

Scope: The cycle covers a server-stamped first practice on the user, added and backfilled by a migration and written on every path that creates a practice; one composed `GET /api/home` in a fixed number of statements; Home drawn from it, with the steps, the active practices, "Recently practiced" and "New practice"; and the vocabulary's words for Home. It leaves out any count of further active practices, any mark of time or of being behind, which PDR 016 rules out; and the deck row's subject line, cycle 042's.

Judgement: The engineer judges on the live server at 390 wide, signed in as a user with no practice: Home reads "Your first practice" with "0 of 5" and the five steps, "New subject" as the yellow main action; after making a subject from the top bar's New and coming back, that step is ticked and struck and "New deck" is the main action, with "1 of 5"; after making a deck, a card and a configuration the same way, "New practice" is the main action with "4 of 5"; after starting a practice, Home shows it under "Home" with its progress bar and "Start practice", and the steps are gone, as drawing 9; after finishing it, "Recently practiced" lists its deck with its circle and a yellow "Practice", and "New practice" below, as drawing 10; with two more practices started, Home lists the three most recent active ones and no more; deleting every subject leaves the steps gone; `GET /api/home` runs the same number of statements for one practice as for five; and nothing on Home says when anything happened.

## Records

- PDR 016: Home as what the user can do next
- PDR 023: Mastery shown as a circle filled as far as the user is ready
- ADR 087: A server-stamped first practice on the user, for Home's steps
- ADR 088: TanStack Query for the frontend's server state, refetched on mount
- ADR 091: Whole collections in bounded statements for every collection read

## Tasks

### T1 — The first practice stamp and the Home read

**Status**

- [ ]

**Goal**

The user carries a server-stamped first practice, written by every path that creates one and backfilled by a migration, and one `GET /api/home` returns the steps' state, up to three active practices with their progress and the three decks of the most recently completed practices in a fixed number of statements.

**Dependencies**

None.

**Files**

- `alembic/versions/<revision>_first_practice_at_on_app_user.py` (new, its revision id from `alembic revision`)
- `app/models/app_user.py`
- `app/models/home_payloads.py` (new)
- `app/database_ops/app_user.py`
- `app/database_ops/home.py` (new)
- `app/database_ops/practice_run.py`
- `app/database_ops/practice_card.py`
- `app/database_ops/deck.py`
- `app/services/deck_listing.py` (new)
- `app/services/home.py` (new)
- `app/services/practice_run.py`
- `app/routers/api/deck.py`
- `app/routers/api/home.py` (new)
- `app/main.py`
- `tests/api_tests/test_home.py` (new)
- `tests/api_tests/test_practice_run.py`
- `tests/api_tests/test_auth_scoping.py`
- `frontend/src/api/openapi.json` (generated)
- `frontend/src/api/types.ts` (generated)
- `frontend/src/api/home.ts` (new)
- `frontend/src/test/home.test.ts` (new)

**Details**

The stamp (ADR 087, ADR 019):

- `AppUser.first_practice_at: datetime | None`, a nullable `DateTime(timezone=True)` with no default. The migration adds it and backfills it, for every user, from their earliest `practice_run.created_at`, else their earliest `review_log.reviewed_at`, else null, in one `UPDATE`; its downgrade drops the column. It must be dry-run on a `pg_dump` copy of the dev database and then applied with `alembic upgrade head`, as AGENTS.md has it.
- `app/database_ops/app_user.py` gains `db_stage_set_first_practice_at(db, user_id: uuid.UUID, at: datetime) -> None`, an `UPDATE` of the row where `first_practice_at IS NULL`, no commit.
- `start_practice_run`, `rerun_practice_run` and `start_chosen_cards_run` in `app/services/practice_run.py` must each call it with `utcnow()` from `app/models/base.py` after their `no_cards` check and before their commit, so a refused practice leaves the stamp unwritten; nothing in the deletion closure may touch it.

The payload, in `app/models/home_payloads.py`:

```python
class HomeSteps(AppModel):
    """Whether each of the first four things exists; the fifth, a practice, never does
    while the steps show."""

    has_subject: bool
    has_deck: bool
    has_card: bool
    has_configuration: bool


class HomeActivePractice(PracticeRunSummary):
    progress: RunProgress


class HomeRead(AppModel):
    # None once the user has made a practice.
    steps: HomeSteps | None
    # Up to three, most recently created first.
    active_practices: list[HomeActivePractice]
    # Up to three, the deck of the most recently rated completed practice first, each once.
    recent_decks: list[DeckSummary]
```

The read, `get_home(db, strategy, user: AppUser) -> HomeRead` in `app/services/home.py` (LCD5, ADR 091):

- `steps` is `None` when `user.first_practice_at` is set, else `db_read_home_steps(db, user_id) -> HomeSteps` in `app/database_ops/home.py`, one statement of four `EXISTS` subqueries over subject, deck through subject, card through deck and subject, and configuration through deck and subject.
- `active_practices` comes from `db_read_active_practice_runs_with_decks(db, user_id, limit: int) -> list[PracticeRunSummary]` in `app/database_ops/practice_run.py`, active runs by `created_at` descending then id, through `_summaries_for_runs`, and `db_read_practice_cards_for_runs(db, run_ids) -> dict[uuid.UUID, list[PracticeCard]]` in `app/database_ops/practice_card.py`, one statement in `created_at` order, folded by `run_progress` per run.
- `recent_decks` comes from `db_read_recent_deck_ids(db, user_id, limit: int) -> list[uuid.UUID]` in `app/database_ops/practice_run.py` (LCD4): one grouped statement over `practice_deck` joined to its completed `practice_run` of the user, that run's `practice_card` rows and the `review_log` rows whose `review_group_id` is a practice card's id, grouped by deck, ordered by the greatest `reviewed_at` descending then deck id, limited; a completed run with no review contributes nothing. Then `db_read_deck_listings` in `app/database_ops/deck.py` gains an optional `deck_ids: Collection[uuid.UUID] | None` that narrows `db_read_decks`'s query, and the listings become summaries through `deck_summaries(db, strategy, listings) -> list[DeckSummary]` in `app/services/deck_listing.py`, which `read_decks` in `app/routers/api/deck.py` also moves to; the service puts them back in the recency order.
- The whole read must issue a number of statements that does not change with the user's practices, decks or cards.

The route, `GET /api/home` returning `HomeRead` in `app/routers/api/home.py`, registered in `app/main.py` with the `/api` prefix, tagged "Home".

Tests, in `test_home.py`: a new user reads `steps` all false and empty lists; each thing made flips its flag; after a practice `steps` is null; a refused practice (`no_cards`) leaves `steps` present; `first_practice_at` stays after every practice and every deck is deleted, and `steps` stays null; three of four active practices, most recent first, each with its progress; a completed practice's deck in `recent_decks`, a completed run with no rating absent, a deck in two completed runs once, the newest rating first, and the fourth deck absent; a deck of an active practice absent; another user's practices and decks absent, in `test_auth_scoping.py`'s `test_list_endpoints_do_not_leak_across_users` too; and the statement count, with `statement_counter` on `practice_run`, `deck` and `mastery_log`, equal for one practice and one deck and for five of each. In `test_practice_run.py`, each of the three paths stamps a null `first_practice_at` once and leaves a set one alone.

After the backend, `cd frontend && npm run gen:api`, and `frontend/src/api/home.ts`:

```ts
export const readHome = async () => unwrap(await client.GET('/api/home'));
```

with `frontend/src/test/home.test.ts` reading it through MSW.

**Out of scope**

- Home itself: T2.
- A boolean, browser storage or Clerk metadata for the first practice: never, ADR 087.
- A `completed_at` column on a practice: never, LCD4.
- Progress on `PracticeRunSummary`: never, LCD5.

**Done when**

- `uv run alembic heads` prints one revision, the new one, and `uv run alembic current` prints the same.
- `uv run pytest tests/api_tests/test_home.py tests/api_tests/test_practice_run.py tests/api_tests/test_auth_scoping.py tests/api_tests/test_decks.py tests/api_tests/test_layering_guard.py tests/api_tests/test_models_layout_guard.py` passes.
- `grep -c "db_stage_set_first_practice_at" app/services/practice_run.py` prints `3`.
- `cd frontend && npm run gen:api && git status --porcelain src/api` prints nothing after the task's commit.
- `cd frontend && npx vitest run src/test/home.test.ts` passes.

**Debrief**

None.

### T2 — Home

**Status**

- [ ]

**Goal**

Home shows the five steps to a first practice until the user has made one, then up to three active practices with their progress and the decks of the most recently completed practices, and a way to New practice, from one read.

**Dependencies**

- T1: `readHome`, `HomeRead`, `HomeSteps`, `HomeActivePractice`.

**Files**

- `frontend/src/pages/HomePage.tsx`
- `frontend/src/pages/HomePage.test.tsx` (new)
- `frontend/src/pages/placeholderPages.test.tsx`
- `docs/vocabulary.md`

**Details**

Drawings 8, 9 and 10 are Home. `HomePage` must own the query `['home']` through `readHome`, under TanStack Query's default staleness and nothing else, so a thing made on any other page shows on Home's next mount with no invalidation (LCD5, ADR 088); it draws nothing until the data arrives, and "Could not load Home." as a `role="alert"` on failure.

The steps, while `steps` is present (PDR 016, LPD4; drawing 8):

- An `h2` "Your first practice" with "N of 5" under it in `text-sm` aside colour, N the count of true flags; then an `ol` with `aria-label="Your first practice"`, a block with its rows divided by a line, one per step in the order New subject, New deck, New card, New configuration, New practice.
- A done step's row holds a 1.875rem ink circle with a `Check` icon in surface colour and its label in aside colour struck through. The first step not done holds a 1.875rem circle with an ink outline and the step's number, and a yellow block button at 2.875rem high, growing, left-aligned, with a `Plus` icon and the label, Home's one main action, linking to the step's form: `/subjects/new`, `/decks/new`, `/cards/new`, `/deck-configurations/new` or `/practice/new`. Every later step holds its number in a line-coloured outline and its label in aside colour.

Once `steps` is null (drawing 9 and 10):

- With one or more active practices, one block whose rows each hold, stacked: a link to the practice's page with its name truncated, `PracticeStatusBadge`, and `SessionDeckChips` in the `summary` variant beneath; then `RunProgressBar`; and, on the first row only, a yellow full-width "Start practice" button with a `Play` icon linking to the run page, Home's main action. Nothing counts or mentions further practices.
- "Recently practiced", an `h2` at `text-action font-semibold`, over one block of up to three rows, each: a link to the deck's page holding the name at `text-base font-semibold` and "<subject> · N cards · N fields" in `text-label` aside colour beneath; `MasteryCircle` at `size="row"` when the deck's readiness is not null (PDR 023); and a "Practice" pill, a `tappable-sm` white block at 2.5rem with a `Play` icon, linking to `/practice?subject=<subject_id>&deck=<id>`. With no active practice, the first row's pill is yellow, Home's main action, as drawing 10. The heading and the block render only with one or more decks.
- Last, a "New practice" block, full width at 3rem with a `Plus` icon, white, linking to `/practice/new`.
- Nothing on Home may say when anything happened or that anything is waiting (PDR 016).

Tests in `HomePage.test.tsx`, through MSW on `GET /api/home`: the steps with "2 of 5", two struck, "New card" as the one yellow link to `/cards/new` and the rest plain; `steps` null with three active practices renders three rows, one "Start practice" linking to the first's run page, and the deck chips; two recent decks render their names, subject lines, circles and "Practice" links with the right params, the first yellow only when no practice is active; "New practice" links to `/practice/new`; the failure sentence; and no text matching "ago", "due" or "Coming soon". `placeholderPages.test.tsx` drops its Home case.

Drawings 9 and 10 show no circle on the "Recently practiced" rows; PDR 023 and the read give every deck row one, which this task draws.

`docs/vocabulary.md` (LPD4):

- The row "A place not built yet" leaves.
- New rows with Area "Home", after the Places rows:
  - Concept "The steps to a first practice"; User reads `"Your first practice"; "N of 5"; "New subject", "New deck", "New card", "New configuration", "New practice" as the steps`; Where "Home, until the user has made a practice"; Code `` `steps`; `HomeSteps`; `first_practice_at` ``.
  - Concept "The practices the user can go on with"; User reads `its name, "Active" and its decks, over its progress; "Start practice" on the most recent`; Where "Home"; Code `` `active_practices`; `HomeActivePractice` ``.
  - Concept "The decks of the most recently completed practices"; User reads `"Recently practiced"; "Practice" on each deck`; Where "Home"; Code `` `recent_decks` ``.
  - Concept "Going to New practice from Home"; User reads `"New practice"`; Where "Home, last"; Code `` `/practice/new` ``.
- The row "A thing that will not load" gains Where "Home", with the sentence "Could not load Home.".

**Out of scope**

- A count of further active practices, days in a row, or the time since anything: never, PDR 016.
- A step ticked only when done from Home: never, PDR 016.
- The steps returning after everything is deleted: never, PDR 016.
- Invalidating `['home']` from any other page's write: never, ADR 088.
- The side menu's items: unchanged; "Notifications" is in no file.

**Done when**

- `cd frontend && npx vitest run src/pages/HomePage.test.tsx src/pages/placeholderPages.test.tsx` passes.
- `grep -rn "Coming soon" frontend/src docs/vocabulary.md` prints nothing.
- `grep -c "Home" docs/vocabulary.md` prints `9` or more.
- At 390 wide on the live server, as a user with no practice: "Your first practice", "0 of 5", "New subject" yellow; a subject made from the top bar's New then Home shows it ticked and struck with "1 of 5" and "New deck" yellow; a deck, a card and a configuration made the same way bring "4 of 5" and "New practice" yellow; a practice started shows under "Home" with its progress bar and "Start practice" and no steps, as drawing 9; finished, "Recently practiced" lists its deck with its circle and a yellow "Practice", then "New practice", as drawing 10; three further practices started list only the three most recent; every subject deleted leaves the steps gone; and nothing on Home says when anything happened.

**Debrief**

None.
