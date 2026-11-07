# ADR 082: Whole collections in one read, per-row figures in bounded statements

## Status

Superseded by ADR 091

## Context

Every row the API returns belongs to the user the request authenticates (ADR 007), so a list read returns one person's own collection, sized by what that person built.

A list row carries figures beside its own columns: a count of its children, its parent's name, a label. Each can be read with one statement per row, or with a grouped join over the whole list in a number of statements that does not change with the list's size.

The frontend keeps a fetched list whole in its cache and reads from it: a selection is resolved against the full list, and a picker caps what it shows on the client.

## Decision

We will have every list read return its whole collection in one response, and derive any per-row figure, a count, a parent's name, a label, in a number of statements fixed regardless of row count, never one per row. No endpoint paginates.

## Alternatives considered

### Pagination

Rejected because every collection is one user's own and the frontend assumes whole lists, so a page would silently drop a configuration from New practice's Selected section or a deck from a picker.

### Per-row queries

Rejected because the statement count grows with the collection while the figures stay correct, so no test or error catches the growth; the only sign is a list that gets slower as the user adds to it.

## Consequences

**Positive**

- The developer adds a per-row figure as a grouped join and pins it with a statement-count test.
- The developer of a frontend consumer treats a list response as complete.

**Negative**

- The server returns a user's whole collection on every list read, whatever its size.

**Neutral**

- The user with a large library waits on one response rather than paging through it.
