# ADR 012: Confine mastery arithmetic to a strategy pattern

## Status

Accepted

## Context

Given `review_log` as the source of truth and `card_field_mastery` as a rebuildable cache (ADR 011), the actual blending/scoring/aggregation logic has to live somewhere. The obvious place for a single hot-path update is an atomic SQL statement — `UPDATE card_field_mastery SET mastery = mastery*(1-alpha) + target*alpha WHERE ...`, or a trigger doing the same — guarded by row-level locking for concurrent writers.

That obvious approach directly threatens the guarantee ADR 011 depends on: if arithmetic lives in a SQL expression for the live write path, `rebuild_mastery`'s Python-side replay would have to reimplement the identical formula separately to stay consistent. Two independent implementations of the same math are exactly the kind of thing that drifts apart silently over time.

## Decision

Mastery arithmetic — blending, scoring, aggregation — lives only inside `MasteryStrategy` implementations under `app/mastery/`. Never in SQL, a SQLModel expression, or a trigger, in any phase. The database stores mastery state; it never computes it.

The `MasteryStrategy` protocol (`app/mastery/strategy.py:14-51`) is the interface: `prior()` (state for an unreviewed pair), `expand(group)` (the one place that decides every `MasteryUpdate` for one appearance, because the prompt side needs the whole group to know its breadth), `apply_review(state, update)` (a pure function: state-or-None plus one decided update, in, new state out), `field_score` and `card_score` (collapsing state to display values). `EmaStrategy` (`app/mastery/ema.py`) is the concrete implementation currently in use; its constants (`alpha`, `beta`) deliberately live in that one file, not a shared module, so no other code can reach in and compute with them directly.

The repository layer enforces the boundary from the other side — `app/database_ops/card_field_mastery.py:15-17` states it directly: "this module fetches and writes state; it never computes it. Every value written below is already-computed Python data handed in by a MasteryStrategy — no blending, scoring, or aggregation expression appears in any statement here." The write itself is a plain `SET x = <value>` upsert (`ON CONFLICT DO UPDATE SET prompt_mastery = excluded.prompt_mastery, ...`), never `SET x = <expression>`.

Concurrency is handled with `SELECT ... FOR UPDATE` row locks instead of an atomic SQL blend — accepted explicitly, not by omission: "Row locks replace the atomic SQL blend. Contention is one user rating one card; this is fine. Do not 'optimize' back into SQL expressions."

## Alternatives considered

### Atomic SQL blend (`UPDATE ... SET mastery = mastery*(1-alpha) + target*alpha`) or a trigger

Rejected, explicitly and pre-emptively — the plan doc calls out not to "optimize" back into this shape even under future performance pressure. It would reintroduce exactly the two-independent-implementations risk this pattern exists to avoid, and would make the incremental-write-vs-rebuild equivalence (ADR 011) unverifiable.

## Consequences

Benefits:

- Swapping algorithms (tuning `alpha`, trying a different strategy entirely) is a rebuild, not a data migration, and the two paths (live write, full rebuild) are provably equivalent because they call the identical `apply_rating` primitive.
- Every strategy method is pure — no I/O, no session, no clock — which is what makes the incremental-vs-rebuild property test and a deterministic purity test cheap to write and trust.

Costs:

- The pattern confines arithmetic to one module, but doesn't prevent the _same_ semantic rule from needing independent implementations at two different call sites when two different concerns both need it. The "harshest wins" rule — a `practice_card` fails if any one answer rating is 1 — is applied both in `submit_rating` (`app/services/practice_session.py`, deciding pass/fail) and in `EmaStrategy._aggregate_target` (`app/mastery/ema.py`, deciding the prompt-side mastery target). Both call sites implement the same rule independently; AGENTS.md flags that they "must stay consistent," because changing one without the other would make a card's pass/fail outcome silently disagree with the mastery value driving its own resurfacing. Confining arithmetic to `app/mastery/` doesn't, by itself, guarantee these two sites stay in sync — that has to be maintained by convention and cross-reference.
