# ADR 119: Total removal of a deleted field's influence, every configuration pruned to live fields

## Status

Active

## Context

A field is a `field_def` row of one deck, referenced everywhere by its id, and its name is unique among its deck's live fields (ADR 009).

A deck always has at least two active fields, and the deck form deletes a field through the batch edit (ADR 079).

PDR 044 lets the user take a field out of a deck only by deleting it, with everything it held: its value on every card, its mastery, and its place in every run that showed or asked it. It offers no way to set a field aside.

A practice holds one configuration per deck, and each run cuts a frozen copy of it (ADR 107). A completed run's page shows how the run asked each deck (PDR 039). Every next run is cut from the practice's configurations as they stand (ADR 112).

A configuration names at least one field on each side, and every random-draw count lies between 1 and its pool's size (ADR 109).

The starting configuration of a deck shows its first live field by position always on the prompt side and every other live field always on the answer side, and a new practice starts a deck never practiced with it.

One closure plans and executes every deletion of a deck, field or card (ADR 118).

A field's ratings feed the prompt-side updates of the sibling fields shown with it, through the breadth-weighted target in `EmaStrategy.expand`, and its id sits in other review rows' `shown_prompt_ids`.

Review rows cascade with their field (ADR 048).

Mastery is rebuilt by replaying the log through the primitive the live path uses, and a rebuild scoped to one deck keeps every row's position (ADR 011, ADR 050).

A pending run card whose answer field is gone can never be rated.

A card opened from the summary shows each field the run showed or asked, and marks a field an attempt did not show or ask (PDR 043).

ADR 094 deleted every configuration naming a deleted field, rejected pruning it as silently changing what the user saved, and kept the dead id in completed runs' copies, rejecting its scrub as changing what a rerun covers. A configuration is now part of a practice, so deleting it would take the deck out of the practice; a rerun is cut from the practice, not from a completed run's copy; and a completed run's page shows its copy. This record restates ADR 094.

## Decision

We will make field removal a user-facing hard delete whose meaning is that all influence of the field is gone. In one transaction, through the deletion closure:

- The closure removes the field's id from every practice's configuration of the deck, lowers each random-draw count to its pool's size, drops the count of a pool left empty, and resets a side left with no field to the starting configuration, through one function shared with a new practice's start.
- The closure deletes every active run whose copy names the field, after the user confirms, and applies the same removal and lowering, with no reset, to every remaining run copy of the deck.
- The closure removes the field's id from every `shown_prompt_ids` array among the deck's cards' review rows, scoped by card so no other deck's rows are read, and from the prompts and answers of every run card of a card of the deck.
- The closure deletes the field row, and its values, its ledger rows and the review rows where it was rated cascade.
- The closure rebuilds the deck's mastery from the remaining review rows, deck-scoped. The result is exactly what the live path would have written had the same appearances happened without the field: a group where the field was one rated answer among others survives with one fewer rating and one less breadth; a group where it was a shown prompt loses that prompt; a group where it was the only rated answer vanishes.

No reader of run cards resolves a placeholder for a deleted field, and every configuration, a practice's or a run's, names only live fields.

The save confirm names what goes, the cards affected and the active runs deleted, and never internal rows.

We will keep no archive: `field_def` carries no `archived_at`, a field's name is unique within its deck by the plain index `uq_field_def_deck_id_name`, and no route or read filters on archiving.

`DELETE /api/fields/{id}` deletes one field through `compute_deletion_impact` then `apply_deletion`, refuses below two active fields with `too_few_fields`, touches the deck, and returns 204.

## Alternatives considered

### The configurations naming the field deleted

Rejected because a configuration is part of a practice, and deleting it would take the deck out of the practice.

### Dead ids kept in run copies, skipped by the board's read

Rejected because every future reader of a copy would have to know to skip them.

### The reset at the practice's next start

Rejected because the board would show an empty side until then.

### Archive as the user's path

Rejected because a retired field's history would reach no user through any surface, and PDR 044 offers no way to set a field aside.

### The field's review rows kept with a null id

Rejected because the rows feed nothing once the field is gone, and the field's influence on its siblings would persist through the prompt-side updates unless the deck were rebuilt anyway.

### The delete refused while an active run names the field

Rejected because it would be the only place a delete says no, and would add a blocking state the deck form has to explain.

### A rebuild of every deck the user owns

Rejected because a review group belongs to one card, so replaying one deck's groups reproduces that deck's rows exactly, and the ledger's order is the review's timestamp, so a scoped rebuild is safe for ordering.

### Dead prompt ids filtered at rebuild time instead of scrubbed

Rejected because a filter at run time hides a violated invariant, while the scrub makes every shown prompt id a live field and lets the ledger's foreign key enforce it loudly.

### Dead ids filtered when the breakdown reads run cards

Rejected because every later reader of run cards would have to repeat the filter.

### A placeholder for a deleted field

Rejected because it keeps the field's place in the run that PDR 044 deletes.

## Consequences

**Positive**

- The user's field delete leaves nothing behind: no row, no id in a run card, a review row or a configuration, and no influence on mastery.
- The user sees consistent mastery at once, since the rebuild runs inside the delete request.
- The developer reads every configuration as naming only live fields, with no filter.
- The user can start every practice after a field delete, since no configuration is left with an empty side.

**Negative**

- The user's history changes: sibling fields' current mastery and old runs' deltas move after a delete, and a completed run's attempts and its board keep fewer fields than they showed.
- The user finds a practice's board changed where a reset put fields they did not place.
- The developer accepts a synchronous rebuild in the request.

**Neutral**

- The developer reading a completed run's copy can find a side with no field, since copies are pruned without a reset.
