# ADR 036: Failed answer fields are guaranteed on requeue

## Status

Accepted

## Context

Requeueing a failed card regenerates its prompts and answers through the same weighted sampler used at session start (`generate_practice_card_fields`). Task 001 deliberately made practice selection _weighted, not pure argmin_, so a requeued card doesn't reliably repeat the exact combination it just failed — that principle was recorded only in task-file notes, never an ADR, and this ADR now carries it. But the weighting (`100 − mastery`, never-reviewed treated as 0) has a perverse consequence at the field level: a field just rated "Again" lands near weight 57, while every never-asked pool field sits at 100 — so the retry of a failed card was _less_ likely to re-ask the very field the user missed than to ask something new. The card-level guarantee ("a failed card resurfaces", ADR 029) never extended to the field that failed it.

## Decision

On requeue, the answer pool count is drawn first, exactly as at session start. Every answer field rated "Again" that is still live and non-blank on the card fills those slots ahead of sampling; only the remaining slots (count minus forced, floored at zero) are weighted-low-mastery sampled from the rest. The answer count therefore stays consistent with the drawn pool count; only when the failed fields alone outnumber the drawn count does the total exceed it — dropping a failed field is never permitted. Prompt-side resolution and session-start generation are unchanged: the weighted, non-deterministic sampling principle survives everywhere except this one guarantee.

## Alternatives considered

### Keep the purely probabilistic requeue

Rejected — an explicit "Again" is a stronger, more specific signal than any mastery delta, and the retry is precisely the moment a learner expects to be re-asked what they missed.

### Strengthen the bias without guaranteeing

Rejected — flooring a just-failed field's effective score still lets it miss the draw; a probabilistic "probably" is the wrong answer to an explicit failure signal.

### Deterministic lowest-mastery-first for the remaining slots too

Rejected — reintroduces exactly the combination-staleness the weighted sampling was chosen to avoid.

### Clamp forced fields to the drawn count

Rejected — would silently drop a failed field whenever the new draw came up small.

## Consequences

Benefits:

- The retry always re-asks every still-askable field the user failed; the anti-loop variety of pool sampling is preserved for everything else.

Costs:

- A retry's answer set is partially deterministic, so a user who fails many pool fields at once sees less variety on that retry — accepted as the point, not a bug.
- A failed field archived or blanked before the requeue silently drops out (the existing generation filters); nothing is forced in its place.
