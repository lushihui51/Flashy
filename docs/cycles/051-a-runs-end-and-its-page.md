# 051 — A run's end and its page

Waits for: 049, its `run` and `run_card` tables, `RunPage` at `/runs/:runId`, `RunMark`, `RunStatusBadge`, `RerunButton`, `RunBreakdown` on the new paths and `practice_has_active_run`; 050, its `RunDetail` from `GET /api/runs/{id}` and the run's board at `/runs/:runId/decks/:deckId`; and `docs/vocabulary.md`, which it shares with both.

Canvas: https://claude.ai/artifact/NdSpFVAWQESu3S2ydqJoNS

## Goal

Outcome: The user ends a run at any card from beside its progress, and a completed run's page names its practice and its day, says how many of the practice's cards it reached, opens how it asked each deck, offers Re-run as its main action, and holds its summary.

Scope: The cycle covers `POST /api/runs/{id}/end` and a run's counts on its read; "End run" on the run page, with its confirm; the completed run's page as drawing 13 draws it, which the run page turns into in place: its heading, its badge and count, its deck lines, Re-run and the summary; "Re-run these" under the counts; a kind of change no card had shown in its color with its zero, and not choosable; the summary's order and chosen counts kept in its address; and the vocabulary's run and summary rows. It leaves out Home, cycle 052's; and a name wrapping to two lines, cycle 053's.

Judgement: The engineer judges on the live server at 390 wide: on a run with cards left, the run page reads as drawing 14, "End run" at the right end of the progress bar's line; End run asks "End this run?" over "The cards you have not reached stay as they are. The run shows only the cards you did.", and on yes the page turns into the completed run's page listing only the cards rated; a completed run's page reads as drawing 13, under "All practices › <practice>": the run's mark and day, "Completed" and "N of M cards", a line per deck that opens its board greyed with "How this run asked it.", "Re-run" in yellow, then the summary; a kind with no card shows its badge and its 0 with no block and does nothing when tapped; choosing "down a lot" and ordering by drops shows "Re-run these" under the counts, as drawing 6-chosen draws it, and the list and order survive a refresh and browser back, as drawing 6-again draws them; the same run reached from its practice's page opens on every card ordered by mastery, as drawing 6-fresh draws it; Re-run opens a new run of the same practice on its first card; and with another run of that practice active, Re-run and Re-run these show "Finish the active run first." beneath them.

## Records

- PDR 036: A card practiced in a run as a prompt zone and a list of rated answers
- PDR 038: One active run per practice, which the user can end at any card
- PDR 040: A next run started from a completed run, of the whole practice or the cards chosen
- PDR 041: One summary of what a run did to each card's mastery, on the completed run's page
- PDR 042: A card edited where the user notices a mistake
- PDR 043: A card opened from the summary as its fields, with a mark for each attempt
- PDR 017: A row of the places above a page, led by a way back
- PDR 031: Failures met in place, up to the whole page, with one banner for the connection
- ADR 088: TanStack Query for the frontend's server state, refetched on mount
- ADR 110: A partial unique index for one active run per practice
- ADR 111: Active and completed as a run's only statuses, an ended run losing its unreached cards
- ADR 113: A table of the cards a run could ask, written when the run is cut, for its count
- ADR 117: `last_activity_at` on decks, cards and runs, with practices ordered by their runs
- ADR 125: Server-composed reads for a run's page and its summary, naming the run's day and practice

## Tasks

### T1 — Ending a run

**Status**

- [ ]

**Goal**

The user ends an active run from "End run" at the right end of the run page's progress bar, after its confirm, and the run is completed as it stands, its unreached cards gone from it and its page turned into the completed run's page.

**Dependencies**

None.

**Files**

- `app/models/run_payloads.py`
- `app/database_ops/run.py`
- `app/database_ops/run_card.py`
- `app/services/run.py`
- `app/routers/api/run.py`
- `tests/api_tests/test_runs.py`
- `tests/api_tests/test_activity_tracking.py`
- `tests/api_tests/test_auth_scoping.py`
- `frontend/src/api/openapi.json`
- `frontend/src/api/types.ts`
- `frontend/src/api/run.ts`
- `frontend/src/test/run.test.ts`
- `frontend/src/pages/RunPage.tsx`
- `frontend/src/pages/RunPage.test.tsx`
- `frontend/src/components/practice/RunProgressBar.tsx`
- `docs/vocabulary.md`

**Details**

PDR 038, LPD13, LPD20 and drawing 14, under ADR 111 and ADR 117:

- `POST /api/runs/{id}/end` (no body, 200, `RunRead`) must, through `end_run(db, run)` in `app/services/run.py` and in one transaction, delete every `pending` `run_card` of the run, mark it completed and touch it (ADR 111, ADR 117), on a whole run and a run of chosen cards alike. On a run already completed it changes nothing and returns it. Another user's run is a 404.
- `RunDetail` must extend `RunListing`, so `GET /api/runs/{id}` carries `reached_cards` and `counted_cards`.
- The run page must keep its row of places, no heading, its progress bar and its card as they stand, and put "End run" as a white button at the right end of the progress bar's line, the bar shortening to make room, as drawing 14 draws it. End run asks, through `ConfirmDialog`, "End this run?" over "The cards you have not reached stay as they are. The run shows only the cards you did.", with Cancel and "End run"; on "End run" it calls the path and the run page turns into the completed run's page in place, with no new history entry.
- A failure of the end shows its sentence beside "End run" (PDR 031).
- Tests: ending deletes the pending rows and keeps every rated one and every review, the run's N reads the cards reached, ending a completed run changes nothing, and the run is touched; the run page's End run asks first, Cancel changes nothing, and yes calls the path once.
- `docs/vocabulary.md`: "Ending a run before its last card": User reads "End run"; "End this run?" over "The cards you have not reached stay as they are. The run shows only the cards you did."; Where the run page, at the right end of the progress bar's line; Code `POST /api/runs/{id}/end`; `end_run`.

**Out of scope**

- An `ended` status, or anything recording why a run became completed: never, ADR 111.
- End run among the card's acts or in the row of places: never, LPD13.
- The completed run's page as drawing 13 draws it: T2.

**Done when**

- `uv run pytest tests/api_tests/test_runs.py tests/api_tests/test_activity_tracking.py tests/api_tests/test_auth_scoping.py -q` passes.
- `cd frontend && npx vitest run src/pages/RunPage.test.tsx src/test/run.test.ts` passes.
- On the live server at 390 wide, a run with cards left reads as drawing 14, and End run then "End run" turns the page into the completed run's page listing only the cards rated.

**Debrief**

None.

### T2 — The completed run's page

**Status**

- [ ]

**Goal**

A completed run's page reads as drawing 13 draws it: under "All practices › <practice>", the run's mark and day as its heading, "Completed" and "N of M cards", a line per deck opening how the run asked it, "Re-run" as its main action in yellow, then the summary, with no "Done".

**Dependencies**

- T1: `reached_cards` and `counted_cards` on `RunDetail`, and `docs/vocabulary.md` as T1 leaves it.

**Files**

- `frontend/src/pages/RunPage.tsx`
- `frontend/src/pages/RunPage.test.tsx`
- `frontend/src/components/practice/RerunButton.tsx`
- `frontend/src/components/practice/RerunButton.test.tsx`
- `docs/vocabulary.md`

**Details**

LPD12, LPD13, LPD19, LPD20, PDR 040, PDR 041 and drawing 13:

- Once the run is completed, the run page must read as drawing 13, under the row of places "All practices" then the practice's `PracticeMark` and name: the heading, the run's `RunMark` at the heading's size and its day as `formatRunDay` writes it; then the "Completed" badge and "N of M cards" on one line; then one line per deck the run asked, its `DeckMark` and name, opening `/runs/:runId/decks/:deckId` with the page's own address as `cancelTo`; then "Re-run" as the page's main action in yellow, its words alone with no sign; then the summary. "Practice complete", "N cards practiced" and "Done" leave the page.
- The page reads the run through `GET /api/runs/{id}` and the summary through the breakdown read, each through TanStack Query (ADR 088).
- Re-run must start the run at once through `POST /api/runs/{id}/rerun`, with no confirm, and open `/runs/:newRunId`; a refusal shows its sentence beneath it: `no_cards` "This run would have no cards. Either the practice's decks have no cards, or every card is blank in every field one side shows." and `practice_has_active_run` "Finish the active run first."
- Tests: the heading, the badge and count, the deck lines' addresses, Re-run's words and look, no "Done", and each refusal's sentence.
- `docs/vocabulary.md`, each row's columns as given:
  - "Running a practice again": User reads "Re-run"; Where a completed run's page, as its main action.
  - "Leaving a finished practice": User reads "—"; Where "—".
  - "What a practice did to mastery, never named": Concept "What a run did to mastery, never named"; User reads the run's mark and its day heading it; Where a completed run's page.

**Out of scope**

- "Re-run these", the counts and the zero counts: T3.
- Re-run beside a "Done" at the foot, or as the play button: never, LPD12.
- The summary first and Re-run below it, or every board open above the summary: never, LPD12.

**Done when**

- `cd frontend && npx vitest run src/pages/RunPage.test.tsx src/components/practice/RerunButton.test.tsx` passes.
- On the live server at 390 wide, a completed run's page reads as drawing 13 above its counts, and a deck's line opens that deck's board greyed with "How this run asked it."

**Debrief**

None.

### T3 — The summary's counts and Re-run these

**Status**

- [ ]

**Goal**

On a completed run's page, a kind of change no card had shows its badge in its color and its 0 with no block and cannot be chosen, "Re-run these" stands under the counts once a count is chosen, and the chosen counts and order survive a refresh, browser back and the address, while a run reached fresh opens on every card ordered by mastery.

**Dependencies**

- T2: the completed run's page, and `docs/vocabulary.md` as T2 leaves it.

**Files**

- `frontend/src/components/practice/RunBreakdown.tsx`
- `frontend/src/components/practice/RunBreakdown.test.tsx`
- `frontend/src/components/ui/ChangeBadge.tsx`
- `docs/vocabulary.md`

**Details**

LPD3, LPD5, LPD12, LPD20, PDR 040, PDR 041 and drawing 6:

- Each kind of change with a count above zero must stay a button drawn as a block, pressed while chosen, narrowing the list as today. A kind with no card must show its `ChangeBadge` in its own color and its 0 with no block around them, as drawing 6 draws "0 up" and "0 down", and must be no button: nothing happens when it is tapped and it is not reached by Tab.
- Under the counts, once one or more counts are chosen, "Re-run these" must start a run of exactly the cards the list shows through `POST /api/runs/{id}/chosen_cards`, with no confirm, and open `/runs/:newRunId`, as drawing 6-chosen draws it; a refusal shows beneath it: `no_cards` "These cards can't be run. Each is blank in every field one side shows." and `practice_has_active_run` "Finish the active run first." It reads its words alone with no sign.
- The chosen counts and the order must stay in the page's `kind` and `order` parameters, so they survive a refresh, browser back and the address; a run's page reached by its address with neither opens on every card ordered by mastery, as drawing 6-fresh draws it (PDR 017, PDR 041).
- Tests: a zero count is no button and a tap on it changes nothing; "Re-run these" appears once a count is chosen and sends the listed cards; a render from `?kind=down_a_lot&order=drops` shows that narrowing and order.
- `docs/vocabulary.md`, each row's columns as given:
  - "Practicing the cards the summary lists": User reads "Re-run these"; Where a completed run's page, under the counts, once a count is chosen.
  - "Ordering the cards", "A change in mastery, one of five kinds" and "A card opened from the summary": Where a completed run's page.
  - "How many cards had each kind of change": User reads the number under its kind's badge, in a block when above zero; "N up a lot", "N up", "N no change", "N down" or "N down a lot", spoken; Where a completed run's page; Home, in a completed run's details.

**Out of scope**

- A greyed badge, a dashed outline or a hidden zero: never, LPD3.
- Words for a list narrowed to nothing: never; no count of zero can be chosen.

**Done when**

- `cd frontend && npx vitest run src/components/practice/RunBreakdown.test.tsx` passes.
- The cycle's judgement holds.

**Debrief**

None.
