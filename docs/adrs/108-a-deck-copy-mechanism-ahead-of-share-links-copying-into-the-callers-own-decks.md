# ADR 108: A deck copy mechanism ahead of share links, copying into the caller's own decks

## Status

Active

## Context

Letting one user get another user's deck content needs two things: a mechanism that duplicates the content correctly, and a mechanism that decides who may trigger the duplication. The two are separable.

A deck's structure is its `field_def` rows, and every reference to a field is its id (ADR 009). A card holds one `card_field_value` row per active field of its deck (ADR 057). Duplicating a deck therefore means remapping every field id through an old-to-new map and rolling the whole copy back on any failure.

PDR 033 leaves a deck nothing above it, and PDR 039 makes a deck's configuration part of a practice rather than of the deck. A deck carries its owner and a name unique among its owner's decks.

Every read of user data keeps ownership in the query (ADR 034).

`copy_deck` in `app/services/deck_copy.py` is reached by no route. It copies a deck's fields, cards, values and configurations into a target subject.

ADR 014 decided the copy before share links, with configurations and a target subject in it. Neither belongs to a deck any longer, so this record restates it.

## Decision

We will build `copy_deck`, a full and correct duplication of a deck's fields, cards and values with every field id remapped, before any share-link or permission table. Share links are deferred: the copy is the hard part, and a link table that only gates whether a copy is allowed is additive once copying is correct.

`copy_deck` does not check the source deck's ownership. Its reads of the source are a deliberate exception to the rule that ownership is enforced in the query for every read of user data: reading copy source material is a different kind of read from reading the caller's own data, and whether a caller may copy from a given deck is the question the share-link phase will answer. The copy is owned by the caller, and every write it makes is scoped to the caller like every other write.

A copy starts with no history of its own: `copy_deck` never copies mastery, review rows, practices or runs.

## Alternatives considered

### The share-link table first, gating a copy not yet written

Rejected because designing permissions around a copy that does not exist risks the harder problem, correct remapping, surfacing late inside whatever shape the permission system had committed to.

### The deck's configurations copied from the practices that hold it

Rejected because a configuration is part of a practice, and a copied deck belongs to no practice.

## Consequences

**Positive**

- The developer solves and tests the remapping of field ids across fields, cards and values in isolation from any authorization model.
- The developer building the share-link phase answers only whether a copy is allowed, not whether it works.

**Negative**

- The developer must not wire `copy_deck` to a router until the share-link phase adds the check that decides who may copy from a source deck.
- The developer who wires it must give the copy a name not taken among the caller's decks.

**Neutral**

- The developer finds no configuration in a copied deck.
