# ADR 042: An append-only mastery_log replaces card_field_mastery

## Status

Accepted

## Context

Session deltas ("what did this run do to my mastery?") need a _before_ and an _after_ per (card, field). Replaying `review_log` per view costs O(lifetime history) on every breakdown, forever. A run-start snapshot table fixes the cost but stores a second state-shaped copy alongside `card_field_mastery` and can never backfill runs that predate it. The observation that dissolves the dilemma: mastery only ever changes through the review write path, so recording each change _as it happens_ gives current state and history in one structure — `review_log` records what the user did; this table records what that did to mastery.

## Decision

One append-only `mastery_log` table replaces `card_field_mastery`: one row per (card, field) state change carrying the full post-blend `FieldMasteryState`, a BIGINT identity id as the ledger's total order, `reviewed_at` as display data, and a nullable `practice_run_id` (ON DELETE SET NULL) for attribution. Rows are appended inside the same transaction as their `review_log` group, practice_card status flip, and any requeue row; `record_review_group`'s RETRY guard suppresses duplicate appends. Current mastery is the latest row per (card, field); run deltas are read by attribution with per-field bounds — never a history replay. Read-modify-append is serialized by a per-card advisory lock, replacing the old row lock. `rebuild_mastery` truncates and regenerates the whole ledger from `review_log` atomically — which also backfills attribution and deltas for every pre-existing run.

ADR 011 stands intact: `review_log` remains the sole source of truth, and the ledger is a stored but fully rebuildable projection of it — the same standing `card_field_mastery` had, now with history.

## Alternatives considered

### Full-history replay per view

Rejected — unboundedly growing read cost on every breakdown.

### A practice_session_id column on review_log

Rejected — attribution already exists via `review_group_id == practice_card.id`, and a tag on rows cannot produce a baseline _state_.

### A run-start mastery snapshot table

Rejected — redundant state-kind storage next to `card_field_mastery`, and structurally unable to backfill pre-existing runs.

### CASCADE on the run FK

Rejected — deleting a run would rewind current mastery; SET NULL loses only that run's attribution.

### Keep card_field_mastery as a current-state cache alongside

Deferred, not adopted — latest-row-per-pair queries are cheap at this scale; a cache table can be re-added later as pure optimization without touching the source of truth.

## Consequences

Benefits:

- One table serves current mastery, run deltas, and the future statistics time series; deltas exist retroactively after one rebuild.

Costs:

- Every mastery read becomes a latest-row query (indexed, but no longer a bare row fetch); the table grows without bound (append-only by design).
- A deleted card's ledger rows cascade away with it (the raw ratings survive in `review_log`); a rebuild loses attribution for deleted cards, which no breakdown can display anyway.
