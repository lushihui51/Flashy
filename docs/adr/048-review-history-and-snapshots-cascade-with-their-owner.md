# ADR 048: Review history and snapshots cascade with their owner

## Status

Accepted. Supersedes the SET NULL half of ADR 015 — `review_log` rows and `practice_deck` snapshots outliving what they reference, `deleted_deck_count` and the "deleted deck" chip — under the rule of ADR 047. Amends ADR 011: a review row is owned by its card and field and is deleted with them; the ledger stays append-only in every other respect and remains the sole source mastery is rebuilt from. Makes ADR 030's null-`deck_id` rerun branch unreachable: a snapshot goes with its deck, and a run left with no decks is deleted.

## Context

Under ADR 015, `review_log.card_id`, `review_log.field_def_id`, and `review_log.practice_card_id` are nullable with `ON DELETE SET NULL`, as is `practice_deck.deck_id`. The stated purpose was to preserve history. In the code as it stands, nothing reads a row whose reference has gone null: `db_fetch_review_log_for_rebuild` (`app/database_ops/review_log.py`) filters `card_id IS NOT NULL AND field_def_id IS NOT NULL`, the breakdown looks up ratings through practice cards that cascade away with their card, and no statistics reader exists. `practice_card_id` is never written at all — `record_review_group` does not set it — so it exists only to be nulled. A `practice_deck` with a null `deck_id` is counted into `deleted_deck_count` (`app/database_ops/practice_run.py`) so the client can render a chip, and a run whose only deck was deleted lists as Completed with an empty breakdown.

ADR 047 makes history owned: a review is about a card and a field, and a snapshot is about a deck.

## Decision

- `review_log.card_id` and `review_log.field_def_id` become `NOT NULL` with `ON DELETE CASCADE`. `review_log.practice_card_id` is dropped; `review_group_id`, which equals the practice card's id by construction in `submit_rating`, is the only link from a review to its appearance.
- `practice_deck.deck_id` becomes `NOT NULL` with `ON DELETE CASCADE`. A run left with no practice decks is deleted in the same operation (through the deletion closure, ADR 051); a run that spanned other decks keeps them. `deleted_deck_count` leaves the run payloads and the chip is removed.
- No rebuild follows a card or deck delete: a review group belongs to exactly one card, and `apply_rating` writes only that card's pairs, so deleting the card removes precisely the ledger rows its reviews produced and nothing else ever depended on them.
- `rebuild_mastery` reads every row; the null filters go.
- The lazy completion of a stranded run (ADR 015 as amended) stays, for a run whose cards are deleted or a multi-deck run that loses one deck.
- The migration deletes the orphaned review rows, null-deck snapshots, and empty runs before tightening the constraints.

## Alternatives considered

### Keep SET NULL for a future statistics reader

Rejected. No such reader exists. When one does, per-card questions need live cards, and a per-user count of reviews per day can be derived from rows that still have their cards or kept in a table designed for it; orphans answer neither well.

### Keep `practice_card_id` and start writing it

Rejected. It would duplicate `review_group_id` and add a persistent-to-ephemeral pointer that ADR 047 forbids. A rebuild reconstructs attribution from `review_group_id` alone, and gets `None` exactly when the run has been deleted, which is what ADR 039 leaves.

### Keep null-deck snapshots for multi-deck runs

Rejected. A snapshot of a deck that no longer exists has no name, no cards, and nothing to rerun; the run keeps its surviving decks and loses nothing by losing the shell of the missing one.

### A separate review-event table decoupled from cards, for statistics

Deferred, not adopted. Nothing needs it yet, and it can be added as pure derivation without touching the ledgers.

## Consequences

Benefits:

- No reader anywhere filters for null references; every review row has a live card and field, and every snapshot a live deck.
- The run list is exact: a run appears if and only if it has a deck.
- Deleting a deck leaves zero rows that reference it, so the delete confirm can say what happens without qualification.

Costs:

- Deleting a card or deck destroys its review history. This is the intent, and the delete confirms name it.
- The migration's cleanup is not reversible; a downgrade restores the nullable columns but not the rows.
- `test_rebuild_mastery_skips_orphaned_history` and the chip tests describe states that no longer exist and are replaced.
