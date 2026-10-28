# ADR 009: field_def as the sole source of truth for a field

## Status

Active

## Context

Before this rewrite, a deck's structure was a free-form `deck_schema` JSONB column (`name -> type-string`, e.g. `{"front": "str", "back": "str"}`), and a card stored its content as a free-form `fields` JSONB dict keyed by the same names. There was no database constraint tying a card's keys to its deck's schema — structure was validated only at request time, by dynamically constructing a throwaway Pydantic model from the deck's `deck_schema` and validating the submitted `fields` dict against it on every create/update.

This meant a field's identity was its name string, in two independent JSON blobs. Renaming a field was indistinguishable from deleting one field and adding an unrelated one — nothing tied "front" before a rename to "front" after. There was no place to hang metadata (display order, lifecycle, a stable identity for other tables to reference) other than the blob's own keys, and validation logic was rebuilt from scratch on every request instead of being enforced as a schema constraint.

## Decision

We will make `field_def` the only source of truth for what a field is. A field's name is display only, and every reference to a field anywhere in the schema is its id, never its name. The schema enforces this with constraints rather than convention: a typed field type, uniqueness of position within a deck, and uniqueness of name among a deck's live fields.

## Alternatives considered

### Incrementally migrate the old `deck_schema`/`fields` blob shape

Rejected. The rewrite instead did a full reset — the database had no production data yet, so the guiding principle was "prefer the correct shape over the compatible one, always." Migrating the blob shape forward would have preserved its central flaw (name-as-identity) rather than fixing it.

## Consequences

**Positive**

- The developer gets a field's type, position, and lifecycle enforced by the schema, not re-validated by hand-built logic on every request.
- The user renames a field as a metadata change, not an identity change; every table that references the field by id is unaffected.
- The developer gets a real row to attach data to, which is what makes ordered display, archival, and stable references for mastery and review history possible.

**Negative**

- The user cannot change a field's type after creation, since dependents assume it is stable; the field update route refuses with a 400. The old untyped blob had no such restriction; this is a deliberate rigidity trade.

**Neutral**
