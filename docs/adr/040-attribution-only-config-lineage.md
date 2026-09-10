# ADR 040: Snapshots carry attribution-only config lineage, severed on material edit

## Status

Accepted. Amends ADR 013: attribution is now distinguished from behavioral coupling.

## Context

ADR 013 gave `practice_deck` no `source_config_id` so that "editing or deleting the source config must never affect a session." That reasoning conflated two kinds of pointing: _behavioral_ coupling (generation reading the live config — rightly banned) and _attribution_ (knowing which config a run came from). The user's mental model — a config is a persistent practice you run many times, accumulating progress — needs attribution: "how much have I gained from this config" is unanswerable without it. FSRS-style internally-generated sessions also need snapshots with no user config at all, which a nullable column accommodates for free.

## Decision

`practice_deck` gains nullable `source_config_id` (FK `deck_practice_config`, ON DELETE SET NULL), written at run start, copied through rerun, and never read by generation, validation, or rerun logic — ADR 013's behavioral isolation is untouched. The link means "cut from this config as currently defined": a material edit to a config — any change to its six prompt/answer field or pool arrays — nulls `source_config_id` on every snapshot pointing at it, in the same transaction as the update. A rename alone keeps the links. Internally-generated snapshots leave it null.

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

Benefits:

- Per-config grouping and progress statistics become possible without touching generation semantics.

Costs:

- Lineage is conservative: editing a config and reverting the edit still severs its links permanently, and pre-existing snapshots have no lineage at all.
