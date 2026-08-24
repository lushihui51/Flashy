# ADR 009: Use field_def as the sole source of truth for fields

## Status

Accepted

## Context

Before this rewrite, a deck's structure was a free-form `deck_schema` JSONB column (`name -> type-string`, e.g. `{"front": "str", "back": "str"}`), and a card stored its content as a free-form `fields` JSONB dict keyed by the same names. There was no database constraint tying a card's keys to its deck's schema — structure was validated only at request time, by dynamically constructing a throwaway Pydantic model from the deck's `deck_schema` and validating the submitted `fields` dict against it on every create/update.

This meant a field's identity was its name string, in two independent JSON blobs. Renaming a field was indistinguishable from deleting one field and adding an unrelated one — nothing tied "front" before a rename to "front" after. There was no place to hang metadata (display order, lifecycle, a stable identity for other tables to reference) other than the blob's own keys, and validation logic was rebuilt from scratch on every request instead of being enforced as a schema constraint.

## Decision

`field_def` is the only source of truth for what a field is. Names are display-only. Every reference to a field anywhere in the schema is `field_def.id` (a uuid), never a name string.

This is backed by real constraints, not just convention:

- A typed `FieldType` enum (`text`/`image`/`audio`) backed by a `CHECK` constraint (`app/models/field_def.py:11-14,34`), replacing the old per-request `TYPES = {"str": str, ...}` dict-driven dynamic model.
- A deferred unique constraint on `(deck_id, position)` (`app/models/field_def.py:33`) so a whole-deck reorder can swap every field's position within one transaction without violating uniqueness mid-statement.
- A partial unique index on `(deck_id, name) WHERE archived_at IS NULL` (`app/models/field_def.py:26-32`) — a name is unique only among _live_ fields, which is what makes "archive a field, then create a new one with the same name" legal (tested in `tests/api_tests/test_field_defs.py:60`, `test_archive_then_recreate_same_name_succeeds`).
- Every dependent table (`card_field_value`, `review_log`, `card_field_mastery`, and all six `deck_practice_config` uuid[] arrays) references `field_def.id`, never a name — a rename never invalidates history, and a card's structure is queryable via a join instead of by re-parsing per-card JSON on every access.

## Alternatives considered

### Incrementally migrate the old `deck_schema`/`fields` blob shape

Rejected. Phase 0 of the rewrite instead did a full reset — the database had no production data yet, so the plan's guiding principle was "prefer the correct shape over the compatible one, always." Migrating the blob shape forward would have preserved its central flaw (name-as-identity) rather than fixing it.

## Consequences

Benefits:

- A field's type, position, and lifecycle are schema-enforced, not re-validated by hand-built logic on every request.
- Renaming a field is a metadata change, not an identity change — every table that references the field by id is unaffected.
- New capabilities fall out of having a real row to attach data to: ordered display, archival (see ADR 010), and stable references for mastery/review history (see ADR 011).

Costs:

- Because dependents now assume a field's type is stable, type change is forbidden after creation — `PATCH /fields/{field_id}` explicitly 400s if the payload's type differs from the existing one (`app/routers/api/field_def.py:88-89`). The old untyped blob had no such restriction; this is a deliberate rigidity trade, not an oversight.
