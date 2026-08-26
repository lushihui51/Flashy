# ADR 021: User-facing vocabulary is a contract and never exposes schema terms

## Status

Accepted

## Context

The practice surfaces name concepts users touch constantly: practices, deck configurations, and a configuration's four field arrays (`prompt_field_ids`, `answer_field_ids`, `prompt_pool_ids` + counts, `answer_pool_ids` + counts). The first shipped builder labeled its sections straight from the schema — "Prompt fields", "Answer fields", "Prompt pool", "Answer pool" — and the 2026-08-25 /plan re-examination showed where that leads: the app's own author could not tell what the sections implied or where draw frequency was set. "Pool" describes the implementation (a set that is drawn from); it says nothing about the experience (some fields appear on every card, some appear sometimes). Earlier naming work had already fixed one instance of the same disease — "never write practice config" (`docs/cc/2026-08-24-deck-configuration-naming.md`).

## Decision

The user-facing word set is a canonical contract — one word per concept — maintained as the vocabulary table in the governing task file (`docs/tasks/004-practice-setup.md`, Contracts): **practice**, **deck configuration**, **New practice**, **New configuration**; **Prompt side** / **Answer side**; **Always shown** / **Random draw**; **Not used**; and **"Each card shows [1] [2] … of these"** for the draw counts.

The rule behind the table: schema identifiers never appear in UI copy. Tables, models, and endpoints keep their names (`deck_practice_config`, `*_pool_ids` are accurate, deck-first names); what changes is that no label, heading, button, or error string may echo them. Changing a user-facing word means changing the vocabulary table first, then every surface that uses it.

### Alternative considered: reuse schema names as UI labels

Rejected: it is what shipped, and it demonstrably confused even the person who designed the schema. Schema names optimize for precision in code, not for teaching the model.

### Alternative considered: rename the schema to match the user-facing words

Rejected: models, endpoints, migrations, and generated types would all churn for zero user-visible value. Display naming is a rendering concern; the schema's names are accurate for what the columns store.

## Consequences

Benefits:

- Copy explains the model instead of quoting it; the "where do I set frequency?" confusion is answered by the words themselves.
- One place to look up what a user reads, and one place a rename starts.

Costs:

- A translation layer to maintain: builders must consult the table rather than echoing code names, and table-to-copy drift is caught only by review.
