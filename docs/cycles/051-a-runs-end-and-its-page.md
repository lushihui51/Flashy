# 051 — A run's end and its page

Waits for: 048, its `DeckMark`; 049, its `run` and `run_card` tables, `RunListing`, `RunPage` at `/runs/:runId`, `RunMark`, `PracticeMark`, `formatRunDay`, `RunStatusBadge`, `RerunButton`, `RunBreakdown` on the new paths, `rerunRun`, `startChosenCards` and `practice_has_active_run`; 050, its `RunDetail` from `GET /api/runs/{id}` through `readRun` under `['run_detail', runId]`, with `decks`, and the run's board at `/runs/:runId/decks/:deckId`; and `docs/vocabulary.md`, which it shares with each.

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
- PDR 051: Cancel and Create or Save at the foot of every form, and Done alone where nothing can change
- PDR 017: A row of the places above a page, led by a way back
- PDR 031: Failures met in place, up to the whole page, with one banner for the connection
- ADR 070: A frontend map from refusal code to sentence
- ADR 088: TanStack Query for the frontend's server state, refetched on mount
- ADR 110: A partial unique index for one active run per practice
- ADR 111: Active and completed as a run's only statuses, an ended run losing its unreached cards
- ADR 113: A table of the cards a run could ask, written when the run is cut, for its count
- ADR 117: `last_activity_at` on decks, cards and runs, with practices ordered by their runs
- ADR 124: Two URL parameters for a form's return addresses, and one function leaving every form by history
- ADR 125: Server-composed reads for a run's page and its summary, naming the run's day and practice

## Tasks

### T1 — Ending a run

**Status**

- [x]

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
- `frontend/src/pages/DeckBoardPage.test.tsx`
- `docs/vocabulary.md`

**Details**

PDR 038 and drawing 14, under ADR 111 and ADR 117:

- `POST /api/runs/{id}/end` (no body, 200, `RunRead`) must, through `end_run(db, run)` in `app/services/run.py` and in one transaction, delete every `pending` `run_card` of the run, mark it completed and touch it (ADR 111, ADR 117), on a whole run and a run of chosen cards alike. Another user's run is a 404.
- `RunDetail` must extend `RunListing`, so `GET /api/runs/{id}` carries `reached_cards` and `counted_cards`.
- While a card is current, the run page must keep its row of places, no heading, its progress bar and its card as they stand, and put "End run" as a white button at the right end of the progress bar's line, the bar shortening to make room within the run page's own layout, `RunProgressBar` unchanged, as drawing 14 draws it. Once the run is completed, neither the bar nor "End run" shows. End run asks, through `ConfirmDialog`, "End this run?" over "The cards you have not reached stay as they are. The run shows only the cards you did.", with Cancel and "End run"; on "End run" it calls the path, refreshes `['run', runId]` and `['run_detail', runId]`, and the run page turns into the completed run's page in place, with no new history entry.
- `frontend/src/api/run.ts` must offer `endRun(runId)`. A failure of the end shows its sentence beside "End run", through `failureSentence` with "Run not found." for a 404 (PDR 031).
- Tests: ending deletes the pending rows and keeps every rated one and every review, the run's N reads the cards reached, and the run is touched; the run page's End run asks first, Cancel changes nothing, and yes calls the path once; `run.test.ts` covers `endRun`'s request; a completed run's page shows no "End run".
- `docs/vocabulary.md`: "Ending a run before its last card": User reads "End run"; "End this run?" over "The cards you have not reached stay as they are. The run shows only the cards you did."; Where the run page, at the right end of the progress bar's line; Code `POST /api/runs/{id}/end`; `end_run`; `endRun`.

**Out of scope**

- An `ended` status, or anything recording why a run became completed: never, ADR 111.
- What ending a run that is already completed does, refused or answered unchanged: an unsettled decision, backlog B33; no test fixes it.
- End run among the card's acts or in the row of places: never.
- The completed run's page as drawing 13 draws it: T2.

**Done when**

- `uv run pytest tests/api_tests/test_runs.py tests/api_tests/test_activity_tracking.py tests/api_tests/test_auth_scoping.py -q` passes.
- `cd frontend && npx vitest run src/pages/RunPage.test.tsx src/test/run.test.ts` passes.
- On the live server at 390 wide, a run with cards left reads as drawing 14, and End run then "End run" turns the page into the completed run's page listing only the cards rated.

**Debrief**

- `uv run pytest tests/api_tests/test_runs.py tests/api_tests/test_activity_tracking.py tests/api_tests/test_auth_scoping.py -q` printed "114 passed". Among them: `TestEndRun::test_ending_deletes_the_pending_rows_and_keeps_every_rated_one_and_every_review` (a pass, then an Again whose retry waits pending beside the unreached third card; after the end only the two rated rows remain and their `review_log` ids are unchanged), `TestEndRun::test_the_runs_count_reads_the_cards_reached` (2 of 3 on `GET /api/runs/{id}` and on the practice's page), `TestEndRun::test_a_run_of_chosen_cards_ends_alike`, `TestEndRun::test_404_for_unknown_run`, `TestRunWrites::test_ending_a_run_touches_it_and_no_deck_or_card`, `test_run_endpoints` now posting `/end` as the other user for a 404, and `TestOwnerStillHasAccess::test_another_users_end_leaves_the_run_active`. The full `pytest`, run with no other connection on the test database, printed "385 passed".
- `cd frontend && npx vitest run src/pages/RunPage.test.tsx src/test/run.test.ts` printed "Test Files 2 passed (2)", "Tests 54 passed (54)". The new `RunPage End run` group covers: End run at the right end of the bar's line, white; the confirm's title, sentence, Cancel and "End run", with nothing sent; Cancel closing it with nothing sent and the card and its place unchanged; yes sending the end once and turning the page into the completed run's at the same path with the card's place gone; a 404 showing "Run not found." under the line; and a completed run's page showing neither End run nor the bar. `run.test.ts` covers `endRun`'s request and its 404.
- On the live server at 390 by 844, headless Chromium on the dev data's "Cycle 049 T4 check" run, 20 cards: after rating two cards Good through the page, the bar read "2 passed, 0 failed, 0 retrying, 18 unseen", 265 wide from x 16, End run 81 by 36 from x 293, 12 from the bar and 16 from the right edge, both centred at y 209, the card below it as before; the confirm read "End this run?" over "The cards you have not reached stay as they are. The run shows only the cards you did." with Cancel and End run; on End run the page showed "Practice complete", "2 cards practiced" and the two rated cards "139" and "445" alone, with no bar and no End run, at the same address with `history.length` 2 before and after; `GET /api/runs/{id}` then read completed, 2 of 20. That run stays ended in the dev data.
- Departure: the service is `end_run(db, user_id, run_id)` rather than `end_run(db, run)`. A router may not import `app/database_ops/`, so it has no `Run` to hand over; the signature matches `rerun` and `start_chosen_cards` beside it.
- Departure: on success End run also takes the card's place (`card`, `shown`, each `rating.`) out of the address, by a replace as Next card does, so the completed run's page starts from a clean address. It adds no history entry.
- Departure: a failed end's sentence stands on its own line directly under the bar's line rather than on it, since the line has no room for a sentence at 390 wide.
- Departure: `RunDetail`'s counts come from a new `db_read_run_listing` in `app/database_ops/run.py`, which shares one statement builder, `_run_listings`, with `db_read_run_reads_for_practice`, so a run's N of M is counted one way on its page and in its practice's list.
- Read `end_run` in `app/services/run.py`: on a run already completed it deletes nothing, touches the run again and answers it completed. That is what backlog B33 leaves open; no test fixes it.

### T2 — The completed run's page

**Status**

- [x]

**Goal**

A completed run's page reads as drawing 13 draws it: under "All practices › <practice>", the run's mark and day as its heading, "Completed" and "N of M cards", a line per deck opening how the run asked it, "Re-run" as its main action in yellow, then the summary, with no "Done".

**Dependencies**

- T1: `reached_cards` and `counted_cards` on `RunDetail`, and `docs/vocabulary.md` as T1 leaves it.

**Files**

- `frontend/src/pages/RunPage.tsx`
- `frontend/src/pages/RunPage.test.tsx`
- `frontend/src/components/run/RerunButton.tsx`
- `frontend/src/components/run/RerunButton.test.tsx`
- `docs/vocabulary.md`

**Details**

PDR 040, PDR 041 and drawing 13:

- Once the run is completed, the run page must read as drawing 13, under the row of places "All practices" then the practice's `PracticeMark` and name: the heading, the run's `RunMark` at the heading's size and its day as `formatRunDay` writes it; then the "Completed" badge and "N of M cards" on one line; then one line per deck of `RunDetail.decks`, in its order, its `DeckMark` and name, opening `/runs/:runId/decks/:deckId` with the page's own address as `cancelTo`; then "Re-run" as the page's main action in yellow, its words alone with no sign, spoken "Re-run"; then the summary. "Practice complete", "N cards practiced" and "Done" leave the page.
- The page reads the run through `readRun` under `['run_detail', runId]` and the summary through the breakdown read under `['run_breakdown', runId]`, each through TanStack Query (ADR 088); the state read under `['run', runId]` still decides whether the page shows the card or the completed run. When the `run_detail` read answers 404, "Run not found." stands in place of the count line, the deck lines and Re-run, and "Could not load this run." when it fails otherwise (PDR 031).
- Re-run must start the run at once through `POST /api/runs/{id}/rerun`, with no confirm, and open `/runs/:newRunId`; a refusal shows its sentence beneath it, through `failureSentence` with "Run not found." for a 404: `no_cards` "This run would have no cards. Either the practice's decks have no cards, or every card is blank in every field one side shows." and `practice_has_active_run` "Finish the active run first."
- Tests: the heading, the badge and count, the deck lines' addresses, Re-run's words and look, no "Done", and each refusal's sentence.
- `docs/vocabulary.md`, each row's columns as given:
  - "How many of its practice's cards a run reached": User reads "N of M cards"; Where a completed run's page, beside the Completed badge; a practice's page, under each run; Home, in a completed run's details; Code `reached_cards`; `counted_cards`; `RunListing`; `total_cards`.
  - "Leaving a finished practice": User reads "—"; Where "—"; the row leaves the file, since "Done" and its code go.
  - "What a practice did to mastery, never named": Concept "What a run did to mastery, never named"; User reads the run's mark and its day heading it; Where a completed run's page.

**Out of scope**

- "Re-run these", the counts and the zero counts: T3.
- Re-run beside a "Done" at the foot, or as the play button: never.
- The summary first and Re-run below it, or every board open above the summary: never.

**Done when**

- `cd frontend && npx vitest run src/pages/RunPage.test.tsx src/components/run/RerunButton.test.tsx` passes.
- On the live server at 390 wide, a completed run's page reads as drawing 13 above its counts, and a deck's line opens that deck's board greyed with "How this run asked it."

**Debrief**

- `cd frontend && npx vitest run src/pages/RunPage.test.tsx src/components/run/RerunButton.test.tsx` printed "Test Files 2 passed (2)", "Tests 52 passed (52)". The completed run's tests in `RunPage.test.tsx` cover: the heading "Run 2026-11-03 (2)", the run's mark leading it, with no "Practice complete" and no "practiced"; "Completed" and "2 of 3 cards" on one line directly under the heading; a line per deck in the run's order, "Deck Commands" then "Deck Ports", each opening `/runs/run1/decks/<deck>` with `cancelTo` the page's own address, its search included, and no `returnTo`; Re-run reading "Re-run" alone in yellow, after the last deck line and before the summary, with no "Done" as a link or a button; Re-run staying yellow with `?kind=up`; Re-run refused with `practice_has_active_run`, `no_cards` and a 404 showing "Finish the active run first.", the no-cards sentence and "Run not found." directly beneath it, with no confirm; Re-run opening the new run at once; the run's read answering 404 putting "Run not found." where the count, the deck lines and Re-run stood, the heading kept; and any other failure putting "Could not load this run." there. `RerunButton.test.tsx` covers its words alone, yellow and as wide as its container. The full `npx vitest run` printed "Test Files 73 passed (73)", "Tests 700 passed (700)"; `npm run lint` and `npm run build` were clean.
- On the live server at 390 by 844, headless Chromium on the dev data's completed "Cycle 049 T4 check" run, the one T1 ended: the row of places read "All practices › Cycle 049 T4 check 2026-11-11T22:05:18.648Z" with the practice's mark; the heading, 30px, the run's mark and "2026-11-12"; under it "Completed" and "2 of 20 cards" on one line; one deck line, "Ports" with its mark and a chevron, 44 tall; "Re-run" 358 by 52 in rgb(255, 226, 52); then the summary's counts and its two cards; no "Done" and no "Practice complete". The deck line opened `/runs/<run>/decks/<deck>?cancelTo=%2Fruns%2F<run>`, the board under the deck's name and the practice, "How this run asked it." above it, its four fields disabled and Done alone, and Done landed back on `/runs/<run>`. No completed run of a practice with two decks is in the dev data, so the order of several deck lines is shown by the test alone. Re-run was not pressed on the live server, so no run was added to the dev data.
- Departure: the heading's day comes from the run's state under `['run', runId]`, which the page already holds, rather than from `RunDetail`; the heading therefore stands while the run's read loads and when it fails, and only the count line, the deck lines and Re-run give way to its sentence.
- Departure: Re-run shows before the run's read answers, since it needs nothing the read carries; it leaves only when that read fails.
- Departure from drawing 13: "N of M cards" is in `--color-aside`, the color the page's earlier count line used, rather than the drawing's #3a4553, which no color token in `frontend/src/index.css` holds and that file is outside Files.
- Departure, by the engineer's order: the row "How many of its practice's cards a run reached" keeps `run_counted_card` in its Code cell beyond the columns Details gives, since `counted_cards` is counted from that table and no other row names it.
- Read `CompletedRun` in `frontend/src/pages/RunPage.tsx`: the whole completed run's page, which replaced the earlier completion view.

### T3 — The summary's counts and Re-run these

**Status**

- [ ]

**Goal**

On a completed run's page, a kind of change no card had shows its badge in its color and its 0 with no block and cannot be chosen, "Re-run these" stands under the counts once a count is chosen, and the chosen counts and order survive a refresh, browser back and the address, while a run reached fresh opens on every card ordered by mastery.

**Dependencies**

- T2: the completed run's page, and `docs/vocabulary.md` as T2 leaves it.

**Files**

- `frontend/src/components/run/RunBreakdown.tsx`
- `frontend/src/components/run/RunBreakdown.test.tsx`
- `docs/vocabulary.md`

**Details**

PDR 040, PDR 041 and drawing 6:

- A kind in the page's `kind` parameter whose count is zero must be ignored, so an address can no more narrow the list to nothing than a tap can.
- Each kind of change with a count above zero must stay a button drawn as a block, pressed while chosen, narrowing the list as today. A kind with no card must show its `ChangeBadge` in its own color and its 0 with no block around them, as drawing 6 draws "0 up" and "0 down", and must be no button: nothing happens when it is tapped and it is not reached by Tab.
- Under the counts, once one or more counts are chosen, "Re-run these" must start a run of exactly the cards the list shows through `POST /api/runs/{id}/chosen_cards`, with no confirm, and open `/runs/:newRunId`, as drawing 6-chosen draws it; a refusal shows beneath it, through `failureSentence` with "Run not found." for a 404: `no_cards` "This run would have no cards. Either the practice's decks have no cards, or every card is blank in every field one side shows." and `practice_has_active_run` "Finish the active run first." It reads its words alone with no sign, a white button, as drawing 6-chosen draws it, Re-run alone being yellow.
- The chosen counts and the order must stay in the page's `kind` and `order` parameters, so they survive a refresh, browser back and the address; a run's page reached by its address with neither opens on every card ordered by mastery, as drawing 6-fresh draws it (PDR 017, PDR 041).
- Tests: a zero count is no button and a tap on it changes nothing; "Re-run these" appears once a count is chosen and sends the listed cards; a render from `?kind=down_a_lot&order=drops` shows that narrowing and order.
- `docs/vocabulary.md`, each row's columns as given:
  - "Practicing the cards the summary lists": User reads "Re-run these"; Where a completed run's page, under the counts, once a count is chosen.

**Out of scope**

- A greyed badge, a dashed outline or a hidden zero: never.
- Words for a list narrowed to nothing: never; no count of zero can be chosen.

**Done when**

- `cd frontend && npx vitest run src/components/run/RunBreakdown.test.tsx` passes.
- The cycle's judgement holds.

**Debrief**

None.
