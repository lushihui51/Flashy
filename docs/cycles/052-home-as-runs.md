# 052 — Home as runs

Waits for: 046, with which it shares `app/models/home_payloads.py` and `app/database_ops/home.py`; 047, with which it shares `HomePage.tsx`; 048, its `DeckMark`, and `docs/vocabulary.md`, which it shares; 049, its `HomeRun`, `RunListing`, `DeckNameRead`, `RunMark`, `DeckLine`, `formatRunDay`, `startRun`, `readRunBreakdown`, `failureSentence`, `POST /api/practices/{id}/runs` and Home on the new paths; 050, with which it shares `app/database_ops/run.py`, `tests/api_tests/test_auth_scoping.py`, `frontend/src/api/openapi.json` and `frontend/src/api/types.ts`; 051, its completed run's summary, `RunBreakdown`, `RunProgressBar` and `test_auth_scoping.py`, which it shares.

Canvas: https://claude.ai/artifact/MictUjYsjMS8tWixE7ysg1

## Goal

Outcome: Once the user has made a practice, Home shows up to three active runs and the three most recently completed runs, each a tap of its play button from a card and its details opened beneath it by a tap on its row, with a bar at the foot leading to All practices.

Scope: The cycle covers Home's one read as ADR 123 shapes it, `active_runs` and `recent_runs`; a run's row on Home as drawings 2 and 17 draw it, its block of the run's mark and day, its practice's name, its decks, an active run's bar and its play button, the most recent one in yellow; a run's details beneath its row, a completed run's change counts counted from its breakdown read; the bar at the foot holding "All practices"; New practice gone from Home; and the vocabulary's Home rows. It leaves out Home's steps, which stay as they are; and a name wrapping to two lines, cycle 053's.

Judgement: The engineer judges on the live server at 390 wide, signed in as a user with active and completed runs: Home reads as drawing 2-before, "Active" over up to three active runs, newest acted-in first, each with its block, its practice's name in semibold, its decks and its bar, and "Recently completed" over up to three completed runs, one per practice and none of a practice with an active run; the first active run's play button is yellow and the others white, or the first completed run's when no run is active; a play button on an active run opens the run page on its next card, and on a completed run opens a new run of its practice on its first card; tapping an active run's row elsewhere opens its details as drawing 2-active draws them, and a completed run's as drawing 2-done draws them, each closed by "Hide"; "All practices" stays at the foot while Home scrolls and opens All practices; and Home offers no New practice.

## Records

- PDR 017: A row of the places above a page, led by a way back
- PDR 037: Runs at the user's initiative, with nothing due
- PDR 047: What the user changed most recently first, with runs and practices by what the user last did in a run
- PDR 048: Home as the runs the user can continue or start again
- PDR 049: A drawn mark of its kind beside every name
- ADR 088: TanStack Query for the frontend's server state, refetched on mount
- ADR 091: Whole collections in bounded statements for every collection read
- ADR 113: A table of the cards a run could ask, written when the run is cut, for its count
- ADR 123: One server-composed read for Home, its steps ended by a first practice stamped at creation
- ADR 125: Server-composed reads for a run's page and its summary, naming the run's day and practice
- ADR 127: A measured header height and one component for every bar at the foot

## Tasks

### T1 — Home's runs

**Status**

- [ ]

**Goal**

Home's read returns its active and recently completed runs as ADR 123 gives them, and Home shows them as drawings 2-before and 17 draw them, each run's play button continuing it or starting its practice again, with "All practices" in a bar at the foot and no New practice.

**Dependencies**

None.

**Files**

- `app/models/home_payloads.py`
- `app/database_ops/home.py`
- `app/database_ops/run.py`
- `app/services/home.py`
- `tests/api_tests/test_home.py`
- `tests/api_tests/test_auth_scoping.py`
- `frontend/src/api/openapi.json`
- `frontend/src/api/types.ts`
- `frontend/src/test/home.test.ts`
- `frontend/src/pages/HomePage.tsx`
- `frontend/src/pages/HomePage.test.tsx`
- `frontend/src/components/run/HomeRunRow.tsx` (new)
- `app/database_ops/deck.py`
- `frontend/src/components/ui/FormBar.tsx`
- `frontend/src/components/run/HomeRunRow.test.tsx` (new)
- `docs/vocabulary.md`

**Details**

PDR 048 and drawings 2-before and 17, under ADR 123 and ADR 127:

```python
class HomeRun(RunListing):
    practice_name: str
    # Most recently changed deck first (PDR 047).
    decks: list[DeckNameRead]
    # The live counts of an active run; None for a completed one.
    progress: RunProgress | None

class HomeRead(AppModel):
    # None once the user has made a practice.
    steps: HomeSteps | None
    # Up to three active runs, newest last_activity_at first.
    active_runs: list[HomeRun]
    # Up to three completed runs, the latest of each practice by last_activity_at, none of a
    # practice that has an active run, newest first.
    recent_runs: list[HomeRun]
```

- `db_read_deck_listings` loses its `deck_ids` parameter, Home having been its only caller; `FormBar`'s interface comment says it holds any bar at the foot, Home's included.
- `GET /api/home` must return `HomeRead` in a number of statements fixed whatever the user's data (ADR 123, ADR 091); `recent_decks`, `RecentDecks` and `RECENT_DECK_LIMIT` go, `RECENT_RUN_LIMIT` taking the last's place.
- Once `steps` is null, Home must read as drawings 2-before and 17: the heading "Home"; "Active" over one row per active run; "Recently completed" over one row per completed run; a section with no run is left out. A row opens with a small outlined block holding the run's `RunMark` and its day as `formatRunDay` writes it; beneath stand the practice's name in semibold, as the drawings draw it, with no mark, then its decks as `DeckLine` writes them, then, for an active run, its `RunProgressBar`. Nothing is indented. At the right stands a round play button, a triangle inside a circle, spoken "Practice <practice name>".
- The play button of the first active run must be yellow and every other white; with no active run, the first completed run's is yellow (PDR 048). An active run's play button opens `/runs/:runId`; a completed run's calls `POST /api/practices/{practice_id}/runs`, through a mutation `HomePage` owns (ADR 088), and opens the run it returns, with no confirm, a refusal showing its sentence beneath the row, through `failureSentence` with "Practice not found." for a 404: `no_cards` "This run would have no cards. Either the practice's decks have no cards, or every card is blank in every field one side shows."
- Once `steps` is null, Home must end with `FormBar` holding one white button, "All practices", opening `/practices`, fixed at the foot while Home scrolls (ADR 127). Home's link to New practice goes.
- The row and its play button must go in `HomeRunRow`, which T2 extends with the details:

```ts
/** One run's row on Home: its block, its practice's name, its decks, an active run's bar
 * and its play button, yellow when `isMain`. `onPlay` runs on the play button; `playError`
 * is the sentence beneath the row, or null. It holds no query or mutation of its own. */
export default function HomeRunRow(props: {
  run: HomeRun;
  isMain: boolean;
  onPlay: () => void;
  playError: string | null;
}): ReactNode;
```

- In this task a tap on the row anywhere but its play button does nothing: the row is no link, and T2 gives the tap its details.
- Tests: the read's selection, at most three of each, one completed run per practice, none of a practice with an active run, in a fixed number of statements; the row's block, name, decks and bar; which play button is yellow; each play button's address or request; the bar and no New practice.
- `docs/vocabulary.md`, each row's columns as given:
  - "The practices the user can go on with": Concept "The active runs the user can continue"; User reads "Active" over up to three runs, each its mark and day in a block, its practice's name, its decks and its progress, with a play button; Where Home; Code `active_runs`; `ACTIVE_RUN_LIMIT`; `HomeRun`.
  - "The decks of the most recently completed practices": Concept "The most recently completed runs"; User reads "Recently completed" over up to three runs, each its mark and day in a block, its practice's name and its decks, with a play button; Where Home; Code `recent_runs`; `RECENT_RUN_LIMIT`; `HomeRun`.
  - "Going to New practice from Home": the row leaves the file, Home's foot holding no way to New practice and the code no name for one; the steps' New practice stays in "The steps to a first practice".
  - A new row in the Home area: Concept "Going to All practices from Home"; User reads "All practices"; Where Home, in the bar at the foot, once the user has made a practice; Code `FormBar`; `/practices`.
  - A new row in the Home area: Concept "A run's play button"; User reads a triangle inside a circle; "Practice <name>", spoken, naming the run's practice, as "Practice Commands + Ports"; Where Home, on each run's row; Code `HomeRunRow`.

**Out of scope**

- A run's details beneath its row: T2.
- A count of further active runs, a time since anything, a streak or a quote: never, PDR 048.
- A practice's mark beside its name on Home's rows: never, as drawings 2 and 17 draw them, which needs PDR 049 amended to match before this cycle is built.

**Done when**

- `uv run pytest tests/api_tests/test_home.py tests/api_tests/test_auth_scoping.py -q` passes.
- `cd frontend && npx vitest run src/pages/HomePage.test.tsx src/components/run/HomeRunRow.test.tsx src/test/home.test.ts` passes.
- On the live server at 390 wide, Home reads as drawing 2-before, and each kind of play button lands where the Goal says.

**Debrief**

None.

### T2 — A run's details on Home

**Status**

- [ ]

**Goal**

Tapping a run's row on Home anywhere but its play button opens its details beneath it, closed by "Hide": each of its decks on a line, and an active run's counts of passed, failed, retrying and unseen cards, or a completed run's "N of M cards" and its five change counts.

**Dependencies**

- T1: `HomeRunRow` and `HomeRun`.

**Files**

- `frontend/src/components/run/HomeRunRow.tsx`
- `frontend/src/components/run/HomeRunRow.test.tsx`
- `frontend/src/pages/HomePage.tsx`
- `frontend/src/pages/HomePage.test.tsx`
- `frontend/src/components/run/RunBreakdown.tsx`
- `frontend/src/components/run/RunProgressBar.tsx`
- `frontend/src/components/run/runProgressColors.ts` (new)
- `frontend/src/lib/changeKinds.ts`
- `frontend/src/lib/changeKinds.test.ts` (new)
- `docs/vocabulary.md`

**Details**

Drawings 2-active and 2-done, under ADR 088 and ADR 125:

```ts
/** How many of the cards had each kind of change. */
export function countChanges(cards: { change: ChangeKind }[]): Record<ChangeKind, number>;
```

- `countChanges` must live in `frontend/src/lib/changeKinds.ts`, and `RunBreakdown` must count its kinds through it, so Home's details and the summary count with one function.
- `HomeRunRow` must gain three props, and `HomePage` owns the state and the read they carry (ADR 088):

```ts
  /** Whether the row's details are open. */
  open: boolean;
  /** Opens or closes the details. */
  onToggle: () => void;
  /** A completed run's breakdown for its counts: its cards, or 'loading' or 'error'; absent for an active run. */
  breakdown?: { change: ChangeKind }[] | 'loading' | 'error';
```

- The row's block, name, decks and bar, everything but its play button, must be one button with `aria-expanded`, spoken as the practice's name; a tap on it opens the details beneath, as drawings 2-active and 2-done draw them, and a second tap or "Hide" closes them. Each row opens and closes on its own; `HomePage` keeps the open rows in its URL as one `open` parameter per run id, written through `useViewParams` (PDR 017).
- An active run's details must list each of its decks on a line, its `DeckMark` and name, then its counts from `progress`: "N passed", "N failed", "N retrying" and "N unseen", each beside its square in the bar's color for it, the four colors as string constants in `frontend/src/components/run/runProgressColors.ts`, which `RunProgressBar` reads too, then "Hide".
- A completed run's details must list each deck on a line, then "N of M cards", then the five change counts, each its `ChangeBadge` and its number, spoken as "N up a lot", "N up", "N no change", "N down" or "N down a lot", counted by `countChanges` over `GET /api/runs/{id}/breakdown`, read by `HomePage` through TanStack Query under `['run_breakdown', runId]`, the summary's key, for each open completed run; until it arrives the details hold their deck lines and "N of M cards", from `HomeRun`, and no change count, with no words of their own, and "Could not load this run." stands in the counts' place when it fails.
- Tests: `countChanges` over five kinds; a tap on the row opens the details and a tap on the play button does not; the active run's four counts; the completed run's count line and five counts from a mocked breakdown; the details before the breakdown arrives and when it fails; "Hide" closes.
- `docs/vocabulary.md`: a new row in the Home area: Concept "A run's details on Home"; User reads "Hide"; each of its decks on a line; for an active run, "N passed", "N failed", "N retrying" and "N unseen"; Where Home, beneath a run's row once tapped; Code `HomeRunRow`. A completed run's count and change counts there stand in the rows "How many of its practice's cards a run reached" and "How many cards had each kind of change", whose Where already name Home's details; the second row's Code gains `countChanges`.

**Out of scope**

- "Open practice" or "Delete practice" in the details: never.
- The change counts in Home's read: never.

**Done when**

- `cd frontend && npx vitest run src/components/run/HomeRunRow.test.tsx src/lib/changeKinds.test.ts src/components/run/RunBreakdown.test.tsx` passes.
- The cycle's judgement holds.

**Debrief**

None.
