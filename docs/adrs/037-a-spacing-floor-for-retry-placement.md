# ADR 037: A spacing floor for retry placement

## Status

Active

## Context

Manual testing of the sparse-position placement found a real defect — a small deck produced a tight loop of two repeating cards — and explicitly deferred "whatever minimum-gap guarantee should back it" to a follow-up that would extend `_insertion_position`/`_requeue_failed_card`. This is that follow-up. Mastery-ordered insertion alone places a badly-missed card near the front of the pending queue, which on a small queue means seeing it again almost immediately.

## Decision

We will keep a requeued retry from surfacing until at least `RETRY_SPACING_FLOOR` other pending cards have their turn, three at adoption. With at least that many cards pending, the retry's insertion index is the mastery-ordered index clamped up to the floor, so a card whose mastery already puts it deeper stays deeper. With fewer pending, the retry goes to the end of the queue. Every requeue in a multi-fail chain re-applies the rule at its own insertion. The constant is a named tunable in `app/services/practice_run.py`, not user-facing configuration.

## Alternatives considered

### Place the retry at exactly three-back regardless of mastery

Rejected — discards the mastery signal entirely; a well-known card that suffered one slip would cut ahead of genuinely weak cards.

### No floor (status quo)

Rejected — the recorded tight-loop defect.

### User-configurable n

Rejected — a tuning knob nobody asked for; the constant can be changed in one place.

## Consequences

**Positive**

- The user never meets the two-card tight loop; a retry always gets the floor's worth of breathing room or goes last.

**Negative**

- The developer loses the pending queue's strict ascending-mastery order, which weakens to "mastery-ordered subject to the floor".

**Neutral**
