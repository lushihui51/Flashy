# PDR 007: A card's mastery as one number over every field of its deck

## Status

Active

## Context

The app keeps a mastery for each field of a card, built from the ratings the user has given that field. A field never rated has a starting value.

A practice reviews some of a card's fields and not others: a configuration chooses which fields are answers, and random draw varies them from one attempt to the next.

PDR 006 shows a card compactly as a row under one label, in lists and in a practice's summary, outside any configuration. Rows are sorted and compared.

A number over every field of the deck counts what the user has not yet reviewed against the card; a number over the reviewed fields alone counts only what the user has done.

## Decision

We will give a card one mastery: a whole number over every field of its deck, a field never reviewed counting at its starting value.

We will show the same number for a card wherever it appears, whatever configuration looked at it.

We will show a card's change after a practice as its number after the practice minus its number before.

We will show each field's own mastery and change beside the field in the card's detail.

## Alternatives considered

### A number relative to the configuration used

Rejected because one card gets different numbers through different configurations.

### A number over reviewed fields only

Rejected because a card mastered on one field of five reads fully mastered.

### No number per card, only per field

Rejected because rows and sorting need one.

## Consequences

**Positive**

- The user sees the same number for a card wherever it appears.
- The user sorts and compares cards by one number.

**Negative**

- The user who practiced one field of five sees a fifth of the gain on the card, and finds the field's own gain only in the card's detail.

**Neutral**

- The user sees a never-reviewed field marked as such in the card's detail while it counts at its starting value in the card's number.
