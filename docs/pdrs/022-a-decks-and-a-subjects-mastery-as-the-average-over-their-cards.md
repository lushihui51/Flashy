# PDR 022: A deck's and a subject's mastery as the average over their cards

## Status

Active

## Context

PDR 021 gives a card one mastery, saying how ready the user is to recall it, across every field of its deck. A field never practiced counts as not ready, and a card has the same mastery wherever it appears.

PDR 027 leaves to the user what to practice and when, and marks no card as due, so what the app shows about a deck or a subject is what the user chooses by.

A subject holds decks, and a deck holds cards. Decks can differ widely in size: a subject may hold a deck of two cards beside one of five hundred.

A deck exists before its first card, and a subject before its first deck, so either can hold no card at all.

An average over a subject's decks weighs each deck the same, whatever its size. An average over a subject's cards weighs each card the same, whatever its deck.

Today a deck's and a subject's mastery are each a whole number, the average of their cards' numbers. A card never practiced counts as about half known, so a deck never practiced reads about half known too.

## Decision

We will give every deck one mastery, the average of its cards' mastery. We will give every subject one mastery, the average over every card in its decks, each card counting once whatever its deck.

We will give a deck, and a subject, the same mastery wherever it appears.

We will give a deck with no cards no mastery, and a subject whose decks hold no cards no mastery.

## Alternatives considered

### No mastery for a deck or a subject

Rejected because the user who chooses what to practice would have nothing to choose by.

### A subject's mastery as the average of its decks' mastery

Rejected because a deck of two cards would count as much as one of five hundred.

## Consequences

**Positive**

- The user has one mastery for every deck and one for every subject to choose what to practice by, read the same wherever it is shown.
- The user reads a subject's mastery as the state of every card in it, with a large deck counting for its size.

**Negative**

- The user who practices a small deck in a subject that also holds a large one sees the subject's mastery move little.
- The user who adds a large deck they have not practiced to a subject sees the subject's mastery fall in proportion to that deck's size.

**Neutral**

- The user sees no mastery on a deck until it has a card, and none on a subject until one of its decks has a card.
- Where a deck's or a subject's mastery is shown is decided apart from this record, and the user meets it only there.
