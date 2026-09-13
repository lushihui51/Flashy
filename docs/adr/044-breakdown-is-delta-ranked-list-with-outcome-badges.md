# ADR 044: The breakdown is a delta-ranked list with outcome badges

## Status

Accepted. Supersedes ADR 029's four-tab grouping; its outcome-chain semantics remain in force.

## Context

ADR 029's completion view groups cards into four outcome tabs (first try / one retry / 2+ retries / abandoned) — it answers "what happened in this run" but not the user's actual question, "what did this run do to my mastery?". With the ledger (ADR 042) making per-run deltas cheap, the outcome grouping stops earning a whole tab structure: outcomes are one attribute of a card's row, not the organizing principle.

## Decision

The four tabs are replaced by a single list of all the run's cards under a sort control (010 MD-1: gains first / drops first / mastery). Every row shows the card's primary field, its mastery and delta (010 MD-2), and an outcome badge carrying the old bucket meaning — the chain fold and bucket computation of ADR 029 survive unchanged, demoted from tabs to badges. The summary counts line stays. The tap-open detail keeps the full attempt history and gains a per-field section listing _every_ active field of the card's deck with its mastery and delta — untouched fields at ±0, prompt-side drift shown honestly rather than hidden. Both call sites (run completion and the details page) share the component and change together.

## Alternatives considered

### A second "Mastery" view beside the outcome tabs

Rejected — doubles the surface and splits attention between two orderings of the same twenty rows.

### Dropping outcome grouping entirely

Rejected — the badge preserves at-a-glance outcome information at near-zero cost.

### Showing only fields the run sampled in the detail

Rejected — prompt-side mastery moves too (shown prompts absorb an aggregate score), and hiding untouched fields would misrepresent the card-level fold's domain (ADR 043).

## Consequences

Benefits:

- The completion screen answers the mastery question directly; outcome information survives as a cheaper visual element.

Costs:

- Per-bucket empty states and the nonzero-default-tab logic disappear with the tabs; a user who liked filtering by outcome now scans badges instead.
