# ADR 008: Sparse integer positions for practice card ordering

## Status

Active

## Context

User should be able to practice with the flashcards that they've created. The flashcards should appear one by one, and after the user is done with a flashcard, depending on how comfortable the user is with it, it can either be passed or it can reappear after x amount of cards. x is calculated internally. The mid-session insertions should be done cheaply and must not disturb the position of other cards. Furthermore, this operation happens at most once per card presented. The positions should be persisted so the user can stop mid-session and come back to it later.

Considered alternatives are dense integers, floats with midpoint, and to have practice_session owns a postgres array of practice_card ids, in the order they are shown.

## Decision

We will give every practice card an integer position when it is generated at the start of a run, the first at 0 and each next one 1000 higher, and serve cards in ascending position. A card that must reappear later in the run is given the integer midpoint between the positions of the two cards it is placed between, so no other card's position changes. When the midpoint collides with an existing position, the run's pending cards are renumbered to fresh 1000-spaced gaps and the placement is retried.

## Alternatives considered

### Dense integers

Rejected because insert-between requires shifting every subsequent card's position, which is O(n) writes per reposition instead of O(1)

### Floats with midpoint

Rejected because float precision exhausts silently after repeated halving, whereas integer division produces a detectable collision that triggers rebalancing.

### An ordered array of practice card ids on the session

The array was not rejected on operation count: shifting an array of at most a few thousand IDs is trivial in memory, and Postgres writes the whole row on updates anyway. However, sparse positioning allows all mid-session logic to exist on a practice_card, including the comfort_level and times_revised, and adding an array to practice_session means updating 2 tables. Moreover, practice_card.card_id is a foreign key, and when the flashcard is deleted the practice_card will cease to exist by CASCADE. This means if we use the array, the practice_card id will also need to be removed, creating a synchronization burden. Lastly finding the next card due with an array needs unnest(...) WITH ORDINALITY to join order to content, which is awkward.

## Consequences

**Positive**

- The developer repositions a card by writing one row; no other card's position changes.
- The developer gets a detectable collision when a gap is exhausted, where floats would lose precision silently.
- The developer keeps every mid-run fact on the practice card alone, so each card pass updates one table.
- The developer has nothing to synchronize when a flashcard is deleted; its practice cards cascade.
- The developer queries serving order natively, as `ORDER BY position LIMIT 1`.
- The database stores one extra integer per practice card.

**Negative**

- The developer accepts a limit of log2(gap) repositionings between two cards before a renumber, which is O(n) in the run's cards; cheap, because a run holds at most a few thousand cards and positions exist for one user's one run.

**Neutral**
