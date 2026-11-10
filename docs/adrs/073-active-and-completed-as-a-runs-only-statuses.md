# ADR 073: Active and completed as a run's only statuses

## Status

Superseded by ADR 111

## Context

A run's pending cards can be deleted out from under it: a card, field, or deck delete takes its practice cards with it, and a run left with no decks goes with its last deck (ADR 047, ADR 048). The user can also finish a run. Nothing writes a signal that tells the two apart, and telling them apart would need state nothing keeps.

The first build spent a status on the stranded case, `abandoned`, set on the read path where it found nothing pending. Once a UI existed that cost twice: a run the user finished displayed as "Abandoned", and the overview's status filter offered a `completed` tab that no code path populated. A status nothing writes is not a status.

With the stranded status gone, a user delete is the only way a run leaves the list, and the delete endpoint shipped with it.

## Decision

We will give a practice run two statuses, `active` and `completed`, and nothing else. The one transition is on the read path: when the current-card read finds a run still active with no pending practice card, it marks the run completed, whether the user finished it or a deletion stranded it. No write path defends against a stranded run, and no state records why a run ran out of cards.

## Alternatives considered

### Keep `abandoned` and have something set it deliberately

Rejected: a user "abandon" action, or marking runs stranded by a cascade, invents state-tracking to preserve a distinction no consumer had asked for.

### Guard every write path against a stranded run

Rejected: a pending practice card whose card was deleted no longer exists as a row, so the existing not-found check on rating already covers it.

## Consequences

**Positive**

- The user sees every finished or stranded run under one word, and both tabs of the overview have runs to show.

**Negative**

- The user cannot tell at a glance a run they finished from one a deletion stranded.
- The developer accepts a status that changes on a read.

**Neutral**
