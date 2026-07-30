# ADR 003: Use SQLModel for ORM and validation

## Status

Accepted

## Context

The backend has two type-definition burdens: database rows (tables, columns, constraints) and API request/response shapes. These overlap heavily but imperfectly. For example, a flashcard's `id`, `deck_id`, `fields`, and `last_modified` all exists in a database row, however when creating a card `id` and `last_modified` should not be included. Similar discrepancies can happen with reading, updating and deleting a resource.

FastAPI needs an ORM to talk with PostgreSQL (see ADR 001 and ADR 002), and the choice of ORM determines how these two burdens are resolved.

Considered alternative is SQLAlchemy for the ORM, paired with separate Pydantic models for validation.

## Decision

Use SQLModel, which unifies SQLAlchemy and Pydantic into a single class hierarchy. Each entity follows the base/table/create/read/delete pattern: a base class holds the shared fields, and the table model and API variants inherit from it.

### Alternative Considered: SQLAlchemy paired with Pydantic

Rejected because the two definitions have no structural relationship: the SQLAlchemy class and the Pydantic class for the same entity are kept consistent only by developer discipline, and a field renamed in one but not the other fails silently at runtime.

## Consequences

Benefits:

- Each entity has multiple classes (base, table, create, read, delete), but they form one inheritance family, and a field renamed on the base propogates to every variant, so drifts are structurally impossible.
- FastAPI, and SQLModel share a type system, so request validation, response serialization, and database models are declared in one vocabulary, and the OpenAPI schema (see ADR 006) is derived from the same definitions.

Costs:

- SQLModel is a younger library with a smaller ecosystem and lagging documentation. In practice, `sa_column` is sometimes required to drop back into raw SQLAlchemy syntax for complex column definitions.
- When API shapes diverge from table shapes, the read models stop inheriting cleanly and become effectively standalone Pydantic models. This is accepted because the inheritance benefits still covers the common fields, and the divergent models are isolated in one place.
