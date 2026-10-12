# ADR 002: Use FastAPI for backend

## Status

Accepted

## Context

Flashy needs a backend to host core business logic and to receive and respond to requests from the frontend. As a solo project, development speed is the scarcest resource.

At the time of the decision, both Python and Node/Express were viable options based on prior experience. FastAPI was chosen without a rigorous comparison. This ADR records the decision and evaluates it retrospectively, now that its consequences are observable.

Alternatives that were available: Express (known from prior experience, and would have unified the project on TypeScript), Django (batteries included, but its bundled ORM, auth, and templating duplicate or conflict with SQLModel, Clerk, and a React SPA, see ADR 003 and ADR 007), and Flask (minimal, but request validation, serialization, and an OpenAPI schema would all be hand-assembled).

## Decision

Use FastAPI for the backend, with endpoints typed via Pydantic models and an OpenAPI schema generated automatically from the endpoint definitions.

## Consequences

In retrospect, the choice has been validated by two consequences that were not part of the original reasoning:

- FastAPI's automatic OpenAPI schema generation became the enabling condition for the typed API client pipeline (see ADR 006). With Express or Flask, the schema would have required a separate tool or manual maintenance.
- FastAPI's Pydantic-native design meant SQLModel (see ADR 003) integrates directly: the framework and the ORM share a type system, so request validation and database models are defined once.

Costs accepted:

- The backend and frontend are in different languages, so type definitions cannot be shared directly between them. This cost is largely neutralized by the generated-types pipeline in ADR 006, but that pipeline exists partly because this cost had to be paid.
- FastAPI is a younger framework with a smaller ecosystem than Django or Express, so more infrastructure is assembled from parts. The Alembic and SQLModel integration in particular required manual setup that a Django project would have gotten for free.
- Choosing a framework without an explicit comparison was a process risk. It happened to land well here, but the outcome does not retroactively make the process sound. Later decisions in this log (ADR 006, ADR 008) were made with explicit alternatives for this reason.
