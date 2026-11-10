# ADR 109: One validator for a configuration against its deck's live fields, refusing a save and asserting at the cut

## Status

Active

## Context

Every reference to a field is the id of a `field_def` row, and a row belongs to one deck (ADR 009).

A practice holds one configuration per deck: four arrays of field ids, the prompt fields every card shows, the prompt fields drawn at random, the answer fields every card shows and the answer fields drawn at random, and for each random draw an array of counts. A configuration changes only by a whole save, and each run cuts a frozen copy of it that generation reads for the run's lifetime (ADR 107).

Generation resolves a copy's ids by joining `field_def`, so an id with no row matches nothing and leaves the card without an error. A field named on both a prompt array and an answer array is a candidate for both sides of the same card. For each card and each side, generation draws one count from the counts and then that many of the pool's fields. A side with no field leaves nothing to show. None of these is an error generation raises.

The API accepts a configuration from any client. A `CHECK` constraint compares a row's own columns, cannot join `field_def`, and fails as an `IntegrityError` naming the constraint.

Three paths write a practice's configuration. The save replaces it with what the user sent. Creating a practice copies, for each deck, the configuration it was last practiced with, or else takes the starting configuration. The deletion closure removes a deleted field's id, lowers the counts it leaves too high, and resets a side left with no field to the starting configuration.

A refusal no screen can reach may stay a plain string, and every refusal a user reaches carries a code (ADR 070).

ADR 077 called its validator on save and again at run start, where a violation was the `stale_config` refusal, because a named configuration could drift between its save and a run's start. A practice's configuration has no such gap once every path that writes it leaves it valid, so this record restates ADR 077, and with it the timing of validation ADR 013 set.

## Decision

We will validate a configuration against its deck's live fields in one function, `validate_configuration`, by four rules. A field appears in at most one of the four arrays. Every id names an active field of the configuration's own deck. A pool that names fields carries at least one count, and every count lies between 1 and that pool's size. Each side names at least one field, always shown or drawn at random. A violation is refused naming the first rule broken.

We will have every path that writes a practice's configuration leave it valid. The save calls the function and refuses a violation, writing nothing. Creating a practice calls it on each copied configuration and takes the starting configuration for one that fails. The deletion closure's removal of a field writes only what the four rules allow.

We will call the function again on each configuration as a run is cut, where a violation raises an assertion error, not a coded refusal.

The function reads field rows and never values. Whether a card has anything to show on a side is generation's question.

## Alternatives considered

### The overlap rule alone

Rejected because the four rules are one contract that saving, cutting and generation lean on together; a rule left out is an assumption generation makes with nothing to hold it.

### Database `CHECK` constraints for the overlap and count rules

Rejected because the live-field rule needs a join against `field_def`, an `IntegrityError` names no rule, and the check at the cut needs a function regardless.

### Validation in the client alone

Rejected because the API accepts a configuration from any client, and the failures are silent: a dead id vanishes from cards, and a field on both sides is shown as the answer and as the prompt.

### `stale_config` kept as the refusal at the cut

Rejected because, with every writer leaving a configuration valid, a violation at the cut is a bug, and a sentence for the user would hide it.

## Consequences

**Positive**

- The developer adds a rule in one place and every call site gets it.
- The developer writing generation may assume a copy's ids were live and pairwise disjoint, and every count within its pool, when the copy was cut.
- The developer learns of a path that let an invalid configuration through from a failing cut, not from a sentence a user read.

**Negative**

- The developer who adds a path that writes a configuration must leave it valid, since nothing in the database holds the rules.
- The user whose run meets an invalid configuration through a bug gets a server error rather than a sentence.

**Neutral**

- The developer meets a violation in two forms: a refused save, and an assertion error at the cut.
