# 041 — The summary's next practice

Waits for: 040, its `RunBreakdown` with the counts and the `kind` param, `MasteryCircle`'s `change`, and the breakdown payload's `cards`.

Canvas: https://claude.ai/artifact/TzPvxdKP9Y5pvLdCnoRXvX

## Goal

Outcome: From a completed practice's summary the user runs the whole practice again, or, once one or more counts are chosen, starts a practice of exactly the cards the list shows, each asked through the configuration it was practiced with, and the new practice is one like any other.

Scope: The cycle covers a nullable list of chosen cards on every snapshot, carried by a migration, read by generation and copied by a re-run; a third path that creates a practice, from a completed practice's own snapshots narrowed to the cards chosen, refused when nothing survives and when it would write no card; "Re-run" beside "Done" on the run page's summary, with its confirm; "Practice these" under the counts on both pages once a count is chosen, with "Done" turning white, the sentence when it makes nothing, and the vocabulary's words for all of it. It leaves out the first practice stamp on the user, a later cycle's; any mark on a practice of chosen cards in Practice or on its page, which PDR 026 rules out; and the summary's counts, order and rows, cycle 040's.

Judgement: The engineer judges on the live server at 390 wide, on a completed practice: tapping "Re-run" beside "Done" asks "Re-run this practice?" and, confirmed, lands on a new practice's page; with "down" chosen on the summary, a yellow "Practice these" sits under the counts and "Done" is white, and tapping it lands on a new practice's page whose cards, when started, are exactly the cards the list showed, each asked as it was practiced, and whose row in Practice and own page look like any other's; re-running that practice makes one of the same cards; after a field one of those cards' configuration used is removed on Edit deck, "Practice these" on the original summary says "These cards can't be practiced. A field they used has since been removed from their decks." under the button with the counts and the list as they were; and a practice of chosen cards whose cards are all blank on one side is refused with the no-cards sentence under the button.

## Records

- PDR 026: A next practice started from the summary, of the whole practice or the cards chosen
- ADR 085: Refusal of a practice that generates no cards, on every path that creates one
- ADR 086: A nullable list of chosen cards on each snapshot, for a practice of chosen cards

## Tasks

### T1 — A practice of chosen cards

**Status**

- [x]

**Goal**

Every snapshot carries a nullable list of chosen cards that generation reads and a re-run copies, and a completed practice's chosen cards start a new practice through one route, refused with a code when nothing survives or no card would be written.

**Dependencies**

None.

**Files**

- `alembic/versions/<revision>_card_ids_on_practice_deck.py` (new, its revision id from `alembic revision`)
- `app/models/practice_deck.py`
- `app/models/practice_run.py`
- `app/database_ops/card.py`
- `app/services/practice_run.py`
- `app/routers/api/practice_run.py`
- `tests/api_tests/test_practice_run.py`
- `tests/api_tests/test_auth_scoping.py`
- `frontend/src/api/openapi.json` (generated)
- `frontend/src/api/types.ts` (generated)
- `frontend/src/api/practice_run.ts`
- `frontend/src/test/practice_run.test.ts`

**Details**

The column (ADR 086): `PracticeDeck.card_ids: list[uuid.UUID] | None`, a nullable `ARRAY(Uuid)` with no default, added by the migration with no backfill, so every existing snapshot reads null, every card of its deck. The migration must be dry-run on a `pg_dump` copy of the dev database and then applied with `alembic upgrade head`, as AGENTS.md has it.

Generation: `_snapshot_and_generate_deck` in `app/services/practice_run.py` must take `card_ids: list[uuid.UUID] | None`, write it onto the snapshot, and generate for every card of the deck when it is null, else for those of the deck's cards whose id is in the list, in the same readiness order as today; an id naming no card of the deck selects nothing. `start_practice_run` passes null; `rerun_practice_run` passes each surviving snapshot's `card_ids` verbatim.

The third path, in `app/services/practice_run.py`:

```python
class ChosenCardsError(Exception):
    """A failure to start a practice of chosen cards, detail `{code, message}`:
    `run_active` while the practice has not completed; `nothing_to_practice` when no
    snapshot holding a chosen card still validates against its deck's live fields;
    `no_cards` when the surviving snapshots generated no practice card."""


def start_chosen_cards_run(
    db: Session,
    strategy: MasteryStrategy,
    user_id: uuid.UUID,
    practice_run_id: uuid.UUID,
    name: str,
    card_ids: list[uuid.UUID],
    rng: random.Random | None = None,
) -> PracticeRun:
    """A new practice of exactly `card_ids`, each asked through the snapshot its deck had in
    the completed practice `practice_run_id`. Raises LookupError for an unknown or foreign
    practice, ValueError when `card_ids` is empty or names a card the practice did not
    hold, and ChosenCardsError for the three coded refusals."""
```

- It must read the practice through `db_read_practice_run`, refuse `run_active` while its status is not completed, and take the practice's own cards as the ids of its practice cards; a chosen id outside them is a `ValueError`.
- It must map each chosen card to its deck through one `db_read_deck_id_by_card(db, card_ids: Collection[uuid.UUID]) -> dict[uuid.UUID, uuid.UUID]` in `app/database_ops/card.py`, unscoped because the practice's ownership read comes first, and then, for each of the practice's snapshots whose deck holds a chosen card, in the snapshots' order, validate its six arrays with `validate_deck_practice_config` and drop it, with its deck's chosen cards, when that raises; with none left it must raise `nothing_to_practice` before writing anything.
- It must create the run and one snapshot per survivor through `_snapshot_and_generate_deck`, with the survivor's six arrays, `source_config_id` and `source_config_name` copied verbatim and `card_ids` set to that deck's chosen cards; then, as the two other paths do, raise `no_cards` when no practice card was written, before the single commit (ADR 085).
- `name` is stored verbatim.

The route, in `app/routers/api/practice_run.py`, with its body in `app/models/practice_run.py`:

```python
class PracticeRunChosenCards(AppModel):
    name: str
    card_ids: list[uuid.UUID]


@router.post(
    "/practice_runs/{practice_run_id}/chosen_cards",
    response_model=PracticeRunRead,
    status_code=201,
)
def start_chosen_cards(db, current_user, practice_run_id: uuid.UUID, payload: PracticeRunChosenCards): ...
```

- `LookupError` maps to 404 with the string detail the rerun route uses, `ChosenCardsError` to 400 with `e.detail`, and `ValueError` to 400 with `str(e)`, as the rating route does.

Tests, in `test_practice_run.py`, a `TestChosenCards` class on `session_cards` and `session_config`: a practice of two of the three cards holds practice cards for exactly those two and a snapshot whose `card_ids` is those two with `source_config_id` and `source_config_name` copied; a re-run of it holds the same two cards after a fourth card is added to the deck, its snapshot's `card_ids` copied; a chosen card deleted since leaves its id in `card_ids` and no practice card for it; an active practice answers 400 `run_active`; every snapshot stale answers 400 `nothing_to_practice` and writes no run; chosen cards blanked on their answer side answer 400 `no_cards` and write no run; an empty list and an id of a card the practice never held answer 400; and a re-run of a whole-deck practice still takes in a card added since (`card_ids` null). In `test_auth_scoping.py`, `test_practice_run_endpoints` also posts to the new route as the other user and expects 404.

After the backend, `cd frontend && npm run gen:api`, and in `frontend/src/api/practice_run.ts`:

```ts
export const startChosenCards = async (
  practiceSessionId: string,
  payload: components['schemas']['PracticeRunChosenCards'],
) => unwrap(await client.POST('/api/practice_runs/{practice_run_id}/chosen_cards', { params: { path: { practice_run_id: practiceSessionId } }, body: payload }));
```

with a test in `src/test/practice_run.test.ts` that posts the name and the ids and returns the created run.

**Out of scope**

- The buttons and sentences on the summary: T2.
- `first_practice_at` on the user: cycle 043.
- A `practice_deck_card` table, or a hidden configuration holding the chosen cards: never, ADR 086.
- Cleaning a deleted card's id out of `card_ids`: never, ADR 086.
- A mark on a practice of chosen cards in Practice or on its page: never, PDR 026.

**Done when**

- `uv run alembic heads` prints one revision, the new one, and `uv run alembic current` prints the same.
- `uv run pytest tests/api_tests/test_practice_run.py tests/api_tests/test_auth_scoping.py tests/api_tests/test_schema_guard.py` passes, `TestChosenCards` among them.
- `cd frontend && npm run gen:api && git status --porcelain src/api` prints nothing after the task's commit.
- `cd frontend && npx vitest run src/test/practice_run.test.ts` passes.

**Debrief**

Evidence, in the order of Done when:

- `uv run alembic heads` printed `049886e86ae2 (head)` and `uv run alembic current` printed `049886e86ae2 (head)`. The dry run on a `pg_dump` copy of the dev database upgraded from `ec9df5054ea7`, left all 19 snapshots with `card_ids` null, the column an `ARRAY`, nullable, with no default, and went down and up again; the copy was then dropped and the migration applied to dev. `uv run alembic check` printed `No new upgrade operations detected.`
- `uv run pytest tests/api_tests/test_practice_run.py tests/api_tests/test_auth_scoping.py tests/api_tests/test_schema_guard.py` printed `123 passed`; `TestChosenCards` alone printed `11 passed`. With no other connection on the test database, the full `uv run pytest` printed `400 passed`.
- `npm run gen:api` was run, and a second run left `openapi.json` and `types.ts` byte-identical. The `git status --porcelain src/api` half of this line can only be run after the commit.
- `npx vitest run src/test/practice_run.test.ts` printed `18 passed`. The whole frontend: `npx vitest run` printed `780 passed`, `npm run lint` printed nothing, `npm run build` succeeded.

Departures from guidance: none. `startChosenCards` is laid out across lines like its neighbours in `practice_run.ts`.

Beyond the listed tests, `TestChosenCards` also covers a stale snapshot dropped with its chosen cards while another deck survives, and a deck holding no chosen card getting no snapshot; both are constraints with no listed test.

Choices the file leaves open, each reversible inside a task:

- A chosen id repeated in the request is written once onto `card_ids`.
- `run_active` is checked before the list, so an active practice answers `run_active` even with an empty list.

To read: `start_chosen_cards_run` in `app/services/practice_run.py`. A card deleted since the original practice has lost its practice card by cascade, so choosing it from that practice is the plain 400 of a card the practice did not hold, never a drop. The id staying in `card_ids` applies to a card deleted after a practice of chosen cards was made, as ADR 086 has it, and that is what the test covers.

### T2 — Re-run and Practice these on the summary

**Status**

- [ ]

**Goal**

The run page's summary offers "Re-run" beside "Done", and both summaries offer "Practice these" under the counts once a count is chosen, which starts a practice of the listed cards or says under the button why it cannot.

**Dependencies**

- T1: `startChosenCards`, the `nothing_to_practice` code.

**Files**

- `frontend/src/components/practice/RunBreakdown.tsx`
- `frontend/src/components/practice/RunBreakdown.test.tsx`
- `frontend/src/components/practice/RerunButton.tsx` (new)
- `frontend/src/components/practice/RerunButton.test.tsx` (new)
- `frontend/src/pages/PracticeRunPage.tsx`
- `frontend/src/pages/PracticeRunPage.test.tsx`
- `frontend/src/pages/PracticeDetailsPage.tsx`
- `frontend/src/pages/PracticeDetailsPage.test.tsx`
- `frontend/src/lib/failureSentence.ts`
- `frontend/src/lib/failureSentence.test.ts`
- `frontend/src/lib/practiceCopy.ts`
- `docs/vocabulary.md`

**Details**

Drawings 14, 15 and 22 are the summary; drawings 5 and 41 are Practice and a practice of chosen cards in it, which this task changes nothing of.

`RerunButton` in `RerunButton.tsx`, so the run page and the practice's own page share one mutation and one confirm:

```ts
type RerunButtonProps = {
  session: { id: string; name: string };
  /** `icon`: the practice's own page's square button with the RotateCcw icon. `text`: the
   * summary's white "Re-run" button, drawing 14. */
  look: 'icon' | 'text';
  /** Where a failure's sentence is drawn; the button draws none itself. */
  onError: (sentence: string) => void;
};
```

- It must carry `aria-label` of "Re-run " then the practice's name, open `ConfirmDialog` with the title "Re-run this practice?", the description and the confirm label the practice's own page uses today, post the name `formatDateTime(new Date())` through `rerunPracticeRun`, invalidate `['practice_runs']` and navigate to the new practice's page; a failure closes the confirm and hands `failureSentence(error, 'Practice not found.')` to `onError`. The practice's own page moves its re-run to it, keeping its sentence where it draws it today.
- On the run page the action row must read as drawing 14: "Done" growing, then `RerunButton` with `look="text"`, a white block at the action height; a failure's sentence renders under the row as a `role="alert"` in wrong colour (PDR 031).
- "Done" must be yellow with no count chosen and white, otherwise unchanged, with one or more chosen (LPD7; drawings 14 and 15); the run page reads `kind` through `useViewParams` for it.

"Practice these", in `RunBreakdown` (PDR 026, LPD7, LPD10):

- With one or more counts chosen and the narrowed list holding one or more cards, a yellow block button "Practice these", full width, must sit under the counts and above "Order by:", as drawing 15; with no count chosen, or with the chosen counts listing no card, it must not render.
- A tap must post, through `startChosenCards`, the name `formatDateTime(new Date())` and the ids of exactly the cards the narrowed list shows, invalidate `['practice_runs']`, and navigate to the new practice's page.
- A failure must render as a `role="alert"` sentence under the button, in wrong colour at `text-sm`, with the counts, the order and the list left as they were: `nothing_to_practice` reads "These cards can't be practiced. A field they used has since been removed from their decks." (drawing 22), `no_cards` reads `NO_CARDS_MESSAGE`, and every other failure `failureSentence(error, 'Practice not found.')`. The sentence clears on the next tap of "Practice these" or of a count.
- `failureSentence.ts` must map `nothing_to_practice` to that sentence, held in `practiceCopy.ts` as `NOTHING_TO_PRACTICE_MESSAGE`, and `failureSentence.test.ts` must cover it.
- Tests: `RerunButton.test.tsx` covers both looks, the confirm, the post and the navigation, and a failure handed to `onError`; `PracticeRunPage.test.tsx` covers "Re-run" beside "Done", "Done" white with a `kind` in the URL; `PracticeDetailsPage.test.tsx`'s re-run tests keep passing through the shared button; `RunBreakdown.test.tsx` covers "Practice these" absent with no count chosen, absent with a count of zero alone chosen, present with one that lists a card, posting the narrowed list's ids and the name, navigating on success, and each of the three failures' sentences under the button with the list unchanged.

`docs/vocabulary.md`:

- The row "Running a practice again" gains Where "the summary, beside Done" and keeps its words.
- The row "A practice that would have no cards" gains Where "the summary, after Practice these".
- The row "Leaving a finished practice" gains, in User reads after `"Done"`, `, white while a count is chosen`.
- New rows in the Practice area:
  - Concept "Practicing the cards the summary lists"; User reads `"Practice these"`; Where "The summary, under the counts, once a count is chosen"; Code `` `/api/practice_runs/{practice_run_id}/chosen_cards`; `PracticeRunChosenCards`; `startChosenCards`; `card_ids` ``.
  - Concept "A practice of chosen cards that nothing survives"; User reads `"These cards can't be practiced. A field they used has since been removed from their decks."`; Where "The summary, under Practice these"; Code `` `nothing_to_practice`; `NOTHING_TO_PRACTICE_MESSAGE` ``.

**Out of scope**

- "Practice these" shown but unusable before a count is chosen: never, LPD10.
- A sentence when the chosen counts list no card: an unsettled decision; the button does not show.
- Practicing the chosen cards on the fields that remain: never, LPD10.
- "Edit card" on the sheet: cycle 044.
- A sentence for a list narrowed to nothing: an unsettled decision.

**Done when**

- `cd frontend && npx vitest run src/components/practice src/pages/PracticeRunPage.test.tsx src/pages/PracticeDetailsPage.test.tsx src/lib/failureSentence.test.ts` passes.
- `grep -c "nothing_to_practice" frontend/src/lib/failureSentence.ts docs/vocabulary.md` prints `1` for each.
- At 390 wide on the live server, on a completed practice: "Re-run" beside "Done" confirms and lands on a new practice's page; with "down" chosen, "Practice these" sits under the counts and "Done" is white; tapping it lands on a new practice's page whose run, started, asks only the listed cards, and whose row in Practice and own page look like any other's; re-running that practice makes one of the same cards; after a field one of those cards' configuration used is removed on Edit deck, "Practice these" on the original summary shows the sentence of drawing 22 under the button with the counts and the list as they were; and with every chosen card blanked on its answer side, "Practice these" shows the no-cards sentence.

**Debrief**

None.
