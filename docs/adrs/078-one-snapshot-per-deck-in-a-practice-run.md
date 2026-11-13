# ADR 078: One snapshot per deck in a practice run

## Status

Superseded by ADR 107

## Context

A configuration belongs to one deck, and a deck may hold several. A run spans one or more decks and holds, for each, a `practice_deck` row carrying one configuration's six arrays, cut at run start and read by generation for the run's lifetime (ADR 013).

A practice card references its run and its card, never its snapshot. Within a run, the rows of one card are told apart by position and status alone, and a failed card returns as a new row for the same card.

The API accepts a start from any client, with any list of configuration ids.

A unique constraint fails only when the second row is written, after the decks before it were generated, with an `IntegrityError` that names the constraint and no configuration.

## Decision

We will give a practice run one snapshot per deck, enforced in two places: `practice_deck` carries `UNIQUE (practice_run_id, deck_id)`, and `start_practice_run` in `app/services/practice_run.py` refuses two configurations on one deck with `duplicate_deck`, naming the second configuration, before it writes anything.

A rerun copies the completed run's snapshots, one per deck, and so inherits the rule. New practice replaces within a deck when the user picks a second configuration of it, and the server's refusal is the backstop for an address edited by hand.

## Alternatives considered

### Several configurations of one deck in one run

Rejected because a run's rows for one card would belong to two layouts that nothing tells apart, a deck would appear twice in anything that lists a run's decks, and practice cards would need keying by card and snapshot; a user would see the difference, so the product side decides it first.

### The constraint alone

Rejected because the `IntegrityError` surfaces after generation ran for the decks before it and names no configuration.

### The service check alone

Rejected because rerun and any later writer of `practice_deck` would depend on remembering it, and a duplicate would land silently.

### The frontend alone

Rejected because an address edited by hand reaches the API.

## Consequences

**Positive**

- The developer keys anything about a run's card on `card_id` alone and anything about a run's deck on `deck_id` alone.
- The user whose selection names a deck twice is refused before a row exists, and the refusal names the second configuration.

**Negative**

- The developer keeps the refusal and the constraint saying the same thing; a change to one without the other leaves a duplicate caught late or not at all.

**Neutral**

- The user picks at most one configuration per deck on New practice; a second pick replaces the first.
