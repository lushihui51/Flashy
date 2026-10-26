# ADR 047: Independence of persistent entities from ephemeral ones

## Status

Active

## Context

The schema holds two kinds of rows. The library and the ledgers — `subject`, `deck`, `field_def`, `card`, `card_field_value`, `deck_practice_config`, `review_log`, `mastery_log` — are what the user built and what they did. The run tables — `practice_run`, `practice_deck`, `practice_card` — are the state of one sitting: which decks, which cards in which order, what was shown. ADR 015 drew its line elsewhere, between "state that only exists because the deck exists" and "a historical record", and made `review_log` and `practice_deck` outlive the rows they referenced by nulling the reference.

By the time field deletion was reopened, that line had produced only costs. The dev database held 62 review rows with a null `field_def_id` that no reader consulted; `rebuild_mastery` filtered them out; the run list computed a `deleted_deck_count` so the client could render "deleted deck" chips for snapshots with nothing left to show; a completed run whose only deck was gone listed with an empty breakdown; and a pending `practice_card` whose answer field had been deleted could never be rated, because `submit_rating` demands a rating for every stored answer id. Each of these was decided table by table. What was missing was a rule that answers every deletion and update case the same way.

## Decision

We will have persistent entities never depend on ephemeral ones.

- **Persistent:** subject, deck, field, card, configuration, review log, mastery log. **Ephemeral:** practice run, practice deck, practice card. "Depends on" means references the id, by foreign key or inside an array.
- **Deleting an ephemeral entity** touches nothing persistent except attribution, which nulls. Deleting a run deletes its practice decks and practice cards and nulls `mastery_log.practice_run_id`; every review row and every mastery value stays. A run is a shell for the reviews inside it, not a resource in its own right.
- **Deleting a persistent entity** deletes every record that references its id and recomputes every value derived from the deleted records. Ephemeral dependents go only when they can no longer function: an active run that can no longer be rated, a run with no decks left. A completed run that still has cards to show keeps a dead id in its frozen arrays.
- **Updating a persistent entity** affects nothing that references it, because references are by id; the one exception is attribution, which a material edit severs.
- **The attribution pointers** — `mastery_log.practice_run_id`, `practice_deck.source_config_id`, and `review_group_id` equalling a practice card id by construction — are the only persistent-to-ephemeral references. They mean "which occasion", and they null or sever, never cascade.

## Alternatives considered

### Owned state versus history (ADR 015's axis)

Rejected. History that outlives the thing it is about is history nothing can read: a review of a card that no longer exists answers no question about any card. Every reader had to filter the orphans out, and the filters, the chip, and the unreachable rerun branch were the whole visible effect of keeping them.

### Updates have maximum impact too

Rejected. A field rename, a reorder, or a corrected card value would erase or rebuild the reviews of it. Identity is the id precisely so content edits leave history intact.

### Ephemeral dependents always cascade

Rejected. A field delete would delete every completed run that ever showed the field, and with it attribution the user did not ask to lose. A completed run still shows its attempts; it functions.

### Apply the rule to runs as well — deleting a run deletes its reviews

Rejected. Tidying the run list would move card mastery. The reviews are facts about the cards; the run is where they happened.

## Consequences

**Positive**

- The developer predicts every cascade from one rule, so a new table or delete path has a place to look before choosing its foreign-key mode.
- The developer removes every filter and branch that handled orphaned history, because the states they handled can no longer exist.
- The developer gets a run delete, a rerun, and a configuration edit provably free of side effects on the ledgers.

**Negative**

- The user's history changes on delete: after a field delete, sibling fields' mastery and old runs' deltas move, and a deck's past progress can read differently afterwards.
- The user sees a completed run's attempt chains keep traces a deleted field caused, a retry still showing; the run's record of what they did, not a mastery claim.
- The developer reading the three attribution columns must know they are the deliberate exception.

**Neutral**
