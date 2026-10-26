# PDR 006: A deck's first field as the name of its cards

## Status

Active

## Context

A card holds one value per field of its deck and no name of its own.

Where a card is shown compactly, as a row in a list or in a practice's summary, one value stands for it.

The fields a card shows as prompts can differ from one attempt to the next under random draw.

A rule the deck editor shows is one the user can act on; a rule it does not show is met in the lists.

PDR 004 gives a deck's form the deck's fields, so the deck editor is the one place the user sets a deck's field order. A new deck starts with a term field first and a definition field second.

## Decision

We will name a card, wherever it is shown compactly, by the value of its deck's first field, the deck's primary field.

We will mark the primary field in the deck editor with a line saying what it does, and the user changes it by moving another field to the top. The editor offers no other way to choose it.

We will show a card whose primary field is blank under a stand-in label that says so.

## Alternatives considered

### No marker, the first field naming the card unannounced

Rejected because the user who reorders fields is unaware of the consequence.

### A primary field chosen on the form apart from the order

Rejected because it adds a choice to every deck for what the order already says.

### Each place picking its own naming field, such as the first prompt shown

Rejected because a card's label can then change between its own attempts.

## Consequences

**Positive**

- The user learns in the deck editor which field names a card everywhere, and moves a field to the top to change it.
- The user sees one card under one label in every list and summary, whatever a practice asked of it.

**Negative**

- The user whose telling content is not in the first field sees a less useful label until they reorder.

**Neutral**

- The user who leaves a card's first field blank finds it listed under the stand-in label.
