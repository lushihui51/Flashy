# ADR 116: Readiness as the only mastery figure leaving the mastery module, folded over a practice's cards

## Status

Active

## Context

`review_log` is the source of truth for mastery, and mastery state is a disposable projection of it, rebuilt by replaying every row through the same primitive the live write path uses (ADR 011).

A pair of card and field that has never been reviewed has no state (ADR 011).

Current state is the latest `mastery_log` row per card and field (ADR 042).

Concurrent writes to mastery state come only from one user rating one card.

A single update can be written as an atomic SQL statement or a trigger, guarded by row locking. With the live path's formula in SQL, the Python replay would carry a second implementation of the same formula, and the two could drift apart with no error.

Every strategy method is pure, with no I/O, session or clock, and the live write and a rebuild call the same primitive, which a property test proves equivalent.

`MasteryStrategy` in `app/mastery/strategy.py` is the interface, and `EmaStrategy` in `app/mastery/ema.py` is the implementation in use. Each strategy's numbers sit on a scale of its own.

PDR 021 makes a card's mastery how likely the user is to recall it now, across every field of its deck, with a field never practiced counting as not ready, and the same wherever the card appears.

PDR 045 makes a deck's mastery the average of its cards' mastery, and a practice's the average over every card of its decks, each card counting once whatever its deck. A deck with no cards, and a practice whose decks hold no cards, has none. A run has no mastery of its own.

PDR 046 shows mastery as a circle filled from not ready to ready, so the figure the user sees sits on one fixed scale whichever strategy produces it.

PDR 041 shows each card's mastery after a run and how it changed, so the summary reads the figure too.

The code's names are independent of the user's words (ADR 069), so the user's word "Mastery" can name a figure the code names otherwise.

A practice's decks are its `practice_configuration` rows, one per deck (ADR 107), and every practice belongs to one user (ADR 105).

`card_readiness`, `deck_readiness` and `subject_readiness` in `app/services/mastery.py` group read rows by their owner through `_fold_collections` and fold each group in `app/mastery/readiness.py`. `subject_readiness` reads its rows from `db_fetch_subject_mastery_read_rows`, one row per card and field of a subject's decks.

A card's pass or fail is decided in `submit_rating` in `app/services/practice_run.py`, the strategy's prompt-side target applies the same harshest-wins rule, and the two are kept consistent by hand.

ADR 083 folded a subject's readiness over the cards of its decks. Subjects are gone and a practice takes that place, so this record restates ADR 083.

## Decision

We will keep all mastery arithmetic under `app/mastery/`, and never in SQL, a SQLModel expression or a trigger, in any phase. The database stores mastery state and never computes it: the persistence layer writes only values a strategy has already computed, and no statement carries a blending, scoring or aggregation expression. We will serialize concurrent writes with a lock rather than fold them into an atomic SQL expression.

We will make `MasteryStrategy` the interface, with the strategy in use one implementation of it. An implementation owns four things: the stored state, which the code calls mastery; the arithmetic that blends a review into it; the translation of a field's mastery, or `None` for a field never reviewed, into its readiness, how likely the user is to recall the field now, from 0 to 1; and its reach, the furthest one rating can move a side's readiness, exposed as a read-only property. Each implementation keeps its constants in its own module, where no other code can compute with them.

We will fold readiness above the field in one module that belongs to no strategy, `app/mastery/readiness.py`. A card's readiness is the average over every field of its deck, a field never reviewed counting 0. A deck's is the average over its cards, and a practice's the average over every card of its decks, each card once; the fold takes a flat list of cards' readiness and never decks' figures. A deck or a practice with no card has no readiness. We will compute readiness on read and store none of it.

We will read a practice's cards for the fold as one row per card and field of each of its decks, for every requested practice in one statement, `db_fetch_practice_mastery_read_rows`, each row owned by its practice through `practice_configuration`, and fold them in `practice_readiness` through `_fold_collections`.

We will let no code outside `app/mastery/` read any mastery figure but readiness, and have the API return no other. We will name the figure readiness in code, apart from mastery, the strategy's stored state.

## Alternatives considered

### An atomic SQL blend or a trigger

Rejected because it puts a second implementation of the formula beside the replay's, which can drift silently, and makes the equivalence of incremental writes and a rebuild unverifiable.

### The folds inside each strategy implementation

Rejected because every strategy would repeat PDR 021's and PDR 045's averaging, and any one of them could silently change what every circle means.

### The folds in a service or a SQL `AVG`

Rejected because the database would compute a mastery figure, or a service would hold mastery arithmetic beside its I/O.

### A practice's readiness as its decks' readiness weighted by their card counts

Rejected because it is a second aggregation over decks' figures, which the fold of a flat list of cards rules out.

### Only the fields a practice's configurations ask

Rejected because a card would read differently on a practice than everywhere else, against PDR 021 and PDR 045.

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

## Consequences

**Positive**

- The developer adding a strategy writes its own translation to readiness and states its own reach, and nothing outside `app/mastery/` changes.
- The developer outside `app/mastery/` has one mastery figure to read, and cannot read a strategy's scale by mistake.
- The developer replacing a strategy leaves the averaging behind every circle unchanged, since the folds belong to no strategy.
- The user sees a card read the same on a practice as on its deck.
- The developer reads every practice's readiness for a list in one statement.

**Negative**

- The developer who implements a strategy also owns its translation, and a translation that misreads its own state misreads every circle and every generation weight, with no check outside the strategy.
- The server folds every card of a practice's decks on every read of its readiness, the fields its configurations leave out included.

**Neutral**

- The developer reads mastery in code as the strategy's stored state, and readiness as the figure the user is shown as "Mastery".
