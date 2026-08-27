# ADR 013: Snapshot practice config at session start

## Status

Accepted

## Context

A `deck_practice_config` (a saved, named template describing which fields are prompts/answers and pool-sampling rules) is mutable — a user can edit or delete it at any time. A `practice_session` built from a config can run for a while: cards are drawn from it up front, and failed cards get requeued with freshly-generated prompt/answer combinations for as long as the session is active.

If a session's card generation always read the _live_ config, editing the config mid-session (changing which fields are prompts/answers, changing pool counts) would change what a card looks like while the user is mid-play. Deleting the config outright would leave the session with nothing to resolve field/pool ids from for the remainder of its lifetime — every subsequent card generation and every requeue after a failed rating would have nothing to work from.

## Decision

`practice_deck` holds a copy of the config's six array/count columns (`prompt_field_ids`, `answer_field_ids`, `prompt_pool_ids`, `prompt_pool_counts`, `answer_pool_ids`, `answer_pool_counts`) taken at the moment a session starts. It has **no** `source_config_id` — the model's own docstring states the reasoning directly (`app/models/practice_deck.py:10-12`): "a self-contained snapshot of a deck_practice_config taken at session start. Editing or deleting the source config must never affect a session, so nothing here points back to it."

Every card generated for the session's lifetime — the initial batch (`app/services/practice_session.py:114-126`) and every card requeued after a failed rating (`app/services/practice_session.py:184-195`) — reads from this frozen `practice_deck` row, never the live config again.

Because a config can drift (a referenced field gets archived) in the gap between being saved and being used to start a session, validation runs twice: once at config save/update, and again immediately before the snapshot is cut (`app/services/practice_session.py:83-95`) — the snapshot has to be valid at the exact moment it becomes immutable, not just valid whenever it was last saved.

## Alternatives considered

### Store a `source_config_id` foreign key and always read the live config

Rejected — this is the alternative the "no source_config_id" phrasing and the model docstring are directly pushing back against. It would make a session's behavior depend on the config's state at read time rather than at session-start time, breaking the guarantee that a session, once started, is isolated from ordinary config edits.

## Consequences

Benefits:

- A user can freely edit or delete a `deck_practice_config` without any risk to sessions already built from it.
- A session's behavior for its whole lifetime is determined entirely by the state the config was in at start time — reproducible, not subject to concurrent edits.

Costs:

- Storage/duplication: six array columns are copied per `practice_deck` row per session, rather than a single small foreign key.
- Double validation: the same config validation logic runs at both template save/update and session start, an extra check that wouldn't be needed if sessions simply always read the live config.
- The snapshot itself can still go stale relative to the _deck's_ fields after being cut — if a field referenced by the snapshot gets archived mid-session, requeue generation can find nothing to work with and returns `None` (nothing to requeue). This is accepted as a legitimate, handled degraded case rather than something the snapshot tries to protect against by staying live-updated.
