# ADR 003: SQLModel as the ORM and validation layer

## Status

Active

## Context

The backend has two type-definition burdens: database rows (tables, columns, constraints) and API request/response shapes. These overlap heavily but imperfectly. For example, a flashcard's `id`, `deck_id`, `fields`, and `last_modified` all exists in a database row, however when creating a card `id` and `last_modified` should not be included. Similar discrepancies can happen with reading, updating and deleting a resource.

FastAPI needs an ORM to talk with PostgreSQL (see ADR 001 and ADR 002), and the choice of ORM determines how these two burdens are resolved.

Considered alternative is SQLAlchemy for the ORM, paired with separate Pydantic models for validation.

## Decision

We will use SQLModel, which unifies SQLAlchemy and Pydantic into a single class hierarchy: a base class holds an entity's shared fields, and its table model and API shapes inherit from it.

## Alternatives considered

### SQLAlchemy paired with Pydantic

Rejected because the two definitions have no structural relationship: the SQLAlchemy class and the Pydantic class for the same entity are kept consistent only by developer discipline, and a field renamed in one but not the other fails silently at runtime.

## Consequences

**Positive**

- The developer renames a field on the base once and it propagates to every variant, so the table and API definitions cannot drift.
- The developer declares request validation, response serialization, and database models in one vocabulary, and the OpenAPI schema is derived from the same definitions.

**Negative**

- The developer works with a younger library with a smaller ecosystem and lagging documentation, dropping to `sa_column` for complex column definitions.
- The developer keeps a read model that diverges from its table shape as an effectively standalone Pydantic model, isolated in one place.

**Neutral**

- The table class and the API shapes share one base, so a field that belongs to the API alone, or to the table alone, is declared on the variant and never on the base.
