# ADR 091: Whole collections in bounded statements for every collection read

## Status

Active

## Context

Every row the API returns belongs to the user the request authenticates (ADR 007), so a collection is one person's own, sized by what that person built.

A row in a collection carries figures beside its own columns, such as a count of its children, its parent's name, a label or its readiness.

Each figure can be read with one statement per row, or with a grouped join over the whole collection in a number of statements that does not change with its size.

The frontend keeps a fetched collection whole in its cache and reads from it: a selection, such as New practice's Selected section, is resolved against the full list, and a picker caps what it shows on the client.

Readiness is computed on read for every card, deck and subject shown (ADR 083), so every list of them carries a figure per row.

Some reads compose a payload for a page rather than list one table; the breakdown returns every card of a practice, with its fields, readiness and attempts, in one payload (ADR 084).

`get_practice_run_breakdown` in `app/services/practice_run.py` calls `db_read_card` in `app/database_ops/card.py` once per card, two statements each with the values' `selectinload`, and `db_read_field_defs` in `app/database_ops/field_def.py` twice per deck; its other reads are fixed in number.

`tests/conftest.py` and `tests/api_tests/test_decks.py` count statements with a `before_cursor_execute` listener.

ADR 082 held list reads to a fixed number of statements and named no other read.

## Decision

We will have every read that returns a collection, a list read or a composed payload alike, return the whole collection in one response, and derive any per-row figure in a number of statements fixed regardless of row count, never one per row. We will paginate no endpoint.

## Alternatives considered

### Pagination

Rejected because every collection is one user's own and the frontend assumes whole lists, so a page would silently drop rows the frontend resolves a selection against or shows in a picker.

### Per-row queries

Rejected because the statement count grows with the collection while the figures stay correct, so no test or error catches the growth; the only sign is a read that gets slower as the user adds to it.

### A separate rule for composed reads

Rejected because it would repeat this reasoning, and leave the next composed read to work out which record applies.

### Fixing the breakdown alone

Rejected because the next composed read would have no record telling it to do the same.

## Consequences

**Positive**

- The developer adds a per-row figure as a grouped join and pins it with a statement-count test.
- The developer writing a composed read finds the rule already stated for it.
- The server answers every read that returns a collection in the same number of statements, whatever its size.
- The developer of a frontend consumer treats a collection in a response as complete.

**Negative**

- The server returns a user's whole collection on every such read, whatever its size.
- The developer rewrites the breakdown's per-card reads once.

**Neutral**

- The user with a large library waits on one response rather than paging through it.
