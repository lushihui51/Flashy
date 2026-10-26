# ADR 036: A guarantee of every failed answer field on requeue

## Status

Active

## Context

Requeueing a failed card regenerates its prompts and answers through the same weighted sampler used at session start (`generate_practice_card_fields`). The schema rewrite deliberately made practice selection _weighted, not pure argmin_, so a requeued card doesn't reliably repeat the exact combination it just failed — that principle was never recorded in an ADR, and this ADR now carries it. But the weighting (`100 − mastery`, never-reviewed treated as 0) has a perverse consequence at the field level: a field just rated "Again" lands near weight 57, while every never-asked pool field sits at 100 — so the retry of a failed card was _less_ likely to re-ask the very field the user missed than to ask something new. The card-level guarantee ("a failed card resurfaces", ADR 029) never extended to the field that failed it.

## Decision

We will draw the answer pool count first on requeue, exactly as at session start, and fill those slots ahead of sampling with every answer field rated "Again" that is still live and non-blank on the card; only the remaining slots, count minus forced and floored at zero, are weighted-low-mastery sampled from the rest. The answer count therefore stays consistent with the drawn pool count; only when the failed fields alone outnumber the drawn count does the total exceed it — dropping a failed field is never permitted. Prompt-side resolution and session-start generation are unchanged: the weighted, non-deterministic sampling principle survives everywhere except this one guarantee.

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

**Positive**

- The user is always re-asked every still-askable field they failed, while pool sampling keeps its anti-loop variety for everything else.

**Negative**

- The user who fails many pool fields at once sees less variety on that retry, since its answer set is partly deterministic; the point, not a bug.
- The user whose failed field was archived or blanked before the requeue sees it drop out silently; nothing is forced in its place.

**Neutral**
