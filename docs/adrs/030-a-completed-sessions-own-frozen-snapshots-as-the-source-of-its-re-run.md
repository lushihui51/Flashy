# ADR 030: A completed session's own frozen snapshots as the source of its re-run

## Status

Superseded by ADR 039 and ADR 076

## Context

`practice_deck` deliberately has no `source_config_id` (ADR 013): "editing or deleting the source config must never affect a session, so nothing here points back to it." A completed session therefore cannot look up the `deck_practice_config` it came from — that link doesn't exist by design. `practice_deck.deck_id` goes null if its source deck is later deleted (ADR 015), and its frozen field/pool arrays can also go stale relative to the deck's _live_ fields without the deck being deleted at all (a referenced field archived after the session started) — the same staleness ADR 013 already accepted as legitimate.

## Decision

We will have re-running a completed session build a new session from that session's own frozen `practice_deck` rows, not from a config lookup. Per `practice_deck` row: if `deck_id` is null, or its arrays no longer validate against the deck's current live fields, that deck is dropped from the new session; the rest are snapshotted and generated normally. If zero decks survive, re-run refuses (`nothing_to_rerun`) rather than creating an empty session, consistent with the existing no-zero-card invariant. The new session is created first, using the old session's `name` verbatim, and the old session is deleted only after, inside one transaction.

## Alternatives considered

### Add source_config_id to practice_deck after all, so re-run can refetch the live config

Rejected — reopens exactly the coupling ADR 013 avoided; a re-run's behavior would depend on config state at a time other than when the original session was built.

### Refuse the whole re-run if any deck is deleted or stale

Rejected — a single archived field would block re-running an otherwise healthy multi-deck session; dropping the affected deck matches how the app already communicates partial loss elsewhere (the "deleted deck" chip, ADR 015's amendment).

### Delete the old session before creating the new one

Rejected — a failure partway through creation would leave the user with no session at all instead of the one they started with.

## Consequences

**Positive**

- No new lineage column, no reopening of ADR 013's isolation guarantee.
- A user gets a fresh attempt even if a deck involved has since changed, as long as something survives.

**Negative**

- "The same practice" is only as same as the frozen snapshot allows; if everything involved has since gone stale or been deleted, re-run simply refuses, with no way to recover the original config-level intent, since it was never retrievable to begin with.

**Neutral**
