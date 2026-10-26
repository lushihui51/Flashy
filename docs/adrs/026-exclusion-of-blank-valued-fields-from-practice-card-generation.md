# ADR 026: Exclusion of blank-valued fields from practice card generation

## Status

Active

## Context

`db_fetch_generation_candidates` (`app/database_ops/practice_generation.py`) and `resolve_prompts_or_answers` (`app/services/practice_generation.py`) both carry docstrings claiming a field left blank on a card (`card_field_value.value == ""`, the dense-with-empty-string state every active field always has, per `AGENTS.md`) is dropped from prompt/answer candidacy. Neither actually does — the query has no such condition. `review_log` is append-only and mastery is derived by full replay from it (ADR 011); a rating submitted against a blank answer field is not a display glitch, it's a permanent, meaningless data point biasing that (card, field)'s future resurfacing forever.

## Decision

We will exclude a blank-valued field from a card's prompt and answer candidates, on the fixed side and the pool side alike, by filtering it in the generation query. A side left with no eligible field skips the card, as it already did for a side with zero fields.

## Alternatives considered

### Allow blanks, fix only the docstrings to describe reality

Rejected — the data-integrity cost above; a wrong rating on nothing is worse than an inaccurate docstring.

### Filter blanks on the answer side only, allow them on the prompt side

Rejected in favor of one rule for both sides: simpler, and a blank prompt still isn't useful information — an absent cue offers nothing a present one does.

## Consequences

**Positive**

- The user is never asked to rate an answer field against nothing.
- The developer reads docstrings that describe real behavior.

**Negative**

- The user whose card has many blank optional fields gets a smaller candidate pool than its field count suggests; a draw count above the non-blank survivors clamps down.

**Neutral**
