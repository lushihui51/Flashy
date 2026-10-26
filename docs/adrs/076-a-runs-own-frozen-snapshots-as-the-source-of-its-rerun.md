# ADR 076: A run's own frozen snapshots as the source of its rerun

## Status

Active

## Context

A snapshot carries the configuration's arrays and a link back to the configuration that exists for attribution only and that any material edit severs (ADR 040), so a completed run cannot count on reaching its configuration. A snapshot's arrays can also go stale against the deck's live fields without the deck being deleted.

A snapshot goes with its deck, and a run left with no snapshots is deleted with its last deck (ADR 048), so every run that still exists has at least one snapshot with a live deck. A rerun keeps the original run and takes a fresh name from the client (ADR 039). A rerun that would generate no card is refused (ADR 056).

## Decision

We will build a rerun from the completed run's own frozen `practice_deck` rows, never from a configuration lookup. A snapshot whose arrays no longer validate against its deck's live fields is dropped from the new run; the rest are copied, attribution link and stored name included, and generated normally. If no snapshot survives, rerun refuses with `nothing_to_rerun` rather than creating an empty run.

## Alternatives considered

### The live configuration, reached through the attribution link

Rejected: it reopens the coupling the snapshot exists to avoid, and the link is gone after any material edit.

### Refusal of the whole rerun if any snapshot is stale

Rejected: one stale deck would block an otherwise healthy multi-deck run.

## Consequences

**Positive**

- The user gets a fresh attempt even if a deck involved has since changed, as long as something survives.
- The developer adds no lineage read to generation.

**Negative**

- The user gets "the same practice" only as far as the frozen snapshot allows; when everything has gone stale, rerun refuses, with no way to recover the configuration-level intent.

**Neutral**
