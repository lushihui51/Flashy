# ADR 008: Use sparse positions for practice card ordering

## Status

Accepted

## Context

User should be able to practice with the flashcards that they've created. The flashcards should appear one by one, and after the user is done with a flashcard, depending on how comfortable the user is with it, it can either be passed or it can reappear after x amount of cards. x is calculated internally. The mid-session insertions should be done cheaply and must not disturb the position of other cards. Furthermore, this operation happens at most once per card presented. The positions should be persisted so the user can stop mid-session and come back to it later.

Considered alternatives are dense integers, floats with midpoint, and to have practice_session owns a postgres array of practice_card ids, in the order they are shown.

## Decision

I will use sparse positioning to assign a position for every flashcard in the beginning of a practice session, for example the first card will get assigned 0, the second 1000, the third 2000, etc. The flashcards are shown in the order of their positions, and after a flashcard is presented, if it's at the ith position and needs to reappear after x cards, then its position will be updated to (i+x)th card's position + (i+x+1)th card's position divided(integer division) by 2 (the mid point between the i+xth and the i+x+1th card). If there is no i+x+1th card, then the new position assigned will be i+xth card's position + 1000 instead.

### Alternative considered: dense integers

Rejected because insert-between requires shifting every subsequent card's position, which is O(n) writes per reposition instead of O(1)

### Alternative considered: floats with midpoint

Rejected because float precision exhausts silently after repeated halving, whereas integer division produces a detectable collision that triggers rebalancing.

### Alternative considered: practice_session owns a postgres array of practice_card ids, in the order they are shown.

The array was not rejected on operation count: shifitng an array of at most a few thousand IDs is trivial in memory, and Postgres writes the whole row on updates anyway. However, sparse positioning allows all mid-session logic to exist on a practice_card, including the comfort_level and times_revised, and adding an array to practice_session means updating 2 tables. Moreover, practice_card.card_id is a foreign key, and when the flashcard is deleted the practice_card will cease to exist by CASCADE. This means if we use the array, the practice_card id will also need to be removed, creating a synchronization burden. Lastly finding the next card due with an array needs unnest(...) WITH ORDINALITY to join order to content, which is awkward.

## Consequences

Benefits:

- Repositioning would not involve changing the position of other cards.
- The program can detect when the limit of repositioning at position x has been reached.
- All mid-session logic lives on the practice_card alone, and only the practice_card table will get updated with each card pass.
- There is no synchronization burden when a flashcard is deleted.
- Keeps data in shapes that the relational engine queries natively, for example using ORDER BY position LIMIT 1.
- Only an extra integer is stored per practice_card, which is light.

Costs:

- There is a limit to how many times cards can be repositioned at position x, specifically log2(gap). When midpoint returns a collision, renumber the remaining cards' position to 1000-spaced gaps. It can take up to O(n)(let n be the deck size), which is accepted because it's cheap: deck size is at most a few thousand, and it happens rarely. The rebalancing is also safe: the positions are ephemeral, and exists for one user's one session.
- Finding the right position to reposition a card can take up to O(n)(let n be the deck size), which is accepted because n is at most a few thousand, bounded by the deck size.

## Amendment (2026-08-19, Phase 7 QA)

This ADR describes `x` — how many cards later a failed card should reappear — as "calculated internally," but never defines how. As shipped, `x` is not computed at all: `_insertion_position` (`app/services/practice_session.py`) does a pure mastery-ascending merge-insertion of the failed card against the session's current pending cards, with no minimum-gap floor. In practice this means a card whose post-fail mastery becomes the session-wide minimum — common for a card that was already weak enough to fail — is inserted immediately before whatever was next in the queue, making it literally the very next card served (`x = 0`), not "after x cards" in any spaced sense.

This was surfaced during manual Phase 7 testing (a small deck produced a tight loop of 2 repeating cards) and confirmed by tracing the code rather than assumed. Defining a real `x` — and whatever minimum-gap guarantee should back it — is deferred to a follow-up change; `_insertion_position`/`_requeue_failed_card` in the same file is what that change will replace or extend.
