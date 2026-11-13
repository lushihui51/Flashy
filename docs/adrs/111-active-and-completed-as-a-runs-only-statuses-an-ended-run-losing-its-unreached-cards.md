# ADR 111: Active and completed as a run's only statuses, an ended run losing its unreached cards

## Status

Active

## Context

PDR 035 makes active and completed states of a run alone: a run is active until it ends, and completed from then on.

PDR 038 lets the user end an active run before its last card. The run is then completed as it stands: what it did to the user's mastery stays, and its summary speaks only of the cards it reached.

PDR 041 lists in the summary every card the run reached that the user has not since deleted.

A run's card rows are generated when it is cut, each `pending` until it is rated. A pending row has no review. The summary, the run's progress counts and the check that chosen cards are cards of the completed run read every `run_card` row of the run.

A run's pending cards can be deleted out from under it: a card, field or deck delete takes its run cards with it, and a run left with no decks goes with its last deck (ADR 048). Nothing writes a signal that tells a stranded run from one the user finished.

Every run belongs to exactly one practice (ADR 105).

ADR 073 gave a run two statuses and one transition, on the read path. Ending a run is a second way to become completed, so this record restates it.

## Decision

We will give a run two statuses, `active` and `completed`, and nothing else.

A run becomes completed in two ways. When the current-card read finds a run still active with no pending card, it marks the run completed, whether the user finished it or a deletion stranded it. When the user ends a run, one transaction deletes every pending `run_card` of it and marks it completed, on a whole run and a run of chosen cards alike.

No write path defends against a stranded run, and no state records why a run became completed: finished, stranded or ended.

## Alternatives considered

### Keeping `abandoned`, set deliberately

Rejected because marking runs stranded by a cascade invents state-tracking to preserve a distinction no consumer has asked for.

### An `ended` status

Rejected because PDR 035 gives a run two states, and every reader of a completed run would have to handle a third.

### Pending rows kept on an ended run, filtered by every reader

Rejected because a reader that forgets the filter shows cards the run never reached.

### Every write path guarded against a stranded run

Rejected because a pending run card whose card was deleted no longer exists as a row, so the existing not-found check on rating already covers it.

## Consequences

**Positive**

- The user sees an ended run as completed, its summary speaking only of the cards they reached.
- The developer reads a completed run's card rows as rated attempts only, with no filter.

**Negative**

- The user cannot tell at a glance a run they finished from one a deletion stranded or one they ended.
- The developer accepts a status that changes on a read.
- The user who ends a run before rating any card keeps a completed run with no cards in its summary.

**Neutral**

- The developer reads ending a run as a deletion of its pending rows followed by the status change.
