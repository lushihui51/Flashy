# ADR 034: Backend layering — routers, services, database_ops

## Status

Active

## Context

The rewritten backend settled into three layers: `app/routers/api/` (FastAPI handlers — HTTP concerns: status codes, `HTTPException`, dependency-injected auth/session), `app/services/` (multi-step domain flows — deck create/batch-edit, practice session start, mastery, copy, activity bubbling), and `app/database_ops/` (one module per table, every function `db_*`-prefixed, ownership enforced inside the query by taking `user_id`). Six later ADRs (010, 011, 012, 026, 031, 032) cite these layers as established fact, but no record ever adopted the layout itself, and one deliberate nuance is written down nowhere: routers call `database_ops` directly for simple reads and single-row writes — services are not mandatory pass-throughs.

## Decision

We will keep three layers with one-way dependencies: routers may call services and `database_ops`, services may call `database_ops`, and `database_ops` calls nothing above it and holds every statement. A service exists only where a flow spans several operations or owns non-trivial domain logic; a handler that is one query plus HTTP shaping calls the `db_*` function directly. `database_ops` stays one module per table with `db_*` naming, and every user-data read keeps ownership in the query, either by taking the user's id or by being keyed by an id the caller has already scoped, never filtered in Python afterward.

## Alternatives considered

### A mandatory service layer

Rejected: it manufactures one-line pass-through functions for every simple read, adding indirection with no seam worth testing; the codebase consistently chose directness where there is no orchestration.

### Repository classes or an active-record style

Rejected: module-level functions with explicit `db` and `user_id` parameters keep ownership scoping visible at every call site and match how the strategy/mastery split already passes dependencies.

## Consequences

**Positive**

- The developer finds SQL in one module per table, keeps handlers thin, and has a rule for "where does this belong": orchestration in a service, a single operation as a direct `db_*` call.

**Negative**

- The developer holds the service-versus-direct-call line in review, since it is judgment, not mechanics.
- The developer watches the per-table modules grow monotonically; 57 `db_*` functions at the time of writing.

**Neutral**
