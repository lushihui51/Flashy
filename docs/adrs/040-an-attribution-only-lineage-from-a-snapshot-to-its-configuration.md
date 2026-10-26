# ADR 040: An attribution-only lineage from a snapshot to its configuration

## Status

Active

## Context

ADR 013 gave `practice_deck` no `source_config_id` so that "editing or deleting the source config must never affect a session." That reasoning conflated two kinds of pointing: _behavioral_ coupling (generation reading the live config — rightly banned) and _attribution_ (knowing which config a run came from). The user's mental model — a config is a persistent practice you run many times, accumulating progress — needs attribution: "how much have I gained from this config" is unanswerable without it. FSRS-style internally-generated sessions also need snapshots with no user config at all, which a nullable column accommodates for free.

## Decision

We will give `practice_deck` a nullable `source_config_id`, set null when the configuration is deleted, written at run start, copied through rerun, and never read by generation, validation, or rerun. The link means "cut from this configuration as currently defined": a material edit to a configuration, any change to its six prompt, answer, or pool arrays, nulls the link on every snapshot pointing at it, in the same transaction as the update. A rename alone keeps the links. Internally generated snapshots leave it null.

## Alternatives considered

### Full structural remodel (runs as single-config children)

Rejected — multi-deck runs are load-bearing (field ids are deck-scoped, so a future FSRS session must span several snapshots), and the migration cost is out of proportion.

### No lineage

Rejected — runs created before the column exists can never be attributed retroactively; deferring makes the statistics cycle's data permanently worse.

### Config versioning

Rejected — heavy machinery to preserve links across edits that the sever rule makes unnecessary.

### Per-run user choice when a config changes

Rejected — heavy UX for an attribution no surface displays yet; may be revisited in the statistics cycle.

## Consequences

**Positive**

- The developer building statistics can group runs per configuration and compute progress without touching generation semantics.

**Negative**

- The user who edits a configuration and reverts the edit still loses its links permanently, and snapshots from before the column have no lineage at all.

**Neutral**
