# ADR 055: `database_ops` as the sole persistence surface

## Status

Active

## Context

ADR 034 recorded the three layers as established fact and said `database_ops` "contains all SQL". The code it described already broke that clause: the batch-edit service built its own queries and two routers reached the ORM with `db.get`, no guard was written, and later work copied the pattern it found (the configuration sever, rebuild attribution). ADR 034's own Consequences called the boundary "judgment, not mechanics", which is why it drifted unnoticed past reviews that checked only import direction.

An inventory of the surface found eight statement constructions in three services, four raw `text()` statements (the per-card advisory lock and the `SET CONSTRAINTS` switch around the requeue insert), eight `db.get` calls in routers and the deletion service, the `app_user` lookup and insert in `dependencies.py` with no `database_ops` module of their own, nineteen `db.add` calls, one `begin_nested` savepoint, and one upward import: `database_ops/subject.py` importing `touch` from a service, which the import check had missed. The position taken was the repository pattern's: a service and a database operation are decoupled, `add`, `get`, and `delete` belong to the repository as much as `select` does, and only transaction control belongs to the caller.

## Decision

We will allow no code outside `app/database_ops/` to construct a statement (`select`, `update`, `delete`, `insert`, `text`) or call any `Session` method other than `commit`, `rollback`, `flush`, and `refresh`. Every read, insert, update, delete, primary-key fetch, advisory lock, constraint-mode switch, and savepoint is a `db_*` function in its table's module, or in a module of its own when the operation belongs to no table; `app_user` gets `app/database_ops/app_user.py`. Transaction ownership is as the layering left it: a service owns the transaction it composes, and a one-query handler calls a committing `db_*` function directly.

Layers depend downward only. Nothing under `app/database_ops/` imports from `app.services` or `app.routers`, and nothing under `app/services/` imports from `app.routers`. `touch()` stays the single write point of `last_activity_at` in `app/services/activity.py` and makes no session call; `db_update_subject` no longer calls it, and the subject router calls it first.

A savepoint is a persistence operation. The requeue's "insert at this position, or report the collision" is `db_try_stage_create_practice_card`, which owns the savepoint, the switch of the position constraint to IMMEDIATE, the insert, the savepoint rollback, and the switch back to DEFERRED, returning `None` on a taken position; the service retries after renumbering.

A caller reads commit behaviour off the name. A writer that does not commit is `db_stage_<verb>_<noun>`, meaning its rows are added and flushed inside the caller's open transaction and never committed; a writer without `stage_` commits; a staged operation that reports a constraint failure by returning `None` is `db_try_stage_<verb>_<noun>`. Verbs are the CRUD words where one fits, and a descriptive verb that says what CRUD cannot (`append` for a ledger, `scrub`, `clear`, `renumber`, `log`) keeps its word. Reads (`read`, `fetch`, `count`, `next`), the advisory `lock`, and a connectivity `ping` carry no prefix.

A source-scan test asserts all four rules over `app/`: no statement-builder import outside `database_ops`, no session call outside the allowlist, downward imports only, and `stage_` in a writer's name if and only if its body never commits.

## Alternatives considered

### Statements and fetches only, leaving ORM inserts in services

Rejected. `db.add` is exactly what a repository encapsulates; the guard costs the same either way; and a boundary drawn through the middle of the write path is the judgment call the layering already lost.

### A unit-of-work abstraction over the session

Rejected. Services would still hold a session-like handle and build model objects, so the only additional gain is a literal zero-line technology switch, a large refactor for a hypothetical. Every Postgres-specific piece (advisory locks, the deferrable constraint, arrays, `DISTINCT ON`, `array_remove`) already sits behind the surface this decision draws.

### Allow `begin_nested` in the allowlist

Rejected. One call site, and "try to insert at this position" is one operation that reads better as a `db_try_stage_*` function than as a savepoint a service has to get right.

### Move `touch()` into `database_ops` to fix the upward import

Rejected. It would move the single write point of `last_activity_at` out of the layer AGENTS.md records it in; the router calling `touch` before `db_update_subject` fixes the direction in two lines.

### Encode commit behaviour by verb pairs, a suffix, or a docstring sentence

Rejected. `create` versus `insert` marks one verb and leaves `delete` ambiguous, where the singular commits and the plural does not; a `_staged` suffix reads worse than the prefix; a docstring sentence is redundant once the name carries the fact and would need its own guard.

### Loosen ADR 034 to "ownership-scoped reads live in `database_ops`"

Rejected. It would ratify the drift instead of removing it and leaves nothing mechanical to guard.

## Consequences

**Positive**

- The developer finds every statement, lock, savepoint, and insert in one directory, with the engine-specific SQL entirely behind it.
- The developer gets the guard in place of the review judgment the layering relied on; the drift cannot recur silently.
- The developer reaches for `db_stage_*` in a service and the bare name in a one-query handler, and a premature commit inside a composed transaction is visible at the call site.

**Negative**

- The developer moved about twenty-two statement and fetch sites, nineteen `db.add` sites, and seventeen renames, once.
- The developer's services still take a `Session`, call the four allowed methods, and construct SQLModel objects; a persistence-technology switch would still touch their signatures.
- The developer writes more small `db_*` functions, one per operation, and the per-table modules keep growing.
- The developer keeps the requeue function's asymmetry, constraint IMMEDIATE on success and reset only on collision, now documented in `database_ops`.

**Neutral**
