# ADR 043: A card's display mastery is the fold over all its deck's active fields

## Status

Accepted

## Context

Until now, card-level mastery existed only relative to a config's field set — it ordered cards within a session and nowhere else. Display surfaces (the breakdown's ranked rows, and the future browse and statistics cycles) need one config-independent answer to "what is this card's mastery?", or every surface will invent its own.

## Decision

A card's display mastery is the existing strategy fold (`card_score`) over _all_ the deck's active fields, with never-reviewed fields contributing the prior (50). The same definition produces the card's delta (after-fold minus before-fold over the same domain). Session-internal ordering keeps using its config-scoped fold — this decision governs display, not scheduling.

## Alternatives considered

### Config-relative mastery on display surfaces

Rejected — the same card would show different masteries depending on which config's lens you viewed it through; incoherent once cards appear outside any config context.

### Fold over reviewed fields only

Rejected — a card 100%-mastered on one field of five would display as fully mastered; the prior-weighted fold is honest about unexplored breadth.

### No card-level number (per-field only)

Rejected — rows, ranking, and statistics all need a scalar; the per-field detail exists alongside it (ADR 044).

## Consequences

Benefits:

- One definition, decided once, reused by every future mastery surface.

Costs:

- Untouched fields dilute card-level deltas (a +15 swing on one field of five reads as +3) — the per-field detail view is the honest counterweight.
