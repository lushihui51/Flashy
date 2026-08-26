# ADR 023: Entity actions in the header, collection actions in the collection, no card entry in deck forms

## Status

Accepted

## Context

The shipped deck details page put an icon-only "+" in the page header whose meaning depended on invisible state (the active tab), and the deck create/edit forms embedded card entry — a nested collection editor — alongside the deck's own name, subject, and fields. Screenshot review (2026-08-25) found both: a button whose target the user must guess, and a "mega-form" coupling routine content entry to schema editing. The corrections shipped as `f4afa9a` (deck page) and `6a288a0` (subject page, found by the consistency check); this ADR records the rules they restored so future surfaces follow them rather than rediscovering them.

## Decision

Three placement rules, binding for every surface:

1. **Actions on the entity itself** (edit, delete, practice) live in the page header.
2. **Actions on a collection the page shows** (add card, add deck, new configuration) live inside that collection's content area — labeled buttons, repeated in the collection's empty state — never an icon-only "+" whose meaning depends on invisible state.
3. **Creation = identity + schema at birth; editing = identity + schema over time.** Routine content (cards) belongs to neither form: it is managed from its own list, and a freshly created parent lands on its detail page, where the empty collection invites adding content.

### Alternative considered: a header "+" that switches meaning with the active tab

Rejected: it is what shipped — the button's target was invisible state, and the header mixed entity scope with collection scope.

### Alternative considered: keep card entry inside deck create/edit

Rejected: it couples routine content entry to schema editing, bloats the form, and left the API with a `cards` array on deck-create that the client now always sends empty (removal is deferred cleanup in `docs/tasks/004-practice-setup.md`).

## Consequences

Benefits:

- A button's scope is self-evident from where it sits; forms stay small and single- purpose; empty states own their add affordances.

Costs:

- One more placement rule to check in review.
- The deck-create contract keeps a vestigial empty `cards` array until the deferred cleanup lands.
