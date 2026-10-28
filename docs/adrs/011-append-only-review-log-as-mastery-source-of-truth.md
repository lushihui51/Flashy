# ADR 011: Append-only review_log as the mastery source of truth

## Status

Active

## Context

Mastery (how well a user knows a given field of a given card) could be stored as primary state, updated in place every time the user rates a card. That's the obvious shape. But it has a fatal problem for an app that expects to tune its scoring algorithm over time: if a mastery value is primary state, changing how mastery is computed means somehow reinterpreting every existing stored value under new semantics — a lossy, unverifiable migration.

Separately, a naive eager design would create a `card_field_mastery` row for every `(card, field_def)` pair the moment a card is created, regardless of whether that pairing is ever actually reviewed — multiplying row count by (cards × fields) up front for pairs nobody may ever touch.

One appearance of a card rates several answer fields at once and shows prompt fields beside them. How many answers a prompt was shown with changes the weight of that prompt's own update, so the update for one appearance cannot be decided one row at a time; it needs the whole group.

## Decision

We will make `review_log` the source of truth for mastery. One row is appended for every rated field review, with the group it belongs to and the prompt fields shown with it. The rating path only ever appends; no code updates or deletes a review except as part of deleting the card or field it belongs to.

Mastery state is a disposable projection of the log. It is rebuilt whole by replaying every row, oldest first, through the same primitive the live write path uses, so a change of scoring strategy is a rebuild, not a migration. A pair of card and field that has never been reviewed has no mastery row, and every read that needs all of a card's fields drives from `field_def` and joins mastery, because an absent row means "never reviewed", not zero.

One `review_group_id` is one appearance, and its rows are logged atomically, in one transaction, and never appended to afterward. A resubmission of the same group writes nothing and does not re-blend; a submission that differs from what is on record is an error.

## Alternatives considered

### Store mastery as primary state, updated in place

Rejected — see Context. Makes algorithm changes a lossy migration instead of a cheap replay, and removes the ability to prove incremental writes and a full recompute agree.

### Eagerly create a mastery row for every (card, field) pair at card-creation time

Rejected. Would multiply row count by cards × fields regardless of actual review activity, and would materialize a value with no basis in any log row — a direct violation of "disposable cache, fully rebuildable from the log."

## Consequences

**Positive**

- The user's double-submitted rating after a flaky network is safe, because mastery's correctness is defined by what is in the log, not by how many times an update ran.
- The developer swaps the scoring algorithm with a rebuild, not a migration.
- The developer reads an absent mastery row as "never reviewed", never as an ambiguous gap.
- The developer can prove the live path and a rebuild agree: a property test applies a random review sequence incrementally, rebuilds, and asserts the two states match.

**Negative**

- The operator accepts that a rebuild is slow, since replaying a full log in Python is slower than any SQL-side recomputation, in exchange for provable correctness.

**Neutral**
