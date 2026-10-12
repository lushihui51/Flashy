# ADR 057: Every field create writes the dense value rows

## Status

Accepted. Records at ADR level the density invariant task 003 D10 introduced; amends nothing.

## Context

Task 003 D10 (2026-08-25) made `card_field_value` dense: every card holds exactly one row per active field of its deck, `""` when unfilled, never a missing row, so no reader has to ask whether a field is empty or was never written. D10 named the paths that keep it true, deck create and the batch edit's field-add, and AGENTS.md records the rule as "adding a field backfills every existing card in the same transaction". The standalone route `POST /decks/{deck_id}/fields` is a week older than D10 (`72fd089`, 2026-08-18) and was never brought under it: `db_create_field_def` inserted the field row and committed, writing nothing for the deck's existing cards.

The 2026-09-24 investigation of task 015 T9's Notes line found the gap while tracing why the batch edit's values loop had a create branch at all. Reproduced against the test database: on a deck with one dense card, the route returned 201 and left the card with 2 value rows against 3 active fields. The gap was silent for three reasons. No standalone field route has a frontend caller, so every field added through the UI went through the batch edit's backfill. The 11 test files that use the route do so through the `existing_field_defs` fixture, always on a deck with no cards yet. And the read paths disagree about a missing row in a way that hides it: the deck detail omits the key, the standalone card read fabricates `""`, and the next edit of the card through either update path quietly inserts the row. The dev database held 28 cards with no missing pair.

## Decision

`POST /decks/{deck_id}/fields` writes, in the same transaction as the field row, a `""` `card_field_value` row for every existing card of the deck. The flow spans two operations, so under ADR 034 it is a service: `create_field_def` in `app/services/field_def_create.py` touches the deck, stages the field at the next position, stages one value row per card, and commits. On an active-name collision it rolls back and raises the `ValueError` the route already maps to 400, so nothing is persisted. The route's request and response shapes are unchanged.

The committing `db_create_field_def` is deleted rather than kept beside the service. A field create that writes no value rows is the function this decision removes, and under ADR 055 its unprefixed name would advertise a complete, committing create.

Stated generally, which is D10's rule at ADR level: every path that adds an active field to a deck writes that field's dense rows in the same transaction. Today those paths are deck create, the batch edit's field-add, and the standalone route. No data migration accompanies this: the dev database is dense and nothing is in production.

## Alternatives considered

### Delete or unexpose the route

Rejected. It has no UI caller, but 11 test files and 124 `existing_field_defs` references build fields through it, and rerouting that fixture through deck create or the batch edit is a larger change for no behavioural gain. The route works apart from this one gap.

### Record the route as test-only and narrow the invariant's wording

Rejected. It ratifies drift, the move ADR 055 rejected for the persistence surface, and an invariant with a standing exception is not one a reader can trust.

### Backfill inside `db_create_field_def`

Rejected. A `database_ops` function writing a sibling table crosses ADR 034's one-module-per-table layout, and the two existing backfills already live in services, where ADR 034 puts a flow that spans several operations.

### Make every read path fabricate `""` for a missing row

Rejected. The standalone card read already does this, and it is part of what hid the gap. Making the deck detail do the same would leave the invariant unverifiable from the data.

## Consequences

Benefits:

- The invariant AGENTS.md and task 003 D10 state is true on every write path, and an ADR now records it.
- The batch edit's values loop, and every other reader, can keep trusting one row per active field.
- The `existing_field_defs` fixture and every test built on it work unchanged.

Costs:

- One more service module, for a one-field create; the route is no longer a one-query handler.
- The route's cost grows with deck size, one insert per existing card, the same as the batch edit's field-add.
- The route stays live with no UI caller. This ADR records that fact and does not decide the route's future.
