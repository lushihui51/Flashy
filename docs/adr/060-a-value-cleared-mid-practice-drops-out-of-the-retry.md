# ADR 060: A value cleared mid-practice drops out of the retry

## Status

Accepted. Amends the trigger ADR 013's Consequences and ADR 029's Decision describe for a requeue that finds nothing to generate: the reachable trigger is a card value cleared while a practice uses it, not an archived field. Confirms ADR 026 and ADR 036 as written. Implemented by task 018.

## Context

ADR 026 excludes a blank-valued field from practice generation: a field whose value is empty on a card is never a candidate for that card's prompt or answer side, at run start or on requeue. ADR 036 guarantees that every answer field rated "Again" is placed in the retry ahead of the random draw, and states the guarantee for fields "still live and non-blank on the card". ADR 013 accepted that a requeue can find nothing to generate from and return nothing, calling it a handled degraded case; ADR 029 gave that case a bucket, `still_failed`, for a card whose chain ends on a failed row. Both describe the trigger as a field archived mid-practice.

Since ADR 049 the archive endpoint is unexposed, and a hard field delete removes every active practice naming the field, so archiving cannot strand a card in the product. A 2026-09-28 investigation reproduced the case through the one path a user reaches: open a card while a practice is using it, clear the value of the field just rated "Again", and the retry has nothing eligible on that side. The rating succeeds, no retry row is inserted, the card's chain ends on its failed row, and the practice completes without it. Nothing in the decision records named that path.

A first proposal in the same session made the retry unconditional: failed fields would bypass the blank filter, and a side left empty would reuse the previous appearance's fields, so a retry could never fail to generate. It was withdrawn before decomposition because it would have opened an exception in ADR 026: a field with an empty value would be shown as a prompt or answer.

## Decision

The blank-value filter has no requeue exception. A failed field that was cleared after it was shown drops out of the retry, exactly as ADR 036's condition already states; a side left with no eligible field produces no retry, and the card's chain ends on its failed row, which the completion breakdown reports in the `still_failed` bucket. Editing a card's values while a practice uses it is the user's responsibility: the app neither blocks the edit, deletes the practice, nor shows a value it filtered out.

A value cleared while its card is already on screen, or after a row was generated, renders as an empty value on the run page and in the breakdown's attempt detail, as it does today. No placeholder is added for it.

ADR 036's guarantee against the random draw is untouched: a failed field that is still live and non-blank is placed ahead of sampling and is never dropped in favour of a sampled one.

## Alternatives considered

### Failed fields bypass the blank filter

Proposed and briefly accepted: the appearance that was rated proves the card can carry the field, so the retry keeps it regardless of its current value. Rejected because ADR 026's rule would then hold everywhere except on retries, and a retry could show an empty answer. One invariant with no exceptions is preferred to a guarantee that needs a second guarantee to hold it up.

### An empty side reuses the previous appearance's fields

Proposed together with the bypass, to cover a card whose every prompt-side field was cleared. Rejected for the same reason, and because it would show a card made entirely of empty values.

### Delete the practice when a card value is edited

Rejected. A field deletion already deletes the active practices naming the field (ADR 049), and the same response to one cleared value on one card is out of proportion. The deletion closure (ADR 051) plans and executes deletions of entities, not edits.

### A placeholder for a cleared value

Rejected. The interface could tell a cleared value from a never-written one, since ADR 026 never selects a blank field at generation time, and the shared field renderer already shows "Removed field" for a deleted field (ADR 052). But the same responsibility the decision places on the user applies, and the app should not grow a guard for every mid-practice edit.

## Consequences

Benefits:

- ADR 026 stays a single rule with no exceptions, and no new state or render path is added.
- The trigger for the `still_failed` bucket is recorded where it is actually reached, and a test pins the path so the behaviour cannot drift silently.

Costs:

- A user who clears a value on a card mid-practice sees that card end the practice on a failed row, and the field it just failed is not asked again.
- The `still_failed` bucket remains reachable and stays in the interface, labelled "Failed" (task 018 MD-1) rather than "Abandoned".
- ADR 036's guarantee is conditional, and the condition is now explicit in the records rather than only in the code.
