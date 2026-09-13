# ADR 039: Rerun keeps the original run

## Status

Accepted. Supersedes the delete-the-original half of ADR 030.

## Context

ADR 030 defined rerun's _source_ (the run's own frozen snapshots) and its _ordering_ (create before delete) — but never actually weighed keeping the old session, which was inherited from framing rerun as "replace". With the mastery ledger (ADR 042), runs become carriers of history: their breakdowns, deltas, and attribution rows are the user's mastery time series, and a rerun that deletes its original silently punches a hole in exactly that history. Separately, the server copied the old session's name verbatim, which only made sense while the old session ceased to exist.

## Decision

Rerun creates a new run from the completed run's frozen snapshots — all of ADR 030's source semantics, dropped-deck tolerance, and `nothing_to_rerun` refusal stand — but no longer deletes the original. The client supplies a fresh name, generated the same way the creation page pre-fills one. Runs remain user-deletable via the existing Delete action: the permanent record is `mastery_log`, whose run FK goes SET NULL, so deleting a run costs exactly that run's attribution and nothing else — a consequence the user owns.

## Alternatives considered

### Keep delete-on-rerun

Rejected — destroys breakdown and delta history for a run the user chose to repeat, the runs most likely to matter to progress tracking.

### Server-derived name for the new run

Rejected — names are client-formatted timestamps by design (ADR 019); the server derives nothing.

### Make runs undeletable / archive-only

Rejected for now — with SET NULL protecting mastery integrity, retention is pure UX; revisit in the statistics cycle if history holes prove annoying.

## Consequences

Benefits:

- Rerun becomes non-destructive; the transaction simplifies to a plain create.

Costs:

- The run list grows with every rerun; the old and new runs coexist and are distinguished by their names.
