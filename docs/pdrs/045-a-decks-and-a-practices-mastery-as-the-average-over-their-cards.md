# PDR 045: A deck's and a practice's mastery as the average over their cards

## Status

Active

## Context

PDR 021 gives a card one mastery, saying how ready the user is to recall it, across every field of its deck. A field never practiced counts as not ready, and a card has the same mastery wherever it appears.

PDR 037 leaves to the user what to practice and when, and marks no card as due, so what the app shows about a deck or a practice is what the user chooses by.

PDR 035 makes a practice a set of decks the user keeps and runs again and again, and one deck can be in several practices. The user chooses among their practices which to run.

Decks can differ widely in size: a practice may hold a deck of two cards beside one of five hundred.

A deck exists before its first card, so a deck, and a practice of such decks, can hold no card at all.

An average over a practice's decks weighs each deck the same, whatever its size. An average over a practice's cards weighs each card the same, whatever its deck.

During a run, the mastery of its cards changes with every rating the user gives.

PDR 033 takes subjects away, and with them the mastery PDR 022 gave a subject over every card of its decks. This record replaces PDR 022 to give that mastery to a practice, and restates a deck's unchanged.

## Decision

We will give every deck one mastery, the average of its cards' mastery. We will give every practice one mastery, the average over every card of its decks, each card counting once whatever its deck.

We will give a deck, and a practice, the same mastery wherever it appears.

We will give a deck with no cards no mastery, and a practice whose decks hold no cards no mastery.

We will give a run no mastery of its own.

## Alternatives considered

### No mastery for a deck or a practice

Rejected because the user who chooses what to practice would have nothing to choose by, and without a practice's mastery would choose by its decks and then hunt for the practice that holds them.

### A practice's mastery as the average of its decks' mastery

Rejected because a deck of two cards would count as much as one of five hundred.

## Consequences

**Positive**

- The user has one mastery for every deck and one for every practice to choose by, read the same wherever it is shown.
- The user finds the least ready practice as they find the least ready deck.
- The user reads a practice's mastery as the state of every card in it, with a large deck counting for its size.

**Negative**

- The user who practices a small deck in a practice that also holds a large one sees the practice's mastery move little.

**Neutral**

- The user sees no mastery on a deck until it has a card, and none on a practice until one of its decks has a card.
- The user sees a practice's mastery move when another practice sharing one of its decks is run.
- The user reads how far a run has gone by its progress, and no mastery of its own.
