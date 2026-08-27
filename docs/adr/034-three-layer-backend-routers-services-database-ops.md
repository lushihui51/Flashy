# ADR 034: Backend layering — routers, services, database_ops

## Status

Accepted

## Context

The rewritten backend settled into three layers: `app/routers/api/` (FastAPI handlers — HTTP concerns: status codes, `HTTPException`, dependency-injected auth/session), `app/services/` (multi-step domain flows — deck create/batch-edit, practice session start, mastery, copy, activity bubbling), and `app/database_ops/` (one module per table, every function `db_*`-prefixed, ownership enforced inside the query by taking `user_id` — task 001 invariant 7). Six later ADRs (010, 011, 012, 026, 031, 032) cite these layers as established fact, but no record ever adopted the layout itself, and one deliberate nuance is written down nowhere: routers call `database_ops` directly for simple reads and single-row writes — services are not mandatory pass-throughs.

## Decision

Three layers with one-way dependencies: routers may call services and `database_ops`; services may call `database_ops`; `database_ops` calls nothing above it and contains all SQL. A service exists only where a flow spans multiple operations or owns non-trivial domain logic; a handler that is one query plus HTTP shaping calls the `db_*` function directly. `database_ops` stays one module per table with `db_*` naming, and every user-data read keeps ownership in the query, never filtered in Python afterward.

### Alternative considered: mandatory service layer (routers never touch database_ops)

Rejected: it manufactures one-line pass-through functions for every simple read, adding indirection with no seam worth testing; the codebase consistently chose directness where there is no orchestration.

### Alternative considered: repository classes / ORM-centric active-record style

Rejected: module-level functions with explicit `db` and `user_id` parameters keep ownership scoping visible at every call site and match how the strategy/mastery split (ADR 012) already passes dependencies.

## Consequences

Benefits:

- SQL is findable (one module per table), handlers stay thin, and the "where does this belong" question has a rule: orchestration → service, single operation → direct `db_*` call.

Costs:

- The service/direct-call boundary is judgment, not mechanics; review has to hold the line when a handler starts accumulating steps.
- 57 `db_*` functions and counting — the per-table modules grow monotonically.
