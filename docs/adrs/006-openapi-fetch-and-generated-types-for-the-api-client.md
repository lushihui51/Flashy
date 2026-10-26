# ADR 006: openapi-fetch and generated types for the API client

## Status

Active

## Context

Data needs to be transferred from frontend to backend, and vice versa. In the backend, FastAPI api end points are setup for frontend to access. FastAPI api-endpoints are typed with SQLModel, which is a combination of a SQLAlchemy model and a Pydantic Model. In the frontend, type checks need to match with backend, and any changes to the backend schemas means updating the frontend as well, otherwise mismatch will only surface at runtime.

FastAPI has built-in tools to generate an openapi schema from its api-endpoints (see ADR 002).

Considered alternatives are: axios with manually maintained types, codegen like openapi-generator.

An earlier `displayError` helper in `client.ts` formatted every failure and `console.error`'d it as a forced side effect, a presentation concern in the data layer: every caller got a console dump whether or not it wanted one, and it assumed a UI to display into, which a background refetch does not have.

## Decision

We will generate an OpenAPI schema with FastAPI's built-in tool, translate it into TypeScript types with `openapi-typescript`, and make every frontend call to a backend endpoint through `openapi-fetch` with those types. Scripts in `package.json` regenerate the types after any backend change.

Every call site in `src/api/*.ts` normalizes the `{ data, error }` result `openapi-fetch` returns through `unwrap` or `unwrapVoid` in `src/api/unwrap.ts`, which throw on failure and otherwise return the data, and which never display or log. What a thrown error looks like is the UI's to decide.

## Alternatives considered

### axios with manually maintained types

Rejected because it preserves the silent-drift problem the decision exists to solve.

### A codegen such as openapi-generator

Openapi-generator will not only generate the types, but also an entire runtime client. This code will ship and execute in the app, but cannot be edited in place since regeneration will overwrite changes. Openapi-typescript generates compile-time types only, so all executable code is ours.

## Consequences

**Positive**

- The developer gets a compile error at every affected call site after `npm run gen:api` when a backend shape changes, instead of a user hitting `undefined` at runtime.

**Negative**

- The developer runs `npm run gen:api` by hand after every backend change, and the types drift silently until they do; a CI step failing on a diff can mitigate it later.
- The project carries two extra npm packages, both lightweight.

**Neutral**
