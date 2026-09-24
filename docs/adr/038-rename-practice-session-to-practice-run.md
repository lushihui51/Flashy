# ADR 038: Rename practice_session to practice_run

## Status

Accepted. Renames ADR 031's `GET .../run` to `GET .../state`. Frontend identifiers (`practiceSessionId` route params, `session` props) were left by task 009's rename map; user-facing copy says "practice" since the 2026-09-23 vocabulary sweep.

## Context

The rewrite saga ended with 006; the app's concepts are now stable enough to name properly. What the schema called `practice_session` is one ephemeral _enactment_ — you start it, rate through it, it completes. The durable, re-runnable thing a user builds and returns to is the `deck_practice_config`: the template. The UI already leaked the better word (`PracticeRunPage`, the `/run` endpoint) while the schema said "session", and the app is pre-users — the rename will never be cheaper.

## Decision

Rename `practice_session` to `practice_run` across schema and code in one mechanical migration and sweep: table, FK columns, constraint/index names, Python modules and classes, API routes, and frontend modules, per the rename map in task file 009. `deck_practice_config` keeps its name. Status enum values (`active`/`completed`) and user-facing copy are unchanged. The run-state endpoint moves to `/{id}/state` and the `session_active` error codes become `run_active` (009 MD-1).

## Alternatives considered

### User-facing vocabulary only

Rejected — users never saw schema terms anyway (ADR 021); the mismatch being fixed is the developer-facing one.

### Reuse "practice_session" as the new name for configs

Rejected — maximally confusing; one term would mean opposite things across time.

### Leave both names as-is

Rejected — every future cycle (ledger attribution, statistics) builds on the run-vs-template split; encoding it now prevents compounding confusion.

## Consequences

Benefits:

- Code and concept align before the ledger cycle builds attribution on top of runs.

Costs:

- ADRs and task files 001–008 keep the old term as history; readers map session → run. AGENTS.md is reconciled by /distill, not retroactive edits.
