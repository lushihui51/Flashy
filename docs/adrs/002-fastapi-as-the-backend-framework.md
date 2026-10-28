# ADR 002: FastAPI as the backend framework

## Status

Active

## Context

Flashy needs a backend to host core business logic and to receive and respond to requests from the frontend. As a solo project, development speed is the scarcest resource.

At the time of the decision, both Python and Node/Express were viable options based on prior experience. FastAPI was chosen without a rigorous comparison. This ADR records the decision and evaluates it retrospectively, now that its consequences are observable.

## Decision

We will use FastAPI for the backend, with endpoints typed via Pydantic models and an OpenAPI schema generated automatically from the endpoint definitions.

## Alternatives considered

### Express

Known from prior experience, and it would have unified the project on TypeScript. The choice was made without a rigorous comparison; in retrospect, the OpenAPI schema that became the typed API client would have needed a separate tool or manual maintenance.

### Django

Rejected: batteries included, but its bundled ORM, auth, and templating duplicate or conflict with SQLModel, Clerk, and a React SPA.

### Flask

Rejected: minimal, but request validation, serialization, and an OpenAPI schema would all be hand-assembled.

## Consequences

**Positive**

- The frontend developer got the typed API client from FastAPI's OpenAPI schema; with Express or Flask the schema would have needed a separate tool or manual maintenance.
- The backend developer defines request validation and database models once, because FastAPI and SQLModel share Pydantic's type system.

**Negative**

- The developer cannot share type definitions between backend and frontend, since they are in different languages; the generated-types pipeline exists partly to pay this cost.
- The developer assembles more infrastructure from parts, FastAPI being younger than Django or Express; the Alembic and SQLModel integration in particular needed manual setup Django would have given for free.

**Neutral**
