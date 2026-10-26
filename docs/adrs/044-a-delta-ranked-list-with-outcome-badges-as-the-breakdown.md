# ADR 044: A delta-ranked list with outcome badges as the breakdown

## Status

Deprecated by the record rules' Type test

## Context

ADR 029's completion view groups cards into four outcome tabs (first try / one retry / 2+ retries / abandoned) — it answers "what happened in this run" but not the user's actual question, "what did this run do to my mastery?". With the ledger (ADR 042) making per-run deltas cheap, the outcome grouping stops earning a whole tab structure: outcomes are one attribute of a card's row, not the organizing principle.

## Decision

We will replace the four outcome tabs with a single list of all the run's cards under a sort control, gains first, drops first, or mastery. Every row shows the card's primary field, its mastery and delta, and an outcome badge carrying the old bucket meaning — the chain fold and bucket computation survive unchanged, demoted from tabs to badges. The summary counts line stays. The tap-open detail keeps the full attempt history and gains a per-field section listing _every_ active field of the card's deck with its mastery and delta — untouched fields at ±0, prompt-side drift shown honestly rather than hidden. Both call sites (run completion and the details page) share the component and change together.

## Alternatives considered

### A second "Mastery" view beside the outcome tabs

Rejected — doubles the surface and splits attention between two orderings of the same twenty rows.

### Dropping outcome grouping entirely

Rejected — the badge preserves at-a-glance outcome information at near-zero cost.

### Showing only fields the run sampled in the detail

Rejected — prompt-side mastery moves too (shown prompts absorb an aggregate score), and hiding untouched fields would misrepresent the card-level fold's domain.

## Consequences

**Positive**

- The user gets the mastery question answered directly on the completion screen, with outcome information kept as a cheaper visual element.

**Negative**

- The user who liked filtering by outcome now scans badges instead, and the developer removes the per-bucket empty states and the nonzero-default-tab logic.

**Neutral**
