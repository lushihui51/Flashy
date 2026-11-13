# ADR 039: The original run kept on rerun

## Status

Superseded by ADR 112, ADR 114 and ADR 118

## Context

ADR 030 defined rerun's _source_ (the run's own frozen snapshots) and its _ordering_ (create before delete) — but never actually weighed keeping the old session, which was inherited from framing rerun as "replace". With the mastery ledger (ADR 042), runs become carriers of history: their breakdowns, deltas, and attribution rows are the user's mastery time series, and a rerun that deletes its original silently punches a hole in exactly that history. Separately, the server copied the old session's name verbatim, which only made sense while the old session ceased to exist.

## Decision

We will have rerun create a new run from the completed run's frozen snapshots and leave the original in place. The client supplies a fresh name, generated the same way the creation page pre-fills one. Runs stay user-deletable through the existing Delete action; the permanent record is the mastery ledger, whose run reference goes null, so deleting a run costs exactly that run's attribution and nothing else, a consequence the user owns.

## Alternatives considered

### Keep delete-on-rerun

Rejected — destroys breakdown and delta history for a run the user chose to repeat, the runs most likely to matter to progress tracking.

### Server-derived name for the new run

Rejected — names are client-formatted timestamps by design; the server derives nothing.

### Make runs undeletable / archive-only

Rejected for now — with SET NULL protecting mastery integrity, retention is pure UX; revisit in the statistics cycle if history holes prove annoying.

## Consequences

**Positive**

- The user keeps the breakdown and delta history of a run they repeat, and the developer's rerun transaction simplifies to a plain create.

**Negative**

- The user's run list grows with every rerun; the old and new runs coexist, distinguished by their names.

**Neutral**
