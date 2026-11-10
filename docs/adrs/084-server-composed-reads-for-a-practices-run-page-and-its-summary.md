# ADR 084: Server-composed reads for a practice's run page and its summary

## Status

Superseded by ADR 125

## Context

A practice card's prompts and answers are arrays of field ids, and a field id means something to a client only when joined against `field_def` for its name and type and against `card_field_value` for its current value (ADR 009).

During a practice the run page shows only the current card, with the practice's progress as a bar (PDR 023, PDR 024).

When nothing is left, the run page turns into the practice's summary in place, and the practice's own page shows the same summary from then on (PDR 024).

The summary lists every card once, with its mastery after the practice, which the code computes as readiness, and its change as one of five kinds. It shows how many cards had each kind of change, narrows the list to the kinds the user chooses, and orders it by mastery, by gains or by drops (PDR 024).

A card opened from the summary shows each field the practice showed or asked, with its value, its own mastery and change, and one mark per attempt (PDR 025).

A card rated Again returns later in the same practice as a new practice card, so one card can have several attempts, and an attempt's ratings are the review rows whose `review_group_id` is that practice card's id (ADR 048).

All mastery arithmetic sits under `app/mastery/`, and readiness is the only mastery figure the API returns (ADR 083).

A practice holds no more cards than its decks do.

ADR 031 composed both reads on the server, with the breakdown carrying the count of cards in each outcome group: passed first try, passed after one fail, passed after several fails, and still failed. PDR 024's summary shows kinds of change in mastery instead, and nothing about attempts.

## Decision

We will have the run-state read return one payload: the current card, resolved, with each field entry carrying its name, type and value rather than a bare id; the run's name and status; and the progress counts the run page's bar is drawn from.

We will have the breakdown read return, in one payload, everything the summary and a card opened from it show: every card, and each field the practice showed or asked, with its readiness after the practice, its kind of change and its signed change; and every card's full attempt history, resolved, with each attempt's fields and ratings. The client counts the kinds and orders the cards from this payload, classifies nothing, and opens a card without a second request.

Neither read hands the client a raw id to resolve itself.

## Alternatives considered

### Bare id arrays, with separate endpoints for field values and progress

Rejected because the client would rejoin ids against a fields response and a progress response on every render, duplicating composition the server already does for the breakdown, and the two could drift apart.

### A compact list endpoint for the summary, plus a per-card endpoint on opening a card

Rejected because a practice's card count is bounded by its decks, so the savings of a lighter list are marginal against one fetch backing the whole screen.

### The client classifying each change against the bands

Rejected because it would put mastery arithmetic outside `app/mastery/`.

## Consequences

**Positive**

- The frontend developer carries no join logic and no classification; the run page, the summary and a card opened from it each render from one response.
- The developer keeps the resolution of field ids and the classification of change in one place on the server.
- The user opens a card on the summary without waiting for a second request.

**Negative**

- The user's client receives a heavier run-state payload on every card transition.
- The user with a large multi-deck practice receives every attempt's full detail up front rather than when a card is opened.

**Neutral**

- The frontend developer counts the kinds of change and orders the cards from the payload, with no band to compare against.
