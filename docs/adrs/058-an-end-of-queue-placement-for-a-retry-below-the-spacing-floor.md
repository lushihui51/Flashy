# ADR 058: An end-of-queue placement for a retry below the spacing floor

## Status

Active

## Context

On 2026-09-26 the user rated "Again" on the last card of a live practice run and the request failed with `RuntimeError: could not find a free position for a requeued card ... after renumbering`. Reproduced against the test database with a 3-card run: two passes, then one "Again". `submit_rating` flushes the rated card to `failed` before the requeue reads the pending queue, so on the last card the queue is empty. `_insertion_position` then takes both of its "no neighbour" fallbacks, `-1000` below and `+1000` above, and their midpoint is 0. Position 0 always holds the run's first generated row, which was rated before any requeue could exist and never moves: rated rows keep their positions forever, and the renumber fallback moves pending rows only. With nothing pending the renumber is a no-op, the second attempt is identical, and the loop raises. Every such request rolled back whole, so no run held partial rows.

The fallbacks date from the 2026-08-18 generation commit and no ADR recorded them. ADR 037 promised that "with fewer than 3 pending cards remaining, the retry goes to the end of the queue", and defined that end only through the same fallbacks, which give "last pending + 500" for one or two remaining and 0 for none. No test rated the last pending card. Since ADR 037's floor makes the insertion index at least 1 whenever the queue is non-empty, the no-predecessor fallback was reachable from the empty queue alone, and only wrongly.

The user intends to redesign how cards are ordered at the start of a run and where a retry is inserted. What stays across that redesign is the floor, and the rule that a retry with too few cards ahead of it simply goes to the end.

## Decision

We will decouple the requeue into two cases, at the point where the pending queue is read.

With fewer than `RETRY_SPACING_FLOOR` cards pending, zero included, no mastery is looked up. The retry is placed at the run-wide maximum `practice_card.position` over every status plus 500 (`_end_of_queue_position`), the max read by `db_read_max_practice_card_position`, which the renumber also bases itself on. Nothing in the run can sit at or above that position, so the insert cannot collide.

With at least the floor's worth pending, the floor's mastery-ordered insertion runs unchanged: `final_index = max(mastery_index, RETRY_SPACING_FLOOR)`, the midpoint between predecessor and successor, or the last pending row plus 500 when there is no successor. `_insertion_position` takes the floor's worth of pending cards as a precondition. Its no-predecessor branch is deleted, since with the floor at least 1 a predecessor always exists, and a test pins `RETRY_SPACING_FLOOR >= 1`.

The two-attempt renumber loop and its `RuntimeError` stay as the guard for the one collision left: a midpoint between two pending rows whose gap is exhausted.

## Alternatives considered

### The rated card's own position plus 500

Rejected. Correct only when the rated card is the front of the queue, which the API did not enforce at the time and the current-card rule now does, and it would rely on that invariant having held for every row already in the run. The run-wide max holds regardless of history and costs one trivial query.

### One end-of-queue formula for both cases

Proposed as "run max + 500 wherever the retry has no successor", so the function would have a single end branch. Rejected: the enough-cards process would then change according to where it happens to land, and its only motivation, a rated row sitting above the last pending row, is exactly the situation the current-card rule makes impossible.

### Widen the retry loop, or make the renumber move rated rows

Rejected. With nothing pending there is nothing to renumber, so a third attempt computes the same 0; and rated rows keep their positions because the completion breakdown orders cards by their first attempt's position, which must never move.

### Leave the dead branches for the redesign

Rejected. The empty queue was the only path still reaching them, and it reached them wrongly; the redesign will not need them.

## Consequences

**Positive**

- The user can rate "Again" on the last pending card; a run's final retries chain at the end, each above everything placed before it.
- The developer redesigning placement later replaces the enough-cards branch without touching the below-floor rule, which depends only on integer positions and ascending serving.
- The developer gets no collision except a midpoint between two pending rows whose gap is exhausted, which is the renumber's job.

**Negative**

- The server reads one extra `max(position)` per below-floor requeue.
- The developer keeps `_insertion_position`'s precondition and cannot set `RETRY_SPACING_FLOOR` to 0 without restoring the no-predecessor branch.
- The developer reads the floor's single formula as two branches, one per case.

**Neutral**
