# ADR 059: Only the current card can be rated

## Status

Accepted. Amends nothing; makes explicit an invariant ADR 008's serving order and ADR 037's placement had assumed. Implemented by task 017.

## Context

`submit_rating` checked that the practice card exists and belongs to the user, that it is pending, and that the ratings cover exactly its answer fields. It did not check that the card is the run's current card: the lowest-position pending row, which `db_read_current_practice_card` serves by ADR 008's `ORDER BY position LIMIT 1`. The frontend only ever rates `current_card`, and the one caller that rated a non-front card was a test. Yet the requeue arithmetic (ADR 037, ADR 058), the breakdown's chain fold, and the `attempt` number all rest on cards being rated front-first. That is what keeps every rated row below every pending row, which in turn is what makes "last pending + 500" and the midpoints collision-free by construction rather than by luck. The planning of ADR 058 found this assumption unenforced while weighing where a retry's "end of the queue" should be.

## Decision

`submit_rating` rejects a pending practice card that is not its run's current card with `ValueError("practice_card is not the current card")`, checked after the already-rated rejection and before the ratings-coverage one. The route maps it to 400 like the other rating rejections, and nothing is written. The current card is read with `db_read_current_practice_card`, so "current" keeps its single definition.

## Alternatives considered

### Leave the API open

Rejected. It made the positioning's correctness depend on client behaviour, and the renumber fallback was silently absorbing the consequence in the one test that exercised a non-front rating.

### A 409, or a structured `{code, message}` detail

Rejected. The existing "already rated" rejection is a plain-string 400, and ADR 022's structured detail is for callers that branch on the code; no caller sends this request.

### Reposition the rated card instead of rejecting

Rejected. No feature asks for it, and a "skip" would be a repositioning operation, not a rating.

## Consequences

Benefits:

- Every rated row lies below every pending row by construction; ADR 058's placements cannot collide except through gap exhaustion.
- One definition of "current", the same query the state route serves.

Costs:

- One extra read per rating.
- A future feature that rates a card other than the front must revisit this ADR.
- A test that fails a non-front card must rate the front instead; the collision test was rewritten for it.
