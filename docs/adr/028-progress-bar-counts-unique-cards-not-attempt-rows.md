# ADR 028: Live progress counts unique cards, not attempt rows

## Status

Accepted

## Context

A failed `practice_card` is never mutated — `_requeue_failed_card` (`app/services/practice_session.py`) inserts a new row sharing the same `card_id`. A session's total `practice_card` row count therefore grows over the course of play; it is not fixed at session start. A live progress indicator needs a stable total to size its segments against.

## Decision

The run page's progress indicator is one proportional bar with four color segments — grey (pending, first attempt) · yellow (pending, retry) · green (passed) · red (failed, terminal) — sized by `count / total`. `total` is the number of distinct `card_id`s that received a `practice_card` row at session start, fixed for the session's lifetime, never the live `practice_card` row count. Each card's segment membership comes from folding its chain of same-`card_id` rows (ordered by `created_at`) down to a bucket from the last row — the same chain/bucket rule the completion breakdown uses (ADR 029), pinned once in `docs/tasks/006-practice-run.md`'s Contracts.

## Alternatives considered

### Segment sizes from raw practice_card row count, recomputed after each rating

Rejected — a failure both paints a segment red and inserts a new pending row in the same action, growing the denominator at that exact moment; every other segment's share shrinks right when the user just failed a card, reading as the bar moving backward.

### One dot per practice_card row, quiz-style

Rejected — same root cause: the row count isn't fixed at session start, so a dot strip has no principled place for a new row, and a "failed" dot never turns green (a different row does), reading as a dead end rather than progress.

## Consequences

Benefits:

- The bar's total never changes mid-session, so a segment only ever grows toward green, never regresses from a requeue.
- The same fixed-total, unique-card model backs the completion breakdown's summary counts, so the two can't disagree about what "total" means.

Costs:

- The bar doesn't distinguish a card retried five times from one still pending its first attempt until it resolves — attempt count isn't visible live, only in the completion breakdown.
