# ADR 042: An append-only mastery_log in place of card_field_mastery

## Status

Active

## Context

Session deltas ("what did this run do to my mastery?") need a _before_ and an _after_ per (card, field). Replaying `review_log` per view costs O(lifetime history) on every breakdown, forever. A run-start snapshot table fixes the cost but stores a second state-shaped copy alongside `card_field_mastery` and can never backfill runs that predate it. The observation that dissolves the dilemma: mastery only ever changes through the review write path, so recording each change _as it happens_ gives current state and history in one structure — `review_log` records what the user did; this table records what that did to mastery.

## Decision

We will replace `card_field_mastery` with one append-only `mastery_log` table: one row per state change of a card-and-field pair, carrying the full post-blend state and a nullable run reference for attribution that goes null when the run is deleted. Rows are appended inside the same transaction as their review group, the practice card's status flip, and any requeue row; a resubmitted group appends nothing. Current mastery is the latest row per pair, and a run's deltas are read by attribution with per-field bounds, never by replaying history. Read-modify-append is serialized per card. `rebuild_mastery` clears and regenerates the whole ledger from `review_log` atomically, which also backfills attribution and deltas for every run that predates the ledger.

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

**Positive**

- The developer serves current mastery, run deltas, and the future statistics time series from one table, and deltas exist retroactively after one rebuild.

**Negative**

- The developer reads mastery as a latest-row query, indexed but no longer a bare row fetch, and the table grows without bound by design.
- The developer loses a deleted card's ledger rows with it, and a rebuild loses attribution for deleted cards, which no breakdown can display anyway.

**Neutral**
