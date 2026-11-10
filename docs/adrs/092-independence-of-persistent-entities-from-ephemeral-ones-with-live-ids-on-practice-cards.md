# ADR 092: Independence of persistent entities from ephemeral ones, with live ids on practice cards

## Status

Superseded by ADR 126

## Context

The schema holds two kinds of rows. The library and the ledgers, `subject`, `deck`, `field_def`, `card`, `card_field_value`, `deck_practice_config`, `review_log` and `mastery_log`, are what the user built and what they did. The run tables, `practice_run`, `practice_deck` and `practice_card`, are the state of one sitting: which decks, which cards in which order, and what was shown.

A row references another by foreign key or by holding its id inside an array: a snapshot's field arrays and its chosen cards (ADR 086), and a practice card's prompts and answers.

Every reader of reviews reads them by their card and field.

A review records a rating of a card's field; the run it was made in records only where the rating happened.

A persistent entity's content changes by edit, such as a field renamed or reordered or a card's value corrected, while its id stays the same.

A completed practice still shows its attempts after a field it showed is deleted.

A rerun or a practice of chosen cards drops a snapshot that names a field no longer live (ADR 076, ADR 086).

The breakdown resolves every field id on a practice card against the deck's fields (ADR 084).

PDR 028 deletes a field together with its place in every practice that showed or asked it.

Three columns record which occasion a row came from: `mastery_log.practice_run_id`, `practice_deck.source_config_id`, and `review_group_id`, which equals a practice card's id by construction.

ADR 047 kept a dead id in every frozen array of a completed run, the practice cards' included, and the breakdown resolved a dead field id as a placeholder.

## Decision

We will have persistent entities never depend on ephemeral ones.

- Persistent entities are subjects, decks, fields, cards, configurations, the review log and the mastery log; ephemeral ones are practice runs, practice decks and practice cards. "Depends on" means references the id, by foreign key or inside an array.
- **Deleting an ephemeral entity** touches nothing persistent except attribution, which nulls. Deleting a run deletes its practice decks and practice cards and nulls `mastery_log.practice_run_id`; every review row and every mastery value stays.
- **Deleting a persistent entity** deletes every record that references its id and recomputes every value derived from the deleted records. Ephemeral dependents go only when they can no longer function: an active run that can no longer be rated, a run with no decks left. A completed run that still has cards to show keeps a dead id in its snapshot arrays, and its practice cards lose a deleted field's id.
- **Updating a persistent entity** affects nothing that references it, because references are by id; the one exception is attribution, which a material edit severs.
- **The attribution pointers**, `mastery_log.practice_run_id`, `practice_deck.source_config_id`, and `review_group_id` equalling a practice card id by construction, are the only persistent-to-ephemeral references. They mean "which occasion", and they null or sever, never cascade.

## Alternatives considered

### History kept when the thing it is about is deleted

Rejected because history that outlives the thing it is about is history nothing can read, and every reader would have to filter the orphans out.

### Updates with maximum impact too

Rejected because any edit to a persistent entity would erase or rebuild the reviews of it; identity is the id precisely so that content edits leave history intact.

### Ephemeral dependents always cascading

Rejected because a field delete would delete every completed run that ever showed the field, and with it attribution the user did not ask to lose. A completed run still shows its attempts; it functions.

### The rule applied to runs, so that deleting a run deletes its reviews

Rejected because tidying the run list would move card mastery. The reviews are facts about the cards; the run is where they happened.

### Dead field ids kept on practice cards

Rejected because every reader of practice cards would have to filter them out or resolve a placeholder, against PDR 028.

### Dead ids scrubbed from snapshot arrays too

Rejected because it would change what a rerun covers, which is a product question, and would leave a snapshot's pool counts unmatched to its ids.

## Consequences

**Positive**

- The developer predicts every cascade from one rule, so a new table or delete path has a place to look before choosing its foreign-key mode.
- The developer writes no filter for orphaned history, because the states it would handle cannot exist.
- The developer gets a run delete, a rerun and a configuration edit provably free of side effects on the ledgers.
- The developer reading a practice card's arrays finds only live fields.

**Negative**

- The user's history changes on delete: after a field delete, sibling fields' mastery and old runs' deltas move, and a deck's past progress can read differently afterwards.
- The user sees a completed run's attempts keep the traces a deleted field caused, as the run's record of what they did rather than a mastery claim.
- The user sees an attempt of a completed practice keep fewer fields than it showed once one of them is deleted.
- The developer reading the three attribution columns must know they are the deliberate exception.
- The developer reading a snapshot's arrays must expect dead ids.

**Neutral**
