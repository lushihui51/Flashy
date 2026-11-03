# ADR 095: No requeue exception to the blank-value filter

## Status

Active

## Context

A blank-valued field is never a candidate for a card's prompt or answer side, at run start or on requeue (ADR 026).

A retry places every answer field rated Again ahead of the random draw, as long as the field is still live and non-blank on the card (ADR 036).

A requeue that finds no eligible field on a side inserts no retry, and the card's attempts end on its failed one.

The user can open a card's form from the run page and change its values while a practice uses the card (PDR 019), and clearing the value of a field just rated Again leaves the retry nothing eligible on that side.

Deleting a field deletes every active practice that names it (ADR 094), so a cleared value is the one way a card is left without a retry mid-practice.

The summary shows each card's kind of change in mastery and nothing about whether it passed (PDR 024, ADR 084).

ADR 060 gave the blank-value filter no requeue exception, and had the breakdown report the stranded card in a still-failed outcome group, which the summary no longer has.

## Decision

We will give the blank-value filter no requeue exception. A failed field that was cleared after it was shown drops out of the retry, exactly as the requeue guarantee's condition already states; a side left with no eligible field produces no retry, and the card's attempts end on its failed one. Editing a card's values while a practice uses it is the user's responsibility: the app neither blocks the edit, deletes the practice, nor shows a value it filtered out.

A value cleared while its card is already on screen, or after a row was generated, renders as an empty value on the run page and in the breakdown's attempt detail. We will add no placeholder for it.

The guarantee against the random draw holds: a failed field that is still live and non-blank is placed ahead of sampling and is never dropped in favour of a sampled one.

## Alternatives considered

### Failed fields bypassing the blank filter

Rejected because the blank-value rule would then hold everywhere except on retries, and a retry could show an empty answer. One invariant with no exceptions is preferred to a guarantee that needs a second guarantee to hold it up.

### An empty side reusing the previous appearance's fields

Rejected for the same reason, and because it would show a card made entirely of empty values.

### The practice deleted when a card value is edited

Rejected because deleting a practice over one cleared value on one card is out of proportion, and the deletion closure plans and executes deletions of entities, not edits.

### A placeholder for a cleared value

Rejected because the same responsibility the decision places on the user applies, and the app should not grow a guard for every edit made mid-practice.

## Consequences

**Positive**

- The developer keeps the blank filter a single rule with no exceptions, and adds no new state or render path.
- The developer has the case of a card whose attempts end on a failed one recorded where it is reached, and a test pins the path.

**Negative**

- The user who clears a value on a card mid-practice sees that card end the practice on a failed attempt, and the field it just failed is not asked again.
- The developer reads the requeue guarantee as conditional, with the condition explicit in the records rather than only in the code.

**Neutral**
