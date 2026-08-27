# ADR 031: Practice run and breakdown reads are server-composed

## Status

Accepted

## Context

A practice card's prompt/answer ids only mean something to a client once joined against `field_def` (name, type) and `card_field_value` (current value); live progress needs the ADR 028 chain fold; the completion breakdown needs that same fold plus grouping plus a `review_log` join for ratings. Equivalent server-side composition already exists for related reads (`_summaries_for_sessions`, `app/database_ops/practice_session.py`).

## Decision

`GET .../run` returns one payload — the resolved current card (field entries carrying name/type/value, not bare ids), the session's name/status, and the ADR 028 progress counts — replacing `GET .../current_card`, which returned only bare UUID arrays. `GET .../breakdown` returns the entire completion dataset in one payload — bucket counts and every card's full, resolved, rated attempt history — so the completion screen's row-tap detail needs no second request. Neither endpoint hands the client raw ids to resolve itself.

## Alternatives considered

### Keep current_card as bare arrays; add separate endpoints for field values and progress

Rejected — the client would rejoin ids against a fields response and a progress response on every render, duplicating server-side folding logic that already has to exist for the breakdown endpoint, risking the two folds drifting apart.

### A compact list endpoint for the tabs, plus a per-card detail endpoint on row tap

Rejected — a session's card count is bounded by its decks, not pagination territory; the round-trip savings of a lighter list payload are marginal against the simplicity of one fetch backing the whole screen.

## Consequences

Benefits:

- The chain/bucket fold lives in one place server-side, backing both the live bar and the breakdown so they can't disagree.
- The frontend carries no join logic.

Costs:

- The run-state payload is heavier than the old bare-array response on every card transition.
- A large multi-deck session's breakdown payload returns every attempt's full detail up front rather than lazily.
