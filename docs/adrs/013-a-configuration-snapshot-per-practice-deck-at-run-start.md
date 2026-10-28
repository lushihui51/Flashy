# ADR 013: A configuration snapshot per practice deck at run start

## Status

Active

## Context

A `deck_practice_config` (a saved, named template describing which fields are prompts/answers and pool-sampling rules) is mutable — a user can edit or delete it at any time. A `practice_session` built from a config can run for a while: cards are drawn from it up front, and failed cards get requeued with freshly-generated prompt/answer combinations for as long as the session is active.

If a session's card generation always read the _live_ config, editing the config mid-session (changing which fields are prompts/answers, changing pool counts) would change what a card looks like while the user is mid-play. Deleting the config outright would leave the session with nothing to resolve field/pool ids from for the remainder of its lifetime — every subsequent card generation and every requeue after a failed rating would have nothing to work from.

## Decision

We will have `practice_deck` hold a copy of the configuration's six array and count columns, taken at the moment a run starts. Every card generated for the run's lifetime, the initial batch and every requeue after a failed rating, reads from that frozen row; generation, validation, and rerun never read the live configuration again, so editing or deleting the configuration never affects a run built from it.

Because a configuration can drift between being saved and being used to start a run, validation runs twice: once at configuration save or update, and again immediately before the snapshot is cut, so the snapshot is valid at the exact moment it becomes immutable.

## Alternatives considered

### A foreign key to the configuration, read live

Rejected: it would make a run's behavior depend on the configuration's state at read time rather than at run start, breaking the isolation of a started run from ordinary configuration edits.

## Consequences

**Positive**

- The user edits or deletes a configuration freely, with no risk to runs already built from it.
- The developer gets a run whose behavior for its whole lifetime is determined by the configuration's state at start, reproducible and immune to concurrent edits.

**Negative**

- The database stores six array columns per practice deck per run instead of one small foreign key.
- The developer runs the same validation at configuration save and at run start, an extra check a live read would not need.
- The user whose snapshot goes stale against the deck's own fields after it was cut sees a requeue that finds nothing to generate return nothing; accepted as a handled degraded case rather than something the snapshot stays live to prevent.

**Neutral**
