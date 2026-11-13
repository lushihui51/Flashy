# PDR 028: A field kept in its deck or deleted with all it held

## Status

Superseded by PDR 044

## Context

PDR 018 sets a deck's fields on its form, when the deck is made, and they change rarely.

Every field of a deck is meant to be asked in a practice, as a prompt or as an answer. PDR 008 lets a configuration leave a field out, so a field kept in its deck need not be asked.

PDR 021 gives each field of a card its own mastery, built from its ratings, and takes the card's mastery across every field of its deck. PDR 025 shows, for each card of a completed practice, every field the practice showed or asked, with its marks and its mastery.

A user who stops studying a field they once practiced may want to keep it, or to get rid of it.

A field set aside, no longer asked or shown but with its history kept, would be a third state between being in its deck and being gone.

## Decision

We will let the user take a field out of a deck only by deleting it. A deleted field is gone with everything it held: its value on every card, its mastery, and its place in every practice that showed or asked it.

We will offer no way to set a field aside.

## Alternatives considered

### Setting a field aside, no longer asked or shown, with its history kept

Rejected because it adds a third state between being in the deck and being gone. A user who wants a field keeps it in the deck, and one who doesn't deletes it.

## Consequences

**Positive**

- The user finds every field either in its deck or gone, with nothing in between.

**Negative**

- The user who deletes a field loses what past practices recorded about it.
- The user who keeps a field they no longer study sees every card of its deck held below ready.

**Neutral**

- The user who stops studying a field chooses between keeping it and deleting it.
