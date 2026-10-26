# ADR 057: Dense value rows on every field create

## Status

Active

## Context

A decision of 2026-08-25 made `card_field_value` dense: every card holds exactly one row per active field of its deck, `""` when unfilled, never a missing row, so no reader has to ask whether a field is empty or was never written. That decision named the paths that keep it true, deck create and the batch edit's field-add, and AGENTS.md records the rule as "adding a field backfills every existing card in the same transaction". The standalone route `POST /decks/{deck_id}/fields` is a week older than that decision (`72fd089`, 2026-08-18) and was never brought under it: `db_create_field_def` inserted the field row and committed, writing nothing for the deck's existing cards.

A 2026-09-24 investigation found the gap while tracing why the batch edit's values loop had a create branch at all. Reproduced against the test database: on a deck with one dense card, the route returned 201 and left the card with 2 value rows against 3 active fields. The gap was silent for three reasons. No standalone field route has a frontend caller, so every field added through the UI went through the batch edit's backfill. The 11 test files that use the route do so through the `existing_field_defs` fixture, always on a deck with no cards yet. And the read paths disagree about a missing row in a way that hides it: the deck detail omits the key, the standalone card read fabricates `""`, and the next edit of the card through either update path quietly inserts the row. The dev database held 28 cards with no missing pair.

## Decision

We will have `POST /decks/{deck_id}/fields` write, in the same transaction as the field row, a `""` `card_field_value` row for every existing card of the deck. The flow spans two operations, so it is a service: `create_field_def` in `app/services/field_def_create.py` touches the deck, stages the field at the next position, stages one value row per card, and commits. On an active-name collision it rolls back and raises the `ValueError` the route already maps to 400, so nothing is persisted. The route's request and response shapes are unchanged.

The committing `db_create_field_def` is deleted rather than kept beside the service. A field create that writes no value rows is the function this decision removes, and its unprefixed name would advertise a complete, committing create.

Stated generally: every path that adds an active field to a deck writes that field's dense rows in the same transaction. Today those paths are deck create, the batch edit's field-add, and the standalone route. No data migration accompanies this: the dev database is dense and nothing is in production.

## Alternatives considered

### Delete or unexpose the route

Rejected. It has no UI caller, but 11 test files and 124 `existing_field_defs` references build fields through it, and rerouting that fixture through deck create or the batch edit is a larger change for no behavioural gain. The route works apart from this one gap.

### Record the route as test-only and narrow the invariant's wording

Rejected. It ratifies drift, the move the persistence surface's record rejected, and an invariant with a standing exception is not one a reader can trust.

### Backfill inside `db_create_field_def`

Rejected. A `database_ops` function writing a sibling table crosses the one-module-per-table layout, and the two existing backfills already live in services, where the layering puts a flow that spans several operations.

### Make every read path fabricate `""` for a missing row

Rejected. The standalone card read already does this, and it is part of what hid the gap. Making the deck detail do the same would leave the invariant unverifiable from the data.

## Consequences

**Positive**

- The developer has the invariant AGENTS.md states true on every write path.
- The developer's batch-edit values loop, and every other reader, keeps trusting one row per active field.
- The developer's `existing_field_defs` fixture and every test built on it work unchanged.

**Negative**

- The developer has one more service module, for a one-field create; the route is no longer a one-query handler.
- The server's cost for the route grows with deck size, one insert per existing card.
- The developer keeps a route live with no UI caller; this record does not decide its future.

**Neutral**
