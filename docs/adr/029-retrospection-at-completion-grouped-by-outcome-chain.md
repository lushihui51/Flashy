# ADR 029: Retrospection lives only at session completion, grouped by outcome chain

## Status

Accepted. Does not amend or supersede ADR 015 — see the note under Decision.

## Context

`submit_rating` (`app/services/practice_session.py`) is a one-shot write; there is no endpoint to edit or undo a rating. A failed card's retry is a new `practice_card` row sharing the original `card_id`, never a mutation of the failed row. Over a session, one `card_id` accumulates a chain of such rows. `PracticeDetailsPage` currently stubs a completed session's body with "A summary of this practice is coming later." Separately, ADR 013's Consequences already accepted that a snapshot can go stale mid-session — a requeue can find nothing to generate from and return nothing to requeue with — as "a legitimate, handled degraded case," without ever giving that case a name or surfacing it.

## Decision

No mid-run navigation to a previously-rated card — only the current card is ever shown while a session is active. A session's cards group by `card_id` into chains (rows ordered by `created_at`); a chain's bucket is read off its last row: passed chains split by length into first-try / after-one-fail / after-many-fails, and a chain whose last row is `failed` with no successor (the stale-snapshot case ADR 013 already accepted) becomes its own bucket, displayed to the user as "Abandoned." A completed session's retrospective view is one screen: a summary count line, four tabs matching the buckets, one row per card (its determining/last attempt), and a row tap opening the full detail — labeled fields, per-answer ratings, and every attempt in the chain. This one view renders in two places: the run page transitions to it in place once nothing is pending, and `PracticeDetailsPage` embeds it for any completed session, replacing its stub.

**Note on "Abandoned":** ADR 015 (amended) dropped a session-level `abandoned` `SessionStatus` because nothing could set it reliably. This decision does not revive it — "Abandoned" here is display-only wording for a per-_card_, per-_session_ outcome bucket with a well-defined trigger (a requeue found nothing left to generate from), unrelated in mechanism to the session status ADR 015 removed.

## Alternatives considered

### An in-run browseable history of already-rated cards

Rejected — ratings can't be edited, so a past card would be view-only, and the requeue mechanism already guarantees a failed card resurfaces later in the same session; the added live-view scope buys nothing a completion-time review doesn't already cover.

### A separate transient "run complete" screen, distinct from what the detail page shows later

Rejected — the underlying data doesn't change after completion, so a "just now" view has no reason to differ from a "days later" view, and keeping them separate risks the two drifting apart.

### One row per attempt rather than one row per card

Rejected — a card needing several retries would occupy several rows in the list meant to summarize it; the full sequence is one tap away in the detail view instead.

## Consequences

Benefits:

- A complete, honest outcome breakdown with no added complexity during the run itself.
- The breakdown is a durable view, not a one-time artifact.
- The stale-snapshot case — previously invisible — is now named, counted, and visible.

Costs:

- Grouping by `card_id` requires a chain fold (`docs/tasks/006-practice-run.md` T3) that must agree with the live progress bar's identical rule (ADR 028), or the two views could disagree about a card's state.
