# ADR 012: One strategy module for all mastery arithmetic

## Status

Superseded by ADR 083

## Context

Given `review_log` as the source of truth and `card_field_mastery` as a rebuildable cache (ADR 011), the actual blending/scoring/aggregation logic has to live somewhere. The obvious place for a single hot-path update is an atomic SQL statement — `UPDATE card_field_mastery SET mastery = mastery*(1-alpha) + target*alpha WHERE ...`, or a trigger doing the same — guarded by row-level locking for concurrent writers.

That obvious approach directly threatens the guarantee ADR 011 depends on: if arithmetic lives in a SQL expression for the live write path, `rebuild_mastery`'s Python-side replay would have to reimplement the identical formula separately to stay consistent. Two independent implementations of the same math are exactly the kind of thing that drifts apart silently over time.

## Decision

We will keep mastery arithmetic, blending, scoring, and aggregation, only inside `MasteryStrategy` implementations under `app/mastery/`. Never in SQL, a SQLModel expression, or a trigger, in any phase. The database stores mastery state; it never computes it.

`MasteryStrategy` (`app/mastery/strategy.py`) is the interface, and the strategy in use is one implementation of it. Its constants live in that implementation's own module, not a shared one, so no other code can reach in and compute with them. Every value the persistence layer writes is already-computed data handed in by a strategy; no statement carries a blending, scoring, or aggregation expression. Concurrent writes are serialized with a lock rather than folded into an atomic SQL expression; contention is one user rating one card.

## Alternatives considered

### An atomic SQL blend or a trigger

Rejected, explicitly and pre-emptively — the plan doc calls out not to "optimize" back into this shape even under future performance pressure. It would reintroduce exactly the two-independent-implementations risk this pattern exists to avoid, and would make the incremental-write-vs-rebuild equivalence (ADR 011) unverifiable.

## Consequences

**Positive**

- The developer swaps or tunes a strategy as a rebuild, not a data migration, and the live write and the rebuild are provably equivalent because both call the same primitive.
- The developer writes every strategy method pure, with no I/O, session, or clock, which is what makes the incremental-versus-rebuild property test and a purity test cheap to write and trust.

**Negative**

- The developer keeps the harshest-wins rule consistent in two places by hand: the boundary puts a card's pass or fail in the rating service and the prompt-side target in the strategy, and changing one without the other makes a card's outcome silently disagree with the mastery that drives its own resurfacing.

**Neutral**
