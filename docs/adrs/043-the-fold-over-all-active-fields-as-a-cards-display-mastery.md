# ADR 043: The fold over all active fields as a card's display mastery

## Status

Deprecated by the record rules' Type test

## Context

Until now, card-level mastery existed only relative to a config's field set — it ordered cards within a session and nowhere else. Display surfaces (the breakdown's ranked rows, and the future browse and statistics cycles) need one config-independent answer to "what is this card's mastery?", or every surface will invent its own.

## Decision

We will define a card's display mastery as the strategy fold, `card_score`, over all the deck's active fields, with a never-reviewed field contributing the prior. The same definition produces the card's delta, after-fold minus before-fold over the same domain. Run-internal ordering keeps its configuration-scoped fold; this decision governs display, not scheduling.

## Alternatives considered

### Config-relative mastery on display surfaces

Rejected — the same card would show different masteries depending on which config's lens you viewed it through; incoherent once cards appear outside any config context.

### Fold over reviewed fields only

Rejected — a card 100%-mastered on one field of five would display as fully mastered; the prior-weighted fold is honest about unexplored breadth.

### No card-level number (per-field only)

Rejected — rows, ranking, and statistics all need a scalar; the per-field detail exists alongside it.

## Consequences

**Positive**

- The developer reuses one definition, decided once, on every mastery surface.

**Negative**

- The user sees untouched fields dilute a card-level delta, a +15 swing on one field of five reading as +3; the per-field detail is the counterweight.

**Neutral**
