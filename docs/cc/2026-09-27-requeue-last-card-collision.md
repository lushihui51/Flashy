# Requeue on the last pending card: the retry can never find a position

**Date:** 2026-09-27 (the diagnosis and the /plan decisions below are from 2026-09-26; the reproduction and this record are from the 27th). **Prompted by:** a live `RuntimeError: could not find a free position for a requeued card in session e47292f2-2e5b-4fe5-a1b1-bc6af0185c86 after renumbering` when the user rated "Again" on the last card of a practice run. **Outcome:** diagnosis only, no code changes. The fix was decided in the 2026-09-26 /plan session (D1–D5 below) and decomposed into a draft of `docs/tasks/017-requeue-end-of-queue.md`, which had not been written or approved when this report was filed; the D-numbers are that session's scratch labels until /justify assigns ADR and MD numbers.

Every code cite below is against `main` at `78fd579`, the committed state (`git show 78fd579:<path>`). The working tree carried an uncommitted docstring-only hunk in `app/services/practice_run.py` from another session, which shifts every line after 840 by one; the traceback in the reproduction shows those working-tree numbers.

## Reproduction (verified)

Smallest triggering input: a run whose pending queue holds exactly one card, rated with any answer field at 1. A throwaway test in the session scratchpad, using the repo's own fixtures against `TEST_DATABASE_URL` (the 3-card `session_cards` deck and `session_config`): start a run, rate the first two cards 4, then rate the third with every answer at 1.

```
PYTHONPATH=. uv run pytest -p tests.conftest <scratchpad>/repro/test_repro_last_card.py -q -x --tb=short
```

```
app/routers/api/practice_run.py:182: in rate_practice_card
    rated, requeued = submit_rating(
app/services/practice_run.py:915: in submit_rating
    requeued = _requeue_failed_card(
app/services/practice_run.py:864: in _requeue_failed_card
    raise RuntimeError(
E   RuntimeError: could not find a free position for a requeued card in session 3ece0d76-... after renumbering
1 failed in 0.44s
```

The arithmetic alone, with no database (verified by evaluating the function): `_insertion_position([], 0.3)` returns `0`, and so does `_insertion_position([], 0.9)`. The score does not matter; an empty queue always yields position 0.

## The mechanism, traced (verified by reading, confirmed by the reproduction)

1. `submit_rating` (`app/services/practice_run.py:869-919`) reads the practice card, records the review group, and then flushes the card's status to `failed` at `:903` **before** calling `_requeue_failed_card` at `:914`. So by the time the requeue looks at the pending queue, the card just rated is no longer in it.
2. `_requeue_failed_card` (`:794-866`) generates the retry's prompts and answers, then loops twice (`:840`). Each attempt reads the run's pending rows (`:841`), computes a position with `_insertion_position`, and tries to insert with `db_try_stage_create_practice_card` (`app/database_ops/practice_card.py:27-45`), which returns `None` on a position collision (`:43-45`). On `None` it calls `db_stage_renumber_pending_practice_cards` and tries once more. After two `None`s it raises the `RuntimeError` at `:863-866`.
3. `_insertion_position` (`:765-791`) computes `final_index = max(mastery_index, min(RETRY_SPACING_FLOOR, len(pending)))` (`:776`). With `pending` empty, `final_index` is 0, so both `lower` and `upper` are `None`. The two fallbacks then fire together: `lower_pos = -_POSITION_GAP` (`:784`) and `upper_pos = _POSITION_GAP` (`:789`), and the midpoint at `:791` is `(-1000 + 1000) // 2 = 0`.
4. Position 0 is always taken. `start_practice_run` (`:262`) and the rerun path (`:349`) set `next_position = 0`, and `_snapshot_and_generate_deck` writes the first generated row at that position (`:211`) before stepping by `_POSITION_GAP = 1000` (`:216`, constant at `:69`). Rated rows keep their position forever: `db_stage_renumber_pending_practice_cards` (`app/database_ops/practice_card.py:123-141`) renumbers pending rows only (`:131`). The first row of a run is the first card served, so it has been rated, and therefore is no longer pending, before any requeue can happen. Position 0 is therefore occupied by a non-pending row in every run that has reached a requeue. Verified by reading; the live run below agrees (its row at position 0 is `passed`).
5. The insert collides. The renumber fallback has nothing to renumber (no pending rows), so the second attempt computes 0 again, collides again, and the loop raises.

The whole request rolls back. The route (`app/routers/api/practice_run.py:174-189`) maps only `LookupError` and `ValueError`; the `RuntimeError` propagates, and the request-scoped session is a `with Session(engine)` block (`app/database.py:27-29`), whose exit discards the uncommitted transaction. That SQLAlchemy behaviour is inferred from the library, not stepped through; the live-run evidence below is the verification that nothing persisted.

The consequence: rating "Again" on a run's last pending card fails on every run, every time, with a 500. The user can only pass the last card, and a retry of it that fails again is equally unrateable.

## The live run at diagnosis (verified, read-only query on the dev database)

Run `e47292f2-2e5b-4fe5-a1b1-bc6af0185c86` ("Sep 24, 2026 at 5:02 PM"), status `active`, 88 `practice_card` rows. Exactly one is `pending`, at position 53000, with zero `review_log` rows keyed to it; every other row has exactly one review row. The row at position 0 is `passed`. The failed request left nothing behind: no review rows, no mastery rows, no retry row. Nothing needs repairing; after the fix, rating that card will work.

Two side observations from the same rows: the position halving ADR 008 predicts is visible (a chain at 25875, 25937, 25968 from repeated retries in one stretch), and no renumber ever ran in this run (every position is either a multiple of 1000 or a midpoint chain below one).

## Why the tests missed it (verified by reading `tests/api_tests/test_practice_run.py`)

Every test that fails a card fails the **first** card of a 3- or 6-card run: `test_fail_and_requeue_via_http` (`:196`) rates the current card, `test_full_fail_requeue_cycle` (`:234-241`), the forced-answer-field tests (`:313`), and both floor tests (`:490-493`, `:551-554`) pick `.first()` by position. That leaves at least two cards pending at requeue time. The direct unit test of `_insertion_position` (`:514-524`) passes six cards. `TestPositionCollisionFallback.test_renumber_and_retry_on_collision` (`:594-660`) is the only test that reaches the renumber, and it does so by stubbing `_insertion_position` to return 0 and pinning a *different* pending card at 0 (`:625`) before rating `pending[1]` (`:630`), so the renumber always has something to move. No test rates the last pending card, and no test passes an empty list to `_insertion_position`.

## Where the docs and the code disagree

- **ADR 037** states: "With fewer than 3 pending cards remaining, the retry goes to the end of the queue." The code implements that for one and two remaining, through the `upper is None` fallback at `:789` (last pending + 500). For zero remaining there is no end at all; the position is 0. The ADR's promise is unimplemented for the empty queue, and the ADR never says what the end of an empty queue is.
- **ADR 008**'s status note records the no-successor fallback as "the midpoint of the last position and last + 1000 (+500)". It is silent on the no-predecessor fallback and on the empty queue.
- **Task 009 T4**'s contract (`docs/tasks/009-practice-run-mechanics.md:62`) says the midpoint is computed "exactly as today (gap defaults at the ends, collision-renumber retry unchanged)". The "gap default" at the lower end is the `-1000` that produces 0.
- **`docs/cc/2026-08-19-practice-card-requeue-spacing.md`** observed, under the pre-floor rule, that the no-predecessor branch (`upper.position - 2 * _POSITION_GAP`) landed the retry on the just-failed row's own position and that the renumber fallback rescued it, calling the resulting position "an accident of the renumbering scheme". That was the same fallback arithmetic, rescued only because the queue was not empty.

## Decisions the builder made on its own (no ADR, task, or contract records them)

- The no-predecessor virtual boundary (`lower_pos = upper.position - 2 * _POSITION_GAP if upper else -_POSITION_GAP`, `:784`) dates from `011f6ef` (2026-08-18, "feat: practice session generation and rating flow"). No document mentions it (`grep -rn "predecessor\|-1000\|- 2 \*" docs/adr docs/tasks` finds nothing). Since ADR 037's floor, `final_index` is at least 1 whenever the queue is non-empty, so the branch is reachable only from the empty queue, and there it is wrong.
- The two-attempt limit on the requeue loop (`:840`), and the `RuntimeError` as the outcome of exhausting it, are undocumented beyond the code comment above the loop.
- `submit_rating` accepts **any** pending practice card of the user's, not only the front of the queue: its checks are existence and ownership (`:884-886`), pending status (`:887-888`), and ratings coverage (`:889-890`). No contract says whether rating a non-front card is allowed; the frontend only ever rates `current_card` (`frontend/src/pages/PracticeRunPage.tsx:120-121`), and the one caller that rates a non-front card is the collision test above.

## Decisions taken in the 2026-09-26 /plan session (recorded here; /justify assigns the permanent numbers)

- **D1 — A retry's end of the queue is above every row the run has placed.** With fewer than `RETRY_SPACING_FLOOR` cards pending, zero included, the retry's position is the run-wide maximum `practice_card.position` over every status plus 500, read through a new `database_ops` function. Reasoning: it depends only on integer positions and ascending serving, so it survives the user's planned redesign of start ordering and retry insertion, and it is what the renumber already treats as "above everything" (`app/database_ops/practice_card.py:137`). Rejected: the rated card's own position plus 500, because the API did not enforce that the rated card is the front (D5 now does); widening the retry loop or the renumber, because with nothing pending there is nothing to renumber.
- **D2 — A standalone fix cycle now**, scoped to the end-of-queue rule, the new read, the current-card guard, the regression tests, this report, and an ADR amendment; the redesign is a later plan session. Reasoning: every run crashes at its last card today. Rejected: folding the fix into the redesign.
- **D3 — The unreachable no-predecessor branches are deleted** and a test pins `RETRY_SPACING_FLOOR >= 1`. Reasoning: the empty queue was the only path still reaching them, wrongly, and the redesign will not need them. Rejected: leaving them for the redesign.
- **D4 — The two cases stay decoupled.** Fewer than the floor pending: the end of the queue per D1, with no mastery lookup. At least the floor: the mastery-ordered process runs unchanged, including its existing last-pending + 500 when it places the retry after every pending card. Reasoning: one concept per case, and the enough-cards process must not change according to where it happens to land. Rejected: one shared end-of-queue formula for both cases (proposed, then withdrawn once D5 removed its only motivation).
- **D5 — Only the current card can be rated.** `submit_rating` rejects a pending card that is not the run's lowest-position pending row with `ValueError("practice_card is not the current card")`, which the route maps to 400, writing nothing. Reasoning: no one is supposed to rate a non-front card, the frontend never does, and the enough-cards placement relies on every rated row sitting below every pending row, which the guard enforces using the one existing definition of "current" (`db_read_current_practice_card`, `app/database_ops/practice_card.py:74-89`). Rejected: leaving the API open and relying on the renumber fallback. Revisit only if a feature ever needs to rate a card that is not at the front; a "skip" would be a repositioning operation, not a rating.

What these extend or contradict: ADR 037 (its "end of the queue" gains a definition for the empty queue), ADR 008's status note (the no-successor fallback stays; a no-predecessor case no longer exists), task 009 T4's contract line quoted above (now holds only with the floor's worth of pending cards), task 006's rating endpoint (a third 400 reason), and the assertion shape of `test_renumber_and_retry_on_collision`, which rates a non-front card and must be rewritten to rate the front card and collide with the second.

## Noticed in passing

- The renumber fallback is a no-op whenever nothing is pending, so in that state the loop's two attempts are guaranteed identical; the "one retry" comment above the loop does not say so.
- `db_try_stage_create_practice_card` leaves the position constraint IMMEDIATE after a successful insert and resets it to DEFERRED only on collision; ADR 055 already records this asymmetry.
- The working tree at the time of this report carried uncommitted hunks from another session in `app/services/practice_run.py` (a comment block above the requeue loop) and `app/database_ops/mastery_log.py` (a docstring), plus an untracked `docs/cc/2026-09-24-sync-final-before-ui-ux.md`.
- The state route's docstring (`app/routers/api/practice_run.py:115`) says `session_status` already reads "completed" once nothing is pending; after the fix, a requeue on the last card keeps the run active, which is the intended behaviour, not a regression.
