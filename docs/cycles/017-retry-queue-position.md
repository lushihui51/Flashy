# 017 — Retry queue position

## Goal

Outcome: A retry with fewer than the floor's worth of cards pending goes above every row the run has placed, and the API is closed to rating a card that is not at the front.

Scope: The end-of-queue rule, the new read, the current-card guard, and the regression tests. Not covered: the redesign of start ordering and retry insertion, which is a later plan session.

Judgement: None.

## Records

- ADR 058: An end-of-queue placement for a retry below the spacing floor
- ADR 059: Rejection of a rating on any card but the current one

## Tasks

### T1 — A retry with fewer than the floor's worth of pending cards lands above every row

**Status**

- [x]

**Goal**

Rating "Again" on a run's only pending card requeues it above every row the run has placed, instead of raising, and the enough-cards process is untouched.

**Dependencies**

None.

**Files**

- `app/database_ops/practice_card.py`
- `app/services/practice_run.py`
- `tests/api_tests/test_practice_run.py`

**Details**

The new read (ADR 058), in `app/database_ops/practice_card.py`:

```python
def db_read_max_practice_card_position(db: Session, practice_run_id: uuid.UUID) -> int | None:
    """Highest position among every row of the run, in every status, or None for a run with no rows. The end of the queue for a retry (ADR 058) and the base of a renumber both start above it."""
    return db.exec(select(func.max(PracticeCard.position)).where(PracticeCard.practice_run_id == practice_run_id)).one()
```

It returns `None` when the run has no rows. `db_stage_renumber_pending_practice_cards` calls it in place of its inline `select(func.max(...))`; its `base = (max_position or 0) + 1000` line is unchanged.

The requeue placement (ADR 058), in `app/services/practice_run.py`:

- New helper: `_end_of_queue_position(run_max_position: int) -> int` returns `run_max_position + _POSITION_GAP // 2`. Docstring: "Fewer than RETRY_SPACING_FLOOR cards pending (ADR 058): the retry goes above every row the run has placed, at the same +500 ADR 008's no-successor note uses, so it cannot collide."
- `_insertion_position(pending: list[tuple[PracticeCard, float]], new_score: float) -> int`, signature unchanged, precondition `assert len(pending) >= RETRY_SPACING_FLOOR` at entry, then in order:
  1. `mastery_index = sum(1 for _, score in pending if score < new_score)` (unchanged).
  2. `final_index = max(mastery_index, RETRY_SPACING_FLOOR)`; the `min(RETRY_SPACING_FLOOR, len(pending))` clamp is gone because the precondition makes it the floor.
  3. If `final_index == len(pending)`: return `pending[-1][0].position + _POSITION_GAP // 2` (no successor, unchanged value).
  4. Otherwise return `(pending[final_index - 1][0].position + pending[final_index][0].position) // 2`; `final_index >= 1` because `RETRY_SPACING_FLOOR >= 1` (ADR 058), so there is no `lower is None` branch.
- In `_requeue_failed_card`, inside the existing `for _attempt in range(2)` loop, replacing the `pending`/`scores`/`position` lines:
  ```python
  pending = db_read_pending_practice_cards(db, old_card.practice_run_id)
  if len(pending) < RETRY_SPACING_FLOOR:
      run_max = db_read_max_practice_card_position(db, old_card.practice_run_id)
      assert run_max is not None, "the row just rated exists in this transaction"
      position = _end_of_queue_position(run_max)
  else:
      scores = card_mastery(
          db, strategy, [c.card_id for c in pending] + [old_card.card_id], field_ids
      )
      position = _insertion_position(
          [(c, scores[c.card_id].mastery) for c in pending], scores[old_card.card_id].mastery
      )
  ```
  Both reads happen per attempt because the renumber moves rows. The try-insert, the renumber call, and the `RuntimeError` after the loop are unchanged.
- Worked values: run max 53000 and no pending → 53500. Fixture of 3 cards at 0/1000/2000, first card failed → 2 pending, run max 2000 → 2500, the value the acceptance test already asserts as the new back. Six pending with a score above all of them → last pending + 500, as today.

The floor guard (ADR 058), in `tests/api_tests/test_practice_run.py`, in `TestRetrySpacingFloor`: `test_retry_spacing_floor_is_at_least_one(self)` asserts `RETRY_SPACING_FLOOR >= 1`, docstring: "`_insertion_position` indexes `pending[final_index - 1]` whenever it runs, which needs the floor to be at least 1 (ADR 058); a floor of 0 would need the no-predecessor branch back." A one-line comment at the constant's definition says the same in fewer words.

Write the HTTP test first and run it alone (`uv run pytest tests/api_tests/test_practice_run.py -k last_pending_card`), so the regression is seen failing with the `RuntimeError` against the committed code; then apply the contracts above. Add the read function and switch the renumber to it. Add `_end_of_queue_position`, rewrite `_insertion_position` per the contracts with a docstring that describes its four steps and keeps the existing sentence that the floor is a clamp, not a fixed placement, and replace the loop body in `_requeue_failed_card` per the contracts. In `_requeue_failed_card`'s docstring, the sentence "Position reflects the card's mastery _after_ this submission's blend, so a badly-missed card resurfaces sooner" gains ", when at least RETRY_SPACING_FLOOR cards are pending; with fewer, the retry goes to the end of the queue (ADR 058)". Do not edit the comment block above the retry loop: it is still accurate, and the checkout may carry another session's uncommitted hunk in it (run `git diff app/services/practice_run.py` before starting); if that hunk is still present it will share a hunk with the loop edits, so stage with `git add -p`'s edit mode or wait for it to land, and never commit it as this task's. Tests, in `TestRetrySpacingFloor` unless named otherwise:

1. `test_last_pending_card_requeues_via_http(self, client, db, existing_user, session_cards, session_config)`: POST `/api/practice_runs` with `session_config` as `TestPracticeRunHTTPFlow.test_fail_and_requeue_via_http` does; twice, GET `/api/practice_runs/{id}/state` and POST `/api/practice_cards/{current_card.practice_card_id}/rate` with every answer rated 4, asserting 200 and `requeued_practice_card` is `None`; on the third card rate every answer 1 and assert 200, `requeued_practice_card` not `None`, its `status` `"pending"`, and its `position == 2500`; GET state and assert `session_status == "active"`, `current_card.practice_card_id` equals the requeued id, `current_card.attempt == 2`; rate the requeued row with every answer 1 and assert 200 and a second requeue with `position == 3000`; rate that row with every answer 4 and assert 200 with `requeued_practice_card` `None`; GET state and assert `session_status == "completed"`, `current_card` is `None`, `progress.passed == 3`. The positions are exact because the fixture generates 3 cards at 0, 1000, 2000 and nothing else moves them.
2. `test_end_of_queue_position_is_run_max_plus_half_gap(self)`: `_end_of_queue_position(53000) == 53500`.
3. `test_insertion_position_requires_the_floors_worth_of_pending(self)`: `with pytest.raises(AssertionError): _insertion_position([(self._card_at(0), 0.5)], 0.0)`.
4. `test_retry_spacing_floor_is_at_least_one` per the floor-guard contract.
5. `test_mastery_index_deeper_than_the_floor_wins` is unchanged and must still pass.
6. Rewrite `TestPositionCollisionFallback.test_renumber_and_retry_on_collision`: the current version fails a non-front card with 2 others pending, which now takes the end-of-queue branch and never calls the stubbed `_insertion_position`. New shape: add 2 cards with `TestRetrySpacingFloor._add_cards(client, existing_deck, session_fields, 2, start_at=3)` (5 cards, 4 pending after the fail; add `client`, `existing_deck`, `session_fields` to the fixture list); rate the front card (`pending[0]`, position 0) with every answer 1; stub `_insertion_position` to return 1000, `pending[1]`'s position; assert the requeue succeeded with `position == 1000`, that `pending[1]` refreshed has `position != 1000`, and that pending positions are unique. Keep the existing docstring's point that the natural formula never collides on its own; drop the pinning of `occupied` to 0.

**Out of scope**

- The start ordering and the midpoint rule between two pending rows: the later redesign.
- `RETRY_SPACING_FLOOR`'s value.
- The `RuntimeError` guard, which stays.
- The retry loop's comment block.
- The current-card guard: T2.
- The frontend.
- Any write to the local dev database.
- The ADR amendment: /justify.

**Done when**

- The HTTP test was observed failing with `RuntimeError: could not find a free position` before the fix, quoted in the Debrief.
- `uv run pytest` passes in full, including the tests above, `test_full_fail_requeue_cycle`, every test in `TestForcedFailedAnswerFields`, and all four tests in `test_layering_guard.py`.
- `grep -n "func.max" app/database_ops/practice_card.py` prints exactly one line, inside `db_read_max_practice_card_position`.
- `grep -n "2 \* _POSITION_GAP\|else -_POSITION_GAP\|min(RETRY_SPACING_FLOOR" app/services/practice_run.py` returns nothing.

**Debrief**

Before the fix, `test_last_pending_card_requeues_via_http` failed at its third rating with `RuntimeError: could not find a free position for a requeued card in session 36c68202-28ce-4f9e-8fd0-86637f0de2ab after renumbering` (`app/services/practice_run.py`). No deviations from the contracts. Small test additions beyond the spec: the HTTP test asserts the run start returns 201 and that the second retry is the current card before rating it; the rewritten collision test asserts `len(pending) == 5` and that `pending[1]` sits at 1000 before stubbing.

### T2 — Only the current card can be rated

**Status**

- [x]

**Goal**

Rating a pending card that is not the front of its run's queue is refused with a 400 and writes nothing, and the three tests that rated a non-front card play their runs front-first instead.

**Dependencies**

- T1

**Files**

- `app/services/practice_run.py`
- `tests/api_tests/test_practice_run.py`

**Details**

The current-card guard (ADR 059): in `submit_rating`, immediately after the "already been rated" check and before the ratings-coverage check:

```python
current = db_read_current_practice_card(db, practice_card.practice_run_id, user_id)
if current is None or current.id != practice_card.id:
    raise ValueError("practice_card is not the current card")
```

The docstring's list of raised errors gains this third `ValueError`. Route behaviour: `POST /api/practice_cards/{id}/rate` returns 400 with that detail; nothing is written. The state and breakdown routes are unchanged.

The three tests ADR 059's guard broke besides the collision test (`test_failing_the_same_card_again_reapplies_the_floor`, `test_progress_counts_all_four_buckets_end_to_end`, `test_full_breakdown_all_four_buckets`) must be rewritten to rate whichever card is at the front, product code unchanged: the floor test passes the three cards ahead of the retry with its deck raised to eight cards; the progress test hands out roles by queue position; the breakdown test moves its stuck card into a second deck whose answer field is archived at start and drives the run from the state endpoint with a per-card rating script.

The checkout may already carry the guard and the new test uncommitted; run `git diff` before starting and build on what is there. Add the guard per the contract above, importing nothing new. Add to `TestPracticeRunHTTPFlow`: `test_rate_non_current_pending_card_rejected(self, client, db, existing_user, session_cards, session_config)`: start a run via POST as `test_rate_already_rated_card_rejected` does; read the run's pending rows through `db` ordered by position; POST rate for `pending[1].id` with every one of its `answers` rated 4 and assert 400 with detail `practice_card is not the current card`; assert through `db` that `pending[1]` refreshed is still `pending` and that `select(ReviewLog).where(ReviewLog.review_group_id == pending[1].id)` returns nothing; then POST rate for `pending[0].id` and assert 200. Then rewrite the three tests, product code untouched:

1. `TestRetrySpacingFloor.test_failing_the_same_card_again_reapplies_the_floor`: `_add_cards(..., 5, start_at=3)` for 8 cards at 0..7000. After the existing `pending_after_first[3].id == first_requeue.id` assertion, also assert `first_requeue.position == 3500` (midpoint of 3000 and 4000; the failed card scores 25 against unreviewed cards at 50, so the floor alone sets the index). Then three times: `front = db_read_current_practice_card(db, session.id, existing_user.id)`, assert `front is not None and front.id != first_requeue.id`, `submit_rating` it with every answer rated 4, `db.commit()`. Assert the current card is now `first_requeue`, then fail it as the test already does. Keep `pending_after_second[3].id == second_requeue.id` and add `second_requeue.position == 6500` (5 pending after the fail: 4000, 5000, 6000, 6500, 7000). Update the docstring-style comments to say the retry is rated at the front.
2. `TestRunState.test_progress_counts_all_four_buckets_end_to_end`: replace the four named `make_card` calls with `card_ids = [make_card(f"card{i}") for i in range(4)]` and assert the run's rows' `card_id`s equal that set. Read `queue`, the pending rows ordered by position, and assert `[pc.position for pc in queue] == [0, 1000, 2000, 3000]`. Rate `queue[0]` with `{answer["id"]: 1}`: 200, `requeued_practice_card` not None, its `position == 3500`. Rate `queue[1]` with 4: 200. Archive `answer` as today: 200. Rate `queue[2]` with 1: 200, `requeued_practice_card` None. The mid-run progress assertion is unchanged; add `mid_data["current_card"]["practice_card_id"] == str(queue[3].id)`. Replace the unordered `for pc in remaining` loop with two rates in this order: `queue[3]`, then the requeued row by the id from the first response, each with 4 and asserting 200. Final assertions unchanged. The docstring's role list becomes positional ("the front card fails and requeues, the second passes, the third fails after the archive, the fourth is never seen mid-run").
3. `TestBreakdown.test_full_breakdown_all_four_buckets`: add `existing_subject` to its fixture list. Keep `_setup_deck` and the three deck-1 cards (`first_card`, `retry_card`, `many_card`) as they are; leave `_setup_deck` itself alone. Replace the deck-1 stuck card with a second deck: `POST /api/decks` with `name "Stuck deck"`, `subject_id existing_subject["id"]`, and `field_defs` `prompt`, `answer`, `filler`, all `text`, exactly as `TestRerun.test_rerun_drops_a_stale_deck_but_keeps_others` builds its Deck A; one card with values `"stuck prompt"`, `"stuck answer"`, `"x"`, whose id is `stuck_card`; a config `"Stuck config"` with that deck's `prompt` as the only prompt and `answer` as the only answer, pools empty. Start the run with `[config["id"], stuck_config["id"]]`. Immediately `DELETE /api/fields/{deck-2 answer id}` and assert 200. Keep the `by_card_id` assertion that the run holds exactly the four cards. Delete the `fail`/`rate_pass` helpers and the `retry_2`/`many_2`/`many_3` ids; nothing after them reads them. Replace them with `script = {first_card: [4], retry_card: [1, 4], many_card: [1, 1, 4], stuck_card: [1]}` and a loop of exactly 7 iterations: GET state, assert `current_card` is not None, `rating = script[card["card_id"]].pop(0)`, POST rate with every answer at that rating, assert 200; assert `requeued_practice_card` is not None when `rating == 1` and the card is not `stuck_card`, and is None otherwise. After the loop assert every list in `script` is empty, then GET state and assert `current_card is None` and `session_status == "completed"`, replacing the existing completed check. Every assertion from `GET .../breakdown` onward is unchanged: the stuck attempt's answer field is still named `answer`, and the order check derives its expectation from the database. Add a docstring saying the stuck card lives in a second deck whose answer field is archived at start, because a single deck of four cannot fail one card twice before the archive and still leave another unrated until after it.

**Out of scope**

- A 409 or a structured `{code, message}` detail.
- Any frontend change.
- The state route's completion transition.
- `db_read_current_practice_card`'s query.
- `_setup_deck`'s docstring.
- Any change under `app/` beyond the guard and its docstring sentence.

**Done when**

- `test_rate_non_current_pending_card_rejected` was observed failing against T1's committed code, quoted in the Debrief.
- `uv run pytest` passes in full, including the new test, `test_rate_already_rated_card_rejected`, `test_renumber_and_retry_on_collision` as rewritten in T1, and the three rewritten tests.
- `grep -rn "is not the current card" app/ tests/` shows exactly one site in `app/` and one in `tests/`.
- `git diff main -- app/` touches only `app/services/practice_run.py` and, from T1, `app/database_ops/practice_card.py`.

**Debrief**

Before the guard, `test_rate_non_current_pending_card_rejected` failed against T1's committed code with `assert 200 == 400` on rating `pending[1]`. No deviations from the Details. Small additions: the breakdown test asserts 201 on creating the stuck deck and its card; the floor test's three front passes use `rng=random.Random(4)`.
