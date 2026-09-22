# ADR 047: Persistent entities never depend on ephemeral ones

## Status

Accepted. Supersedes the owned-state-versus-history framing of ADR 015 (its cascade of deck-owned rows stands; see ADR 048 for what replaces its SET NULL half). Reaffirms ADR 039: deleting a run costs exactly that run's attribution.

## Context

The schema holds two kinds of rows. The library and the ledgers — `subject`, `deck`, `field_def`, `card`, `card_field_value`, `deck_practice_config`, `review_log`, `mastery_log` — are what the user built and what they did. The run tables — `practice_run`, `practice_deck`, `practice_card` — are the state of one sitting: which decks, which cards in which order, what was shown. ADR 015 drew its line elsewhere, between "state that only exists because the deck exists" and "a historical record", and made `review_log` and `practice_deck` outlive the rows they referenced by nulling the reference.

By the time field deletion was reopened (task 013), that line had produced only costs. The dev database held 62 review rows with a null `field_def_id` that no reader consulted; `rebuild_mastery` filtered them out; the run list computed a `deleted_deck_count` so the client could render "deleted deck" chips for snapshots with nothing left to show; a completed run whose only deck was gone listed with an empty breakdown; and a pending `practice_card` whose answer field had been deleted could never be rated, because `submit_rating` demands a rating for every stored answer id. Each of these was decided table by table. What was missing was a rule that answers every deletion and update case the same way.

## Decision

Persistent entities never depend on ephemeral ones.

- **Persistent:** subject, deck, field, card, configuration, review log, mastery log. **Ephemeral:** practice run, practice deck, practice card. "Depends on" means references the id, by foreign key or inside an array.
- **Deleting an ephemeral entity** touches nothing persistent except attribution, which nulls. Deleting a run deletes its practice decks and practice cards and nulls `mastery_log.practice_run_id`; every review row and every mastery value stays. A run is a shell for the reviews inside it, not a resource in its own right.
- **Deleting a persistent entity** deletes every record that references its id and recomputes every value derived from the deleted records. Ephemeral dependents go only when they can no longer function: an active run that can no longer be rated, a run with no decks left. A completed run that still has cards to show keeps a dead id in its frozen arrays.
- **Updating a persistent entity** affects nothing that references it, because references are by id (ADR 009); the one exception is attribution, which a material edit severs (ADR 040).
- **The attribution pointers** — `mastery_log.practice_run_id`, `practice_deck.source_config_id`, and `review_group_id` equalling a practice card id by construction — are the only persistent-to-ephemeral references. They mean "which occasion", and they null or sever, never cascade.

ADR 048, ADR 049, and ADR 051 are this rule applied to the schema, to field deletion, and to the code path that executes deletions.

## Alternatives considered

### Owned state versus history (ADR 015's axis)

Rejected. History that outlives the thing it is about is history nothing can read: a review of a card that no longer exists answers no question about any card. Every reader had to filter the orphans out, and the filters, the chip, and the unreachable rerun branch were the whole visible effect of keeping them.

### Updates have maximum impact too

Rejected. A field rename, a reorder, or fixing a card value from "chat" to "cat" would erase or rebuild the reviews of it. ADR 009 made identity the id precisely so content edits leave history intact.

### Ephemeral dependents always cascade

Rejected. A field delete would delete every completed run that ever showed the field, and with it attribution the user did not ask to lose. A completed run still shows its attempts; it functions.

### Apply the rule to runs as well — deleting a run deletes its reviews

Rejected. Tidying the run list would move card mastery. The reviews are facts about the cards; the run is where they happened.

## Consequences

Benefits:

- One rule predicts every cascade, so a new table or a new delete path has a place to look before choosing its foreign-key mode.
- The null filters in the rebuild, the deleted-deck chip, and the null-`deck_id` rerun branch go, because the states they handled can no longer exist.
- A run delete, a run rerun, and a configuration edit are provably free of side effects on the ledgers.

Costs:

- History changes on delete. After a field delete, sibling fields' mastery and old runs' deltas move (ADR 049); a deck's "progress last month" can read differently afterwards. This is the meaning of "influence gone", accepted with eyes open.
- A completed run's attempt chains keep traces a deleted field caused — a card retried because that field was rated Again still shows "one retry". That is the run's record of what the user did, not a mastery claim.
- The attribution pointers are a deliberate exception every reader of those three columns has to know about.
