# ADR 106: No requeue exception to the blank-value filter, for a card edited during a run

## Status

Active

## Context

A blank-valued field is never a candidate for a card's prompt or answer side, when a run is cut or on requeue (ADR 026).

A retry places every answer field rated Again ahead of the random draw, as long as the field is still live and non-blank on the card (ADR 036).

A requeue that finds no eligible field on a side inserts no retry, and the card's attempts end on its failed one.

The user can edit a card during a run, from the run page, and its new values show from then on (PDR 042). Clearing the value of a field just rated Again leaves the retry nothing eligible on that side.

Deleting a field deletes every active run whose copy names it, so a cleared value is the one way a run's card is left without a retry.

The summary shows each card's kind of change in mastery, and nothing about how many attempts it took or whether it passed (PDR 041).

ADR 095 made this decision in words where "practice" meant one run. Under PDR 035 a practice is the kept set of decks, which holds the card for as long as it exists, so ADR 095's condition "while a practice uses it" no longer says when the rule applies. This record restates it with the run as the occasion.

## Decision

We will give the blank-value filter no requeue exception. A failed field that was cleared after it was shown drops out of the retry, as the requeue guarantee's condition states; a side left with no eligible field produces no retry, and the card's attempts end on its failed one. Editing a card's values during a run is the user's responsibility: the app neither blocks the edit, deletes the run, nor shows a value it filtered out.

A value cleared while its card is on screen, or after a run's card row was generated, renders as an empty value on the run page and in the breakdown's attempt detail. We will add no placeholder for it.

The guarantee against the random draw holds: a failed field that is still live and non-blank is placed ahead of sampling and is never dropped in favour of a sampled one.

## Alternatives considered

### Failed fields bypassing the blank filter

Rejected because the blank-value rule would then hold everywhere except on retries, and a retry could show an empty answer.

### An empty side reusing the previous appearance's fields

Rejected for the same reason, and because it would show a card made entirely of empty values.

### The run deleted when a card value is edited

Rejected because deleting a run over one cleared value on one card is out of proportion, and the deletion closure plans and executes deletions of entities, not edits.

### A placeholder for a cleared value

Rejected because the responsibility the decision places on the user applies to it too, and the app would grow a guard for every edit made during a run.

## Consequences

**Positive**

- The developer keeps the blank filter a single rule with no exceptions, and adds no state or render path.
- The developer finds the case of a card whose attempts end on a failed one recorded where it is reached.

**Negative**

- The user who clears a value on a card during a run sees that card end the run on a failed attempt, and the field just failed is not asked again in that run.
- The developer reads the requeue guarantee as conditional, with the condition stated in the records rather than only in the code.

**Neutral**
