# ADR 112: One function cutting every run from its practice's configurations as they stand

## Status

Active

## Context

PDR 040 lets the user start a next run from a completed run's page, over every card of the practice, or over exactly the cards the summary's chosen counts show. Both are runs of the same practice, kept under it, and both ask each deck by the practice's configurations as they stand.

Starting a practice with no active run creates a run, and a rerun or a run of chosen cards is refused while the practice has an active run (ADR 110).

A practice holds one configuration per deck, and each run cuts a frozen copy of each, which generation reads for the run's lifetime (ADR 107). Every path that writes a practice's configuration leaves it valid, and a violation found at the cut raises an assertion error (ADR 109).

A blank-valued field is excluded from generation (ADR 026), so a card that holds a value somewhere can still have nothing for one side of its copy, and no count of cards sees it.

Every run belongs to exactly one practice (ADR 105). A run with no card would be created active and marked completed on its first read (ADR 111).

Every refusal a user reaches carries a code, and the sentence is chosen by that code (ADR 070).

Today `start_practice_run`, `rerun_practice_run` and `start_chosen_cards_run` in `app/services/practice_run.py` each cut their own copies, and share `_snapshot_and_generate_deck`, which generates every card of a deck read by `db_read_card_ids_for_deck`, and the `no_cards` check.

ADR 076 built a rerun from the completed run's own copies, ADR 086 built a run of chosen cards from them and had a rerun copy its cards, and ADR 085 refused an empty run on each of three paths with checks of their own. PDR 040 asks every next run by the practice's configurations as they stand, so this record replaces all three.

## Decision

We will cut every run in one service function, for starting a practice, a rerun and a run of chosen cards. It takes a practice and an optional list of cards, and for each `practice_configuration` of the practice it validates the configuration, cuts a `run_configuration` from it, and generates that deck's cards through `_snapshot_and_generate_deck`.

We will give `run_configuration` a nullable `card_ids` uuid array. Null means every card of the deck; a list means only those of the deck's cards that still exist. Generation reads it from the frozen row, like the six arrays. A whole run, a rerun included, is cut with `card_ids` null, and a run of chosen cards with each copy's `card_ids` set to that deck's chosen cards, empty for a deck that holds none. A deleted card's id stays in `card_ids`, where it selects nothing.

We will build a rerun and a run of chosen cards from the practice's configurations as they stand, never from the completed run's copies. The completed run supplies only the chosen cards, each checked to be one of its cards.

We will refuse to create a run that writes no run card. After every deck has been cut and generated, and before the single commit, the function checks that at least one `run_card` was written across all decks, and otherwise refuses with `no_cards`, writing nothing. The router answers it with 400 and the coded detail.

## Alternatives considered

### Rerun and chosen cards built from the completed run's copies

Rejected because a change the user made to the practice's board would not reach the next run.

### Three functions, each reading the practice's configurations

Rejected because validation and the refusal would live in three places.

### A rerun covering the cards of the run it repeats

Rejected because a rerun runs the whole practice, which takes in the cards added to its decks since.

### A run of chosen cards cut only for the decks that hold a chosen card

Rejected because every run of a practice holds every deck of the practice, so a run of chosen cards would hold a different set of decks than the practice it runs.

### A table of chosen cards, cascading with the card

Rejected because an empty set would read as every card, so a deck whose chosen cards were all deleted would run whole.

### Refusal on the decks' card counts before generating

Rejected because it misses the blank-field cause, and generation, which runs anyway, is the only place the condition is known.

### The empty run allowed, relying on its completion on read

Rejected because every surface that lists or opens it would have nothing to show.

### A distinct code per cause

Rejected because telling the causes apart would expose generation details the API does not carry.

## Consequences

**Positive**

- The developer finds every run cut in one place, with one validation and one refusal.
- The user's change to a practice's board reaches the next run, however it is started.
- The user's rerun takes in the cards added to the practice's decks since the run it starts from.
- The developer gets a run with at least one card on every path, judged across all its decks.

**Negative**

- The server runs generation to completion before refusing, at the cost of a run that succeeds.
- The user discovers a practice with nothing to ask only when the run is refused.
- The developer reading `card_ids` must expect dead ids, since no cascade removes them.

**Neutral**

- The developer renders `no_cards` wherever a run is started.
