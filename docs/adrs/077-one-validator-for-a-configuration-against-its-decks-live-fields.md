# ADR 077: One validator for a configuration against its deck's live fields

## Status

Superseded by ADR 109

## Context

Every reference to a field is the id of a `field_def` row, and a row belongs to one deck (ADR 009). `deck_practice_config` is a saved, mutable template of which of a deck's fields a practice shows: four id arrays, the prompt fields every card shows, the prompt fields drawn at random, the answer fields every card shows and the answer fields drawn at random, and for each of the two random-draw arrays, the pools, an array of counts.

A run reads a frozen snapshot of the six arrays, cut onto `practice_deck` at run start, never the live configuration, and because a configuration can drift between being saved and being used, validation runs at save and again just before the snapshot is cut (ADR 013). ADR 013 decides when validation runs and leaves what it checks open.

Generation resolves a snapshot's ids by joining `field_def`, so an id with no row matches nothing and leaves the card without an error. A field named on both a prompt array and an answer array is a candidate for both sides of the same card. For each card and each side, generation draws one count from the pool's counts and then that many of the pool's fields. A side with no field leaves nothing to show. None of these is an error generation raises.

The API accepts a configuration from any client. A `CHECK` constraint compares a row's own columns, cannot join `field_def`, and fails as an `IntegrityError` naming the constraint.

## Decision

We will validate a configuration against its deck's live fields in one function, `validate_deck_practice_config` in `app/services/deck_practice_config.py`, by four rules. A field appears in at most one of the four arrays. Every id names an active field of the configuration's own deck. A pool that names fields carries at least one count, and every count lies between 1 and that pool's size. Each side names at least one field, always shown or drawn at random. A violation is refused naming the first rule broken.

We will call the function on save, creating or updating a configuration, where a violation refuses the save, and at run start, on each selected configuration before its snapshot is cut, where a violation is the `stale_config` refusal, and nothing is written.

The function reads field rows and never values. Whether a card has anything to show on a side is generation's question.

## Alternatives considered

### The overlap rule alone

Rejected because the four rules are one contract that save, run start and generation lean on together; a rule left out is an assumption generation makes with nothing to hold it.

### Database CHECK constraints for the overlap and count rules

Rejected because the live-field rule needs a join against `field_def`, an `IntegrityError` names no rule, and the check before the snapshot is cut needs a function regardless.

### Validation in the client alone

Rejected because the API accepts a configuration from any client, and the failures are silent: a dead id vanishes from cards, and a field on both sides is shown as the answer and as the prompt.

## Consequences

**Positive**

- The developer adds a rule in one place and every call site gets it.
- The developer writing generation may assume a snapshot's ids were live and pairwise disjoint, and every count within its pool, when the snapshot was cut.
- The user who starts a practice from a saved configuration is refused only because the deck changed underneath it since the save.

**Negative**

- The developer who adds a write path to `deck_practice_config` must call the function, since nothing in the database holds the rules.

**Neutral**

- The developer meets one violation in two forms, a refused save and a refused start, each naming the rule broken.
