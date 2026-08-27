# ADR 026: Exclude blank-valued fields from practice card generation

## Status

Accepted

## Context

`db_fetch_generation_candidates` (`app/database_ops/practice_generation.py`) and `resolve_prompts_or_answers` (`app/services/practice_generation.py`) both carry docstrings claiming a field left blank on a card (`card_field_value.value == ""`, the dense-with-empty-string state every active field always has, per `AGENTS.md`) is dropped from prompt/answer candidacy. Neither actually does — the query has no such condition. `review_log` is append-only and mastery is derived by full replay from it (ADR 011); a rating submitted against a blank answer field is not a display glitch, it's a permanent, meaningless data point biasing that (card, field)'s future resurfacing forever.

## Decision

Add `CardFieldValue.value != ''` to `db_fetch_generation_candidates`'s join. A blank-valued field can no longer be selected as a card's prompt or answer, on the fixed side or the pool side, for either side of the card. `generate_practice_card_fields`'s existing skip-card behavior (returning `None` when a side ends up with zero fields) is unchanged, and now also fires legitimately whenever every eligible field on a side is blank.

## Alternatives considered

### Allow blanks, fix only the docstrings to describe reality

Rejected — the data-integrity cost above; a wrong rating on nothing is worse than an inaccurate docstring.

### Filter blanks on the answer side only, allow them on the prompt side

Rejected in favor of one rule for both sides: simpler, and a blank prompt still isn't useful information — an absent cue offers nothing a present one does.

## Consequences

Benefits:

- An answer field is never rated against nothing.
- The docstrings finally describe real behavior.

Costs:

- A card with many optional fields left blank has a smaller effective candidate pool than its raw field count suggests; a configured `pool_count` higher than the number of non-blank survivors clamps down, same as the existing archived-field clamping, just blank-triggered too.
