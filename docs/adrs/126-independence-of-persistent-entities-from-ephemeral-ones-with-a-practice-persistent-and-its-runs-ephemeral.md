# ADR 126: Independence of persistent entities from ephemeral ones, with a practice persistent and its runs ephemeral

## Status

Active

## Context

The schema holds two kinds of rows. The library, the practices and the ledgers, `deck`, `field_def`, `card`, `card_field_value`, `practice`, `practice_configuration`, `review_log` and `mastery_log`, are what the user built and what they did. The run tables, `run`, `run_configuration`, `run_card` and `run_counted_card`, are the state of one go: which decks and how each was asked, which cards in which order, what was shown, and which cards it counted.

PDR 035 keeps a practice until the user deletes it, and makes each run one go through it. Every run belongs to a practice through `ON DELETE CASCADE` (ADR 105).

A row references another by foreign key or by holding its id inside an array: a configuration's field arrays (ADR 107), a run copy's chosen cards (ADR 112), and a run card's prompts and answers.

A run's counted cards cascade with the run and with the card (ADR 113).

Every reader of reviews reads them by their card and field. A review records a rating of a card's field; the run it was made in records only where the rating happened.

A persistent entity's content changes by edit, such as a field renamed or reordered, a card's value corrected or a practice's configuration saved, while its id stays the same.

A completed run still shows its attempts, and how it asked each deck, after a field it showed is deleted.

PDR 044 deletes a field together with its place in every run that showed or asked it. The deletion closure removes a deleted field's id from every configuration, a practice's or a run's, and from every run card (ADR 119).

A rerun or a run of chosen cards is cut from the practice's configurations, not from a completed run's copies (ADR 112).

The breakdown resolves every field id on a run card against the deck's fields (ADR 125).

Two columns record which occasion a row came from: `mastery_log.run_id`, and `review_group_id`, which equals a run card's id by construction.

ADR 092 set this rule over tables that no longer exist, kept a dead id in every completed run's copy, and rejected scrubbing it there because it would change what a rerun covers. A rerun no longer reads a completed run's copy, so this record restates ADR 092 with the copy scrubbed.

## Decision

We will have persistent entities never depend on ephemeral ones.

- Persistent entities are decks, fields, cards, their values, practices, practices' configurations, the review log and the mastery log; ephemeral ones are runs, their configurations, their cards and their counted cards. "Depends on" means references the id, by foreign key or inside an array.
- **Deleting an ephemeral entity** touches nothing persistent except attribution, which nulls. Deleting a run deletes its configurations, card rows and counted cards and nulls `mastery_log.run_id`; every review row and every mastery value stays.
- **Deleting a persistent entity** deletes every record that references its id and recomputes every value derived from the deleted records. Ephemeral dependents go only when they can no longer function: an active run that can no longer be rated, a run with no decks left. A completed run keeps no deleted field's id, and keeps a deleted card's id only in `card_ids`.
- **Updating a persistent entity** affects nothing that references it, because references are by id.
- **The attribution pointers**, `mastery_log.run_id` and `review_group_id` equalling a run card's id by construction, are the only persistent-to-ephemeral references. They mean "which occasion", and they null, never cascade.

## Alternatives considered

### History kept when the thing it is about is deleted

Rejected because history that outlives the thing it is about is history nothing can read, and every reader would have to filter the orphans out.

### Updates with maximum impact too

Rejected because any edit to a persistent entity would erase or rebuild the reviews of it; identity is the id precisely so that content edits leave history intact.

### Ephemeral dependents always cascading

Rejected because a field delete would delete every completed run that ever showed the field, and with it attribution the user did not ask to lose. A completed run still shows its attempts; it functions.

### The rule applied to runs, so that deleting a run deletes its reviews

Rejected because deleting a practice would move card mastery. The reviews are facts about the cards; the run is where they happened.

### Dead field ids kept on run cards or in a completed run's copies

Rejected because every reader of them would have to filter the dead ids out or resolve a placeholder, against PDR 044.

## Consequences

**Positive**

- The developer predicts every cascade from one rule, so a new table or delete path has a place to look before choosing its foreign-key mode.
- The developer writes no filter for orphaned history, because the states it would handle cannot exist.
- The developer gets a practice's deletion, a rerun and a configuration's save provably free of side effects on the ledgers.
- The developer reading a run card's arrays or a configuration's finds only live fields.

**Negative**

- The user's history changes on delete: after a field delete, sibling fields' mastery and old runs' deltas move, and a deck's past progress can read differently afterwards.
- The user sees a completed run's attempts keep the traces a deleted field caused, as the run's record of what they did rather than a mastery claim.
- The user sees an attempt of a completed run keep fewer fields than it showed once one of them is deleted.
- The developer reading the two attribution columns must know they are the deliberate exception.
- The developer reading `card_ids` must expect dead card ids.

**Neutral**
