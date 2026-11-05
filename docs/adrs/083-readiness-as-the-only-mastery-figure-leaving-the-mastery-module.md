# ADR 083: Readiness as the only mastery figure leaving the mastery module

## Status

Active

## Context

`review_log` is the source of truth for mastery, and mastery state is a disposable projection of it, rebuilt by replaying every row through the same primitive the live write path uses (ADR 011).

A pair of card and field that has never been reviewed has no state (ADR 011).

Current state is the latest `mastery_log` row per card and field (ADR 042).

Concurrent writes to mastery state come only from one user rating one card.

A single update can be written as an atomic SQL statement or a trigger, guarded by row locking. With the live path's formula in SQL, the Python replay would carry a second implementation of the same formula, and the two could drift apart with no error.

ADR 012 kept mastery arithmetic, blending, scoring and aggregation, only inside `MasteryStrategy` implementations under `app/mastery/`, and never in SQL, a SQLModel expression or a trigger.

Under that arrangement every strategy method is pure, with no I/O, session or clock, and the live write and a rebuild call the same primitive, which a property test proves equivalent.

`MasteryStrategy` in `app/mastery/strategy.py` is the interface, and `EmaStrategy` in `app/mastery/ema.py` is the implementation in use. The interface's `field_score` and `card_score` put a field's and a card's state on the strategy's own scale.

Each strategy's numbers sit on a scale of their own. Under `EmaStrategy` a steady Good settles near 67, and `card_score` counts a field never reviewed at `MASTERY_PRIOR`, 50, so a card never practiced reads half full.

`field_score` and `card_score` feed generation, meaning the order at run start, `weighted_low_mastery_sample` and retry placement (ADR 036, ADR 037), and they feed the practice's summary.

`card_mastery` and `deck_mastery` in `app/services/mastery.py` fold through `card_score`. `deck_mastery` has no caller, and no subject fold exists.

PDR 021 makes a card's mastery how likely the user is to recall it now, across every field of its deck, with a field never practiced counting as not ready, and the same wherever the card appears.

PDR 022 makes a deck's mastery the average over its cards, and a subject's the average over every card in its decks, each card counting once; a deck or a subject with no card has none.

Neither PDR 021's nor PDR 022's averaging depends on how a strategy keeps a field's state.

PDR 023 shows mastery as a circle filled from not ready to ready, so the figure the user sees sits on one fixed scale whichever strategy produces it.

PDR 024 shows each card's mastery after a practice and how it changed, so the summary reads the figure too.

The code's names are independent of the user's words (ADR 069), so the user's word "Mastery" can name a figure the code names otherwise.

A card's pass or fail is decided in `submit_rating` in `app/services/practice_run.py`, the strategy's prompt-side target applies the same harshest-wins rule, and the two are kept consistent by hand.

## Decision

We will keep all mastery arithmetic under `app/mastery/`, and never in SQL, a SQLModel expression or a trigger, in any phase. The database stores mastery state and never computes it: the persistence layer writes only values a strategy has already computed, and no statement carries a blending, scoring or aggregation expression. We will serialize concurrent writes with a lock rather than fold them into an atomic SQL expression.

We will make `MasteryStrategy` the interface, with the strategy in use one implementation of it. An implementation owns four things: the stored state, which the code calls mastery; the arithmetic that blends a review into it; the translation of a field's mastery, or `None` for a field never reviewed, into its readiness, how likely the user is to recall the field now, from 0 to 1; and its reach, the furthest one rating can move a side's readiness, exposed as a read-only property. Each implementation keeps its constants in its own module, where no other code can compute with them.

We will fold readiness above the field in one module that belongs to no strategy, `app/mastery/readiness.py`. A card's readiness is the average over every field of its deck, a field never reviewed counting 0. A deck's is the average over its cards, and a subject's the average over every card in its decks, each card once; the fold takes a flat list of cards' readiness and never decks' figures. A deck or a subject with no card has no readiness. We will compute readiness on read and store none of it.

We will let no code outside `app/mastery/` read any mastery figure but readiness, and have the API return no other. We will name the figure readiness in code, apart from mastery, the strategy's stored state.

## Alternatives considered

### An atomic SQL blend or a trigger

Rejected because it puts a second implementation of the formula beside the replay's, which can drift silently, and makes the equivalence of incremental writes and a rebuild unverifiable.

### The folds inside each strategy implementation

Rejected because every strategy would repeat PDR 021's and PDR 022's averaging, and any one of them could silently change what every circle means.

### The folds in a service or a SQL `AVG`

Rejected because the database would compute a mastery figure, or a service would hold mastery arithmetic beside its I/O, and the arithmetic would no longer sit in one module of pure functions.

### One strategy number serving generation and the user

Rejected because it ties every later strategy to how its numbers read to a user.

### Readiness beside the strategy's number, both read outside `app/mastery/`

Rejected because it leaves each caller to pick one, and a caller on the wrong scale computes plausible, wrong figures with nothing to show it.

### A translator paired with the strategy by configuration

Rejected because it goes silently wrong when one is swapped without the other.

### The translation outside `app/mastery/`

Rejected because, outside the module, the translation sees only the strategy's number and not the state it was computed from.

### Everything renamed to readiness

Rejected because it misnames stored state that is not a likelihood, and costs a migration.

### One code name, mastery, for both figures

Rejected because existing callers would keep computing on the strategy's scale.

## Consequences

**Positive**

- The developer adding a strategy writes its own translation to readiness and states its own reach, with no requirement on how its own numbers read, and nothing outside `app/mastery/` changes.
- The developer outside `app/mastery/` has one mastery figure to read, and cannot read a strategy's scale by mistake.
- The developer replacing a strategy leaves the averaging behind every circle unchanged, since the folds belong to no strategy.
- The developer cannot build a subject's readiness from its decks' figures by accident.
- The developer keeps the stored state's columns and names as they are, and runs no migration.

**Negative**

- The developer who implements a strategy also owns its translation, and a translation that misreads its own state misreads every circle and every generation weight, with no check outside the strategy.
- The developer renames every name outside `app/mastery/` that is built on the figure to a readiness name.

**Neutral**

- The developer reads mastery in code as the strategy's stored state, and readiness as the figure the user is shown as "Mastery".
- The developer finds `field_score` and `card_score` gone from the strategy's contract.
