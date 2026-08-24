# ADR 006: Use openapi-fetch for typed API client

## Status

Accepted

## Context

Data needs to be transferred from frontend to backend, and vice versa. In the backend, FastAPI api end points are setup for frontend to access. FastAPI api-endpoints are typed with SQLModel, which is a combination of a SQLAlchemy model and a Pydantic Model. In the frontend, type checks need to match with backend, and any changes to the backend schemas means updating the frontend as well, otherwise mismatch will only surface at runtime.

FastAPI has built-in tools to generate an openapi schema from its api-endpoints (see ADR 002).

Considered alternatives are: axios with manually maintained types, codegen like openapi-generator.

## Decision

Use fastapi's built-in tool to generate an openapi schema for the backend, and use openapi-typescript to translate it into typescript types, and finally have all frontend calls to backend endpoints use the types generated through openapi-typescript, through openapi-fetch.

In addition, scripts are constructed in package.json to be run after any updates to the backend, which will automate re-generating typescript types.

### Alternative considered: axios with manually maintained types

Rejected because it preserves the silent-drift problem the decision exists to solve.

### Alternative considered: codegen like openapi-generator

Openapi-generator will not only generate the types, but also an entire runtime client. This code will ship and execute in the app, but cannot be edited in place since regeneration will overwrite changes. Openapi-typescript generates compile-time types only, so all executable code is ours.

### Error normalization

Each `src/api/*.ts` call site normalizes the `{ data, error }` shape
openapi-fetch returns via `unwrap`/`unwrapVoid` (`src/api/unwrap.ts`): `unwrap`
throws a formatted `Error` if `error` is set, otherwise returns `data`;
`unwrapVoid` does the same with no return value, for `DELETE` endpoints with no
body. An earlier `displayError` helper lived in `client.ts` and did this
formatting *and* `console.error`'d as a forced side effect — a presentation
concern that didn't belong in the data layer (every caller got a console dump
whether or not it wanted one, and it assumed a UI to display into that isn't
universal — e.g. a background refetch). `unwrap`/`unwrapVoid` keep only the
formatting; display is left to the UI edge (TanStack Query's `onError`, a
`QueryCache`/`MutationCache` global handler, or an error boundary — not yet
wired up).

## Consequences

Benefits:

- Strict type checking is enforced, compilation will stop if there is a type mismatch. For example, when a column name is changed from deck_id to deckId, instead of letting users hit undefined at run time, we can simply run `npm run gen:api` and TypeScript will error at every affected call site at compile time.

Costs:

- `npm run gen:api` needs to be manually run after every backend change, and the types can still drift silently otherwise. This can be mitigated by adding a CI step to run `npm run gen:api`, failing on diff, later.
- 2 extra npm packages bundled to the project, however they are ultra lightweight.
