# ADR 037: A spacing floor keeps retries from resurfacing immediately

## Status

Accepted. Decides the minimum-gap follow-up ADR 008 deferred.

## Context

ADR 008's amendment recorded a real defect found in manual testing — a small deck produced a tight loop of two repeating cards — and explicitly deferred "whatever minimum-gap guarantee should back it" to a follow-up that would extend `_insertion_position`/`_requeue_failed_card`. This is that follow-up. Mastery-ordered insertion alone places a badly-missed card near the front of the pending queue, which on a small queue means seeing it again almost immediately.

## Decision

A requeued retry may not surface until at least `RETRY_SPACING_FLOOR = 3` other pending cards have their turn: with `mastery_index` as the existing mastery-ordered insertion point, the final insertion index is `max(mastery_index, min(RETRY_SPACING_FLOOR, len(pending)))` — the floor _clamps_ the mastery placement, so a card whose mastery already puts it deeper stays deeper. With fewer than 3 pending cards remaining, the retry goes to the end of the queue. Every requeue in a multi-fail chain re-applies the rule at its own insertion. The constant is a named tunable in `app/services/practice_run.py`, not user-facing configuration.

## Alternatives considered

### Place the retry at exactly three-back regardless of mastery

Rejected — discards the mastery signal entirely; a well-known card that suffered one slip would cut ahead of genuinely weak cards.

### No floor (status quo)

Rejected — the recorded tight-loop defect.

### User-configurable n

Rejected — a tuning knob nobody asked for; the constant can be changed in one place.

## Consequences

Benefits:

- The two-card tight loop is impossible; a retry always yields the floor's worth of breathing room or goes last.

Costs:

- The pending queue's strict ascending-mastery ordering (held by construction since ADR 008) weakens to "mastery-ordered subject to the floor".
