# PDR 013: A deck's and a subject's mastery as the average over their cards

## Status

Superseded by PDR 022

## Context

PDR 007 gives a card one mastery: a whole number over every field of its deck, a field never reviewed counting at its starting value, the same wherever the card appears.

PDR 011 leaves to the user what to practice and when, and marks no card as due, so what the app shows about a deck or a subject is what the user chooses by.

A subject holds decks, and a deck holds cards. Decks can differ widely in size: a subject may hold a deck of two cards beside one of five hundred.

A deck exists before its first card, and a subject before its first deck, so either can hold no card at all.

An average over a subject's decks weighs each deck the same whatever its size. An average over a subject's cards weighs each card the same whatever its deck.

## Decision

We will give every deck one mastery, the average of its cards' numbers, and every subject one mastery, the average over every card in its decks, each card counting once whatever its deck.

We will show the same number for a deck, and for a subject, wherever it appears.

We will give a deck with no cards no number, and a subject whose decks hold no cards no number.

## Alternatives considered

### No number for a deck or a subject

Rejected because the user who chooses what to practice would have nothing to choose by.

### A subject's number as the average of its decks' numbers

Rejected because a deck of two cards would count as much as one of five hundred.

## Consequences

**Positive**

- The user has one number for every deck and one for every subject to choose what to practice by, read the same wherever it is shown.
- The user reads a subject's number as the state of every card in it, a large deck counting for its size.

**Negative**

- The user who practices a small deck in a subject that also holds a large one sees the subject's number move little.

**Neutral**

- The user sees no number on a deck until it has a card, and none on a subject until one of its decks has a card.
- Where a deck's or a subject's number is shown is decided apart from this record, and the user meets the number only there.
