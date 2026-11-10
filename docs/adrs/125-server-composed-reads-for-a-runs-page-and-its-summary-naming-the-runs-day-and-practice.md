# ADR 125: Server-composed reads for a run's page and its summary, naming the run's day and practice

## Status

Active

## Context

A run card's prompts and answers are arrays of field ids, and a field id means something to a client only when joined against `field_def` for its name and type and against `card_field_value` for its current value (ADR 009).

During a run the run page shows only the current card (PDR 041), as a prompt zone and an answer zone (PDR 036), with the run's progress as a bar. The row of places above the run page names the run's practice.

When a run ends, the run page turns into the completed run's page in place, which is the run's summary (PDR 041).

The summary lists once every card the run reached, with its mastery after the run, which the code computes as readiness, and its change as one of five kinds. It shows how many cards had each kind of change, narrows the list to the kinds the user chooses, and orders it by mastery, by gains or by drops (PDR 041).

A card opened from the summary shows each field the run showed or asked, with its value, its own mastery and change, and one mark per attempt (PDR 043).

A card rated Again returns later in the same run as a new run card, so one card can have several attempts, and an attempt's ratings are the review rows whose `review_group_id` is that run card's id (ADR 048).

All mastery arithmetic sits under `app/mastery/`, and readiness is the only mastery figure the API returns (ADR 116). A run has no mastery of its own (PDR 045).

A run belongs to one practice (ADR 105), has no name, and is known by its `day` and `day_index`, which every read that returns a run returns (ADR 114).

A run holds no more cards than its practice's decks do.

ADR 084 composed both reads on the server and returned the run's name in the run-state read. A run has no name now, so this record restates ADR 084.

## Decision

We will have the run-state read return one payload: the current card, resolved, with each field entry carrying its name, type and value rather than a bare id; the run's `day`, `day_index` and status; its practice's id and name; and the progress counts the run page's bar is drawn from.

We will have the breakdown read return, in one payload, everything the summary and a card opened from it show: every card, and each field the run showed or asked, with its readiness after the run, its kind of change and its signed change; and every card's full attempt history, resolved, with each attempt's fields and ratings. The client counts the kinds and orders the cards from this payload, classifies nothing, and opens a card without a second request.

Neither read hands the client a raw id to resolve itself.

## Alternatives considered

### Bare id arrays, with separate endpoints for field values and progress

Rejected because the client would rejoin ids against a fields response and a progress response on every render, duplicating composition the server already does for the breakdown, and the two could drift apart.

### A compact list endpoint for the summary, plus a per-card endpoint on opening a card

Rejected because a run's card count is bounded by its practice's decks, so the savings of a lighter list are marginal against one fetch backing the whole screen.

### The client classifying each change against the bands

Rejected because it would put mastery arithmetic outside `app/mastery/`.

## Consequences

**Positive**

- The frontend developer carries no join logic and no classification; the run page, the summary and a card opened from it each render from one response.
- The developer keeps the resolution of field ids and the classification of change in one place on the server.
- The user opens a card on the summary without waiting for a second request.
- The user sees the run page's row of places name the practice with no second request.

**Negative**

- The user's client receives a heavier run-state payload on every card transition.
- The user with a large multi-deck practice receives every attempt's full detail up front rather than when a card is opened.

**Neutral**

- The frontend developer counts the kinds of change and orders the cards from the payload, with no band to compare against.
