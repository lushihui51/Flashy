# ADR 015: Deck deletion cascades owned rows, preserves history via SET NULL

## Status

Accepted

## Context

`DELETE /api/decks/{id}` had no defined behavior for a deck with any content: `card`
and `field_def` had no `ondelete` on their `deck_id` foreign key, so deleting a deck
that had ever had a card or a field 500'd with a raw `ForeignKeyViolation` instead of
a clean error. The obvious fix — cascade everything reachable from the deck — is
wrong by itself: `review_log` is the append-only mastery source of truth (ADR 011),
and cascading its `card_id`/`field_def_id` foreign keys would silently erase review
history the moment a user deleted a deck. The same problem applies to `practice_deck`,
an immutable snapshot of a session's practice config (ADR 013) — a completed session
that used a deck the user later deletes is still a real historical fact, not something
that should vanish with the deck.

So a deck-delete cascade needs two different answers depending on what a row *is*:
state that only exists because the deck exists, versus a historical record of
something that happened, which must outlive the thing it was about.

## Decision

**Owned state cascades.** A row with no coherent meaning independent of its parent is
deleted along with it, via `ON DELETE CASCADE`:

- `field_def.deck_id`, `card.deck_id`, `deck_practice_config.deck_id` — cascade with
  the deck. None of these have any use once the deck is gone.
- `practice_card.card_id` — cascades with the card (and therefore transitively with
  the deck). **A practice_card without a card is meaningless, so it can't exist** —
  its `prompts`/`answers` arrays and `status` only make sense as "this card, in this
  session, at this position." This is `NOT NULL`, not nullable — the type system
  enforces the invariant rather than a comment or a runtime guard.
- `card_field_value.{card_id,field_def_id}` and `card_field_mastery.{card_id,field_def_id}`
  already cascaded with their card/field_def before this change (disposable content
  and a disposable cache, respectively — ADR 011/012).

**Historical rows are never deleted; their references SET NULL instead.**

- `review_log` rows are never deleted, ever (ADR 011, unchanged and reaffirmed here).
  Every one of its foreign keys — `card_id`, `practice_card_id`, `field_def_id` — is
  nullable with `ON DELETE SET NULL`. A row whose references have gone null is
  orphaned history: still on record, excluded from anywhere that needs a live
  `(card, field)` — `rebuild_mastery`'s replay query filters `WHERE card_id IS NOT
  NULL AND field_def_id IS NOT NULL`, since there's nothing to rebuild
  `card_field_mastery` for once the card it would key on no longer exists.
- `practice_deck.deck_id` is nullable with `ON DELETE SET NULL` — the snapshot itself
  (its copied `prompt_field_ids`/`pool_ids`/etc. arrays) stays intact; only the live
  back-reference to the source deck goes null.

**Session liveness on the read path.** Cascading `practice_card` means an active
session's pending cards can now be deleted out from under it. `get_current_practice_card`
(`app/services/practice_session.py`) handles this on read, not by defending every
write path: if a session is still `active` and no pending `practice_card` remains, it
transitions to `abandoned`. This deliberately doesn't distinguish "the user genuinely
finished" from "cascade-deleted cards stranded it" — both leave nothing to practice,
and inventing a signal to tell them apart would be new state-tracking this decision
doesn't need. `submit_rating` needed no equivalent guard: a pending `practice_card`
whose card was deleted no longer exists as a row at all (it cascaded away), so the
existing "practice_card not found" check already covers it.

## Alternatives considered

### RESTRICT everywhere — block deleting a deck that has any history

Rejected. Once a deck has ever been reviewed once, it would become permanently
undeletable through the normal delete flow, forcing every deletion through a
soft-delete path the plan never asked for. Too blunt for what's meant to be an
ordinary operation.

### SET NULL on practice_card.card_id too (the first version of this decision)

Rejected on review. A `practice_card` row's fields (`prompts`, `answers`, `status`,
`position`) are only meaningful in terms of a specific card; a "null-card"
practice_card isn't degraded history, it's nonsense — there's nothing left to display
or rate. Defending every downstream read (`submit_rating`, `_requeue_failed_card`,
`PracticeCardRead`'s response model) against a null `card_id` added guards for a state
that shouldn't be representable in the first place. Making the column `NOT NULL` with
`CASCADE` removes the state instead of guarding against it — the type checker and the
schema enforce the invariant, not a runtime check.

## Consequences

Benefits:

- Deleting a deck is a normal, always-available operation regardless of how much it's
  been practiced — no raw 500s, no soft-delete workaround required.
- Review history (`review_log`) and completed-session history (`practice_deck`) are
  structurally protected from disappearing as a side effect of deleting unrelated
  state, matching ADR 011's "never deleted, ever."
- A practice_card whose card is gone is deleted, not a dangling nullable reference
  every reader has to check for — the invariant is enforced once, at the schema.

Costs:

- `review_log` and `practice_deck` accumulate orphaned rows over time (nulled
  references) that nothing purges — acceptable, since they're append-only history by
  design, but worth knowing before writing a query against either table that assumes
  every foreign key is populated.
- A downgrade of the migration that introduced these `ondelete` rules will fail once
  any row has actually gone null in production — expected (there's no data-preserving
  way to force a null back into a `NOT NULL`/no-`ondelete` column), not a defect in
  the migration.
