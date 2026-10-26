# ADR 014: A deck copy mechanism ahead of share links

## Status

Active

## Context

Letting one user get another user's deck content needs two things: a mechanism to actually duplicate the content correctly, and a mechanism to decide who's allowed to trigger that duplication. These are separable, and one of them is much harder than the other.

Duplicating a deck means remapping every field id inside copied configurations and values through an old-to-new map, re-validating configurations against the source, and rolling the whole copy back on any failure. A share-link table only needs to gate whether a copy is allowed.

## Decision

We will build `copy_deck`, a full and correct duplication of a deck's fields, cards, values, and configurations with every field id remapped, before any share-link or permission table. Share links are deferred: the copy is the hard part, and a link table that only gates whether a copy is allowed is additive once copying is correct.

`copy_deck` does not check the source deck's ownership. The four reads it uses for the source are a deliberate exception to the rule that ownership is enforced in the query for every read of user data: reading copy source material is a different kind of read from reading the caller's own data, and whether a caller may copy from a given deck is the question the share-link phase will answer. The target subject is ownership-scoped like every other write.

A copy starts with no history of its own: `copy_deck` never copies mastery, review rows, or runs.

## Alternatives considered

### Build the share-link/permission table first, gate an unwritten copy mechanism behind it

Rejected. Ownership/authorization design is comparatively easy once the thing being authorized (correct duplication with proper id remapping) exists and is proven correct by tests. Building the gate first would have meant designing permissions around a copy mechanism that didn't exist yet, and risked the harder problem (remapping correctness) surfacing late, inside whatever shape the permission system had already committed to.

## Consequences

**Positive**

- The developer solves and tests the hard problem, id remapping across fields, cards, values, and every configuration array, in isolation from any authorization model.
- The developer building the share-link phase answers only "is this copy allowed", not "does this copy work".

**Negative**

- The developer must not wire `copy_deck` to a router until the share-link phase adds the check that decides who may copy from a source deck; it is safe today only because nothing exposes it.

**Neutral**
