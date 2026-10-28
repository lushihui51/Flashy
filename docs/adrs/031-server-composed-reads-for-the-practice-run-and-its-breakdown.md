# ADR 031: Server-composed reads for the practice run and its breakdown

## Status

Active

## Context

A practice card's prompt/answer ids only mean something to a client once joined against `field_def` (name, type) and `card_field_value` (current value); live progress needs the ADR 028 chain fold; the completion breakdown needs that same fold plus grouping plus a `review_log` join for ratings. Equivalent server-side composition already exists for related reads (`_summaries_for_sessions`, `app/database_ops/practice_session.py`).

## Decision

We will have the run-state read return one payload, the resolved current card with field entries carrying name, type, and value rather than bare ids, the run's name and status, and the live progress counts, and the breakdown read return the entire completion dataset in one payload, bucket counts and every card's full, resolved, rated attempt history, so the completion screen's row-tap detail needs no second request. Neither hands the client raw ids to resolve itself.

## Alternatives considered

### Keep current_card as bare arrays; add separate endpoints for field values and progress

Rejected — the client would rejoin ids against a fields response and a progress response on every render, duplicating server-side folding logic that already has to exist for the breakdown endpoint, risking the two folds drifting apart.

### A compact list endpoint for the tabs, plus a per-card detail endpoint on row tap

Rejected — a session's card count is bounded by its decks, not pagination territory; the round-trip savings of a lighter list payload are marginal against the simplicity of one fetch backing the whole screen.

## Consequences

**Positive**

- The developer keeps the chain and bucket fold in one place on the server, backing both the live bar and the breakdown.
- The frontend developer carries no join logic.

**Negative**

- The user's client receives a heavier run-state payload on every card transition.
- The user with a large multi-deck run receives every attempt's full detail up front rather than lazily.

**Neutral**
