# 017 — A retry's end of the queue

The fix cycle from the 2026-09-26 /plan session: rating "Again" on a run's only pending card raised `RuntimeError: could not find a free position for a requeued card ... after renumbering` on every run, at its last card. The diagnosis, the reproduction, and the live-run evidence are in `docs/cc/2026-09-27-requeue-last-card-collision.md`, which cites the decisions by the planning session's scratch labels; the mapping is in the ADRs section below. Branch: `fix/requeue-end-of-queue`, cut from `main` at `78fd579` or later. The start-ordering and retry-insertion redesign the user intends is a later plan session (MD-1); this file changes where a retry goes when fewer than the floor's worth of cards are pending, and closes the API to rating a card that is not at the front.

Earlier task files affected by name only, for the next sync's Superseded bullets (nothing here invalidates a checked task): task 009 T4's contract line "the sparse-position midpoint is then computed between `pending[final_index-1]` and `pending[final_index]` exactly as today (gap defaults at the ends, collision-renumber retry unchanged)" now holds only with at least the floor's worth of pending cards (ADR 058); task 006's rating endpoint contract gains a third 400 reason (ADR 059); `docs/cc/2026-08-19-practice-card-requeue-spacing.md` describes the pre-floor "insert before the front" branch that ADR 058 removes.

## ADRs

Decisions this file implements; full context and rejected alternatives live in the ADRs. The report `docs/cc/2026-09-27-requeue-last-card-collision.md` cites them by the planning session's scratch labels: D1, D3, and D4 are ADR 058, D5 is ADR 059, D2 is MD-1.

- **ADR 058 — A retry below the spacing floor goes above every row the run has placed**: with fewer than `RETRY_SPACING_FLOOR` cards pending, zero included, the retry is placed at the run-wide maximum position over every status plus 500, read through `db_read_max_practice_card_position`, with no mastery lookup; with at least the floor's worth pending, ADR 037's mastery-ordered insertion runs unchanged, its no-predecessor branch deleted and `RETRY_SPACING_FLOOR >= 1` pinned by a test. Amends ADR 037 and ADR 008's status note.
- **ADR 059 — Only the current card can be rated**: `submit_rating` rejects a pending card that is not the run's lowest-position pending row with `ValueError("practice_card is not the current card")`, a 400 at the route, nothing written.

## Minor decisions

- **MD-1**: This is a standalone fix cycle on `fix/requeue-end-of-queue`, scoped to the end-of-queue rule, the new read, the current-card guard, the regression tests, the investigation report (written before this file), and the ADR amendment; the redesign of start ordering and retry insertion is a later plan session. Rejected: folding the fix into that redesign.

## Contracts

### New read (ADR 058)

- `app/database_ops/practice_card.py`: `db_read_max_practice_card_position(db: Session, practice_run_id: uuid.UUID) -> int | None`: `db.exec(select(func.max(PracticeCard.position)).where(PracticeCard.practice_run_id == practice_run_id)).one()`; `None` when the run has no rows. Docstring: "Highest position among every row of the run, in every status, or None for a run with no rows. The end of the queue for a retry (ADR 058) and the base of a renumber both start above it." `db_stage_renumber_pending_practice_cards` calls it in place of its inline `select(func.max(...))`; its `base = (max_position or 0) + 1000` line is unchanged.

### Requeue placement (ADR 058)

- `app/services/practice_run.py`, new helper: `_end_of_queue_position(run_max_position: int) -> int` returns `run_max_position + _POSITION_GAP // 2`. Docstring: "Fewer than RETRY_SPACING_FLOOR cards pending (ADR 058): the retry goes above every row the run has placed, at the same +500 ADR 008's no-successor note uses, so it cannot collide."
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

### Floor guard (ADR 058)

- `tests/api_tests/test_practice_run.py`, in `TestRetrySpacingFloor`: `test_retry_spacing_floor_is_at_least_one(self)` asserts `RETRY_SPACING_FLOOR >= 1`, docstring: "`_insertion_position` indexes `pending[final_index - 1]` whenever it runs, which needs the floor to be at least 1 (ADR 058); a floor of 0 would need the no-predecessor branch back." A one-line comment at the constant's definition says the same in fewer words.

### Current-card guard (ADR 059)

- In `submit_rating`, immediately after the "already been rated" check and before the ratings-coverage check: `current = db_read_current_practice_card(db, practice_card.practice_run_id, user_id)`; `if current is None or current.id != practice_card.id: raise ValueError("practice_card is not the current card")`. The docstring's list of raised errors gains this third `ValueError`. Route behaviour: `POST /api/practice_cards/{id}/rate` returns 400 with that detail; nothing is written. The state and breakdown routes are unchanged.

## Tasks

T2 runs after T1 because both edit `app/services/practice_run.py` and `tests/api_tests/test_practice_run.py`, not because it needs T1's code.

### T1 — A retry with fewer than the floor's worth of pending cards lands above every row (ADR 058) — no dependencies

- [ ] **Goal:** rating "Again" on a run's only pending card requeues it above every row the run has placed, instead of raising, and the enough-cards process is untouched.
- **Files:** `app/database_ops/practice_card.py`, `app/services/practice_run.py`, `tests/api_tests/test_practice_run.py`.
- **Details:** Write the HTTP test first and run it alone (`uv run pytest tests/api_tests/test_practice_run.py -k last_pending_card`), so the regression is seen failing with the `RuntimeError` against the committed code; then apply the Contracts. Add the read function and switch the renumber to it. Add `_end_of_queue_position`, rewrite `_insertion_position` per the Contracts with a docstring that describes its four steps and keeps the existing sentence that the floor is a clamp, not a fixed placement, and replace the loop body in `_requeue_failed_card` per the Contracts. In `_requeue_failed_card`'s docstring, the sentence "Position reflects the card's mastery *after* this submission's blend, so a badly-missed card resurfaces sooner" gains ", when at least RETRY_SPACING_FLOOR cards are pending; with fewer, the retry goes to the end of the queue (ADR 058)". Do not edit the comment block above the retry loop: it is still accurate, and the checkout may carry another session's uncommitted hunk in it (run `git diff app/services/practice_run.py` before starting); if that hunk is still present it will share a hunk with the loop edits, so stage with `git add -p`'s edit mode or wait for it to land, and never commit it as this task's. Tests, in `TestRetrySpacingFloor` unless named otherwise:
  1. `test_last_pending_card_requeues_via_http(self, client, db, existing_user, session_cards, session_config)`: POST `/api/practice_runs` with `session_config` as `TestPracticeRunHTTPFlow.test_fail_and_requeue_via_http` does; twice, GET `/api/practice_runs/{id}/state` and POST `/api/practice_cards/{current_card.practice_card_id}/rate` with every answer rated 4, asserting 200 and `requeued_practice_card` is `None`; on the third card rate every answer 1 and assert 200, `requeued_practice_card` not `None`, its `status` `"pending"`, and its `position == 2500`; GET state and assert `session_status == "active"`, `current_card.practice_card_id` equals the requeued id, `current_card.attempt == 2`; rate the requeued row with every answer 1 and assert 200 and a second requeue with `position == 3000`; rate that row with every answer 4 and assert 200 with `requeued_practice_card` `None`; GET state and assert `session_status == "completed"`, `current_card` is `None`, `progress.passed == 3`. The positions are exact because the fixture generates 3 cards at 0, 1000, 2000 and nothing else moves them.
  2. `test_end_of_queue_position_is_run_max_plus_half_gap(self)`: `_end_of_queue_position(53000) == 53500`.
  3. `test_insertion_position_requires_the_floors_worth_of_pending(self)`: `with pytest.raises(AssertionError): _insertion_position([(self._card_at(0), 0.5)], 0.0)`.
  4. `test_retry_spacing_floor_is_at_least_one` per the Contracts.
  5. `test_mastery_index_deeper_than_the_floor_wins` is unchanged and must still pass.
  6. Rewrite `TestPositionCollisionFallback.test_renumber_and_retry_on_collision`: the current version fails a non-front card with 2 others pending, which now takes the end-of-queue branch and never calls the stubbed `_insertion_position`. New shape: add 2 cards with `TestRetrySpacingFloor._add_cards(client, existing_deck, session_fields, 2, start_at=3)` (5 cards, 4 pending after the fail; add `client`, `existing_deck`, `session_fields` to the fixture list); rate the front card (`pending[0]`, position 0) with every answer 1; stub `_insertion_position` to return 1000, `pending[1]`'s position; assert the requeue succeeded with `position == 1000`, that `pending[1]` refreshed has `position != 1000`, and that pending positions are unique. Keep the existing docstring's point that the natural formula never collides on its own; drop the pinning of `occupied` to 0.
- **Out of scope:** the start ordering and the midpoint rule between two pending rows (the later redesign, MD-1); `RETRY_SPACING_FLOOR`'s value; the `RuntimeError` guard, which stays; the retry loop's comment block; the current-card guard (T2); the frontend; any write to the local dev database; the ADR amendment (/justify); the investigation report, which is already written.
- **Done when:** the HTTP test was observed failing with `RuntimeError: could not find a free position` before the fix, quoted in Notes; `uv run pytest` passes in full, including the tests above, `test_full_fail_requeue_cycle`, every test in `TestForcedFailedAnswerFields`, and all four tests in `test_layering_guard.py`; `grep -n "func.max" app/database_ops/practice_card.py` prints exactly one line, inside `db_read_max_practice_card_position`; `grep -n "2 \* _POSITION_GAP\|else -_POSITION_GAP\|min(RETRY_SPACING_FLOOR" app/services/practice_run.py` returns nothing; `grep -rn "TODO(defer:" app/ frontend/src/` is unchanged from `main`; the commit contains only this task's hunks.
- Notes:

### T2 — Only the current card can be rated (ADR 059) — after T1 (shared files)

- [ ] **Goal:** rating a pending card that is not the front of its run's queue is refused with a 400 and writes nothing.
- **Files:** `app/services/practice_run.py`, `tests/api_tests/test_practice_run.py`.
- **Details:** Add the guard per the Contracts, importing nothing new (`db_read_current_practice_card` is already imported). Add to `TestPracticeRunHTTPFlow`: `test_rate_non_current_pending_card_rejected(self, client, db, existing_user, session_cards, session_config)`: start a run via POST as `test_rate_already_rated_card_rejected` does; read the run's pending rows through `db` ordered by position; POST rate for `pending[1].id` with every one of its `answers` rated 4 and assert 400 with detail `practice_card is not the current card`; assert through `db` that `pending[1]` refreshed is still `pending` and that `select(ReviewLog).where(ReviewLog.review_group_id == pending[1].id)` returns nothing; then POST rate for `pending[0].id` and assert 200.
- **Out of scope:** a 409 or a structured `{code, message}` detail (ADR 022 is for shape-aware callers, and the frontend never sends this request); any frontend change; the state route's completion transition; `db_read_current_practice_card`'s query.
- **Done when:** `uv run pytest` passes in full, including the new test, `test_rate_already_rated_card_rejected`, and `test_renumber_and_retry_on_collision` as rewritten in T1; `grep -rn "is not the current card" app/ tests/` shows exactly one site in `app/` and one in `tests/`; the commit contains only this task's hunks.
- Notes:
