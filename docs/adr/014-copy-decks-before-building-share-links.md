# ADR 014: Copy decks before building share links

## Status

Accepted

## Context

Letting one user get another user's deck content needs two things: a mechanism to
actually duplicate the content correctly, and a mechanism to decide who's allowed to
trigger that duplication. These are separable, and one of them is much harder than
the other.

## Decision

Build `copy_deck` (a full, correct duplication mechanism) before any
`shared_deck` link/permission table. Share links are explicitly deferred, with the
reasoning stated directly: "Phase 6's copy function is the hard part; the link
table is additive."

**What's actually hard, and why it had to come first:** `copy_deck`
(`app/services/deck_copy.py:26-128`) builds a `field_map` of old-id → new-id as it
copies `field_def` rows, then remaps every uuid inside a copied
`deck_practice_config`'s four id arrays through that map, remaps
`card_field_value.field_def_id` per value (silently dropping values for archived
fields, which never get a `field_map` entry), and re-validates configs against the
source deck before remapping — the same staleness concern as ADR 013 — all inside
one explicit transaction, so any failure rolls back the whole copy rather than
leaving a partially-remapped deck behind. A share-link table, by contrast, only
needs to gate *whether* a copy is allowed — it doesn't need to solve remapping
itself, which is why it's additive once copying is correct.

**Source-deck ownership is deliberately not checked — the detail invisible in the
schema alone.** Four repository helpers exist specifically for this function and are
an explicit, documented exception to the rule that ownership is enforced in the
query for every other read of user data: `db_read_deck_for_copy`,
`db_read_deck_practice_config_for_copy`, `db_read_field_defs_for_copy`,
`db_read_cards_with_values_for_deck`. Each docstring makes the same distinction —
quoting `copy_deck`'s own docstring (`app/services/deck_copy.py:33-37`):
"`target_subject_id` is ownership-scoped to `user_id` like every other query
touching a user's own data; `source_deck_id` deliberately isn't ... copying is the
mechanism a future share-link phase authorizes, not something this function gates
on its own." Reading "copy source material" is treated as a different kind of read
than reading "the caller's own data" — the question of whether a given caller
*may* copy from a given source deck is deferred entirely to the not-yet-built
share-link phase.

`copy_deck` never copies `card_field_mastery`, `review_log`, or sessions — "a copy
starts with no history of its own" (`app/services/deck_copy.py:43-45`). A copy is a
content-only snapshot, not a full clone.

## Alternatives considered

### Build the share-link/permission table first, gate an unwritten copy mechanism behind it

Rejected. Ownership/authorization design is comparatively easy once the thing being
authorized (correct duplication with proper id remapping) exists and is proven
correct by tests. Building the gate first would have meant designing permissions
around a copy mechanism that didn't exist yet, and risked the harder problem
(remapping correctness) surfacing late, inside whatever shape the permission system
had already committed to.

## Consequences

Benefits:

- The hard problem (id remapping correctness across fields, cards, values, and
  every config array) is solved and tested in isolation, independent of any
  authorization model.
- A future share-link phase only has to answer "is this copy allowed," not also
  "does this copy work."

Costs:

- Because source-deck ownership isn't checked at the data layer, and `copy_deck`
  currently has no HTTP router wired to it (confirmed: it's only called from tests
  and its own service module), the function is safe *only* because nothing exposes
  it publicly yet. This is a real, acknowledged gap — `copy_deck` must not be wired
  to a router until the share-link phase adds the authorization check that decides
  who may copy from a given source deck.
