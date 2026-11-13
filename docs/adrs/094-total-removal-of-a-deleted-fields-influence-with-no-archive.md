# ADR 094: Total removal of a deleted field's influence, with no archive

## Status

Superseded by ADR 119

## Context

A field is a `field_def` row of one deck, referenced everywhere by its id, and its name is unique among its deck's live fields (ADR 009).

A deck always has at least two active fields, and the deck form deletes a field through the batch edit (ADR 079).

PDR 028 lets the user take a field out of a deck only by deleting it, with everything it held: its value on every card, its mastery, and its place in every practice that showed or asked it. It offers no way to set a field aside.

Persistent entities never depend on ephemeral ones, and a completed run keeps a dead id only in its snapshot arrays (ADR 092).

One closure plans and executes every deletion; for a deleted field it scrubs the field's id from the deck's review rows and practice cards and rebuilds the deck (ADR 093).

A field's ratings feed the prompt-side updates of the sibling fields shown with it, through the breadth-weighted target in `EmaStrategy.expand`, and its id sits in other review rows' `shown_prompt_ids`.

Review rows cascade with their field (ADR 048).

Mastery is rebuilt by replaying the log through the primitive the live path uses, and a rebuild scoped to one deck keeps every row's position (ADR 011, ADR 050).

A configuration whose arrays name a deleted field no longer validates, and a pending practice card whose answer field is gone can never be rated.

A rerun or a practice of chosen cards drops a snapshot that names a field no longer live (ADR 076, ADR 086).

The breakdown resolves every field it returns (ADR 084), and a card opened from the summary marks a field an attempt did not show or ask as "not shown" or "not asked" (PDR 025).

`field_def` carries `archived_at`, and the unique index on a field's name, `uq_field_def_deck_id_name_active`, is conditioned on it.

`DELETE /api/fields/{id}` archives a field, and `DELETE /api/fields/{id}/hard` deletes one through `db_hard_delete_field_def`, outside the closure; about seven read filters and every `include_archived` parameter exclude archived fields.

No component calls the archive route, the dev database holds no archived field, and the archive route is called 26 times across 8 test files, `tests/api_tests/test_auth_scoping.py` among them.

Every constraint and index name comes from the naming convention in `app/database.py` (ADR 054).

ADR 049 made field removal a hard delete of all the field's influence, and left the archive dormant and completed practices' practice cards holding the dead id.

## Decision

We will make field removal a user-facing hard delete whose meaning is that all influence of the field is gone. In one transaction, through the deletion closure:

- The closure deletes the deck's configurations whose four id arrays name the field.
- The closure deletes active runs holding a snapshot that names the field, after the user confirms; a completed run keeps the dead id only in its snapshot arrays, where a rerun or a practice of chosen cards drops that snapshot.
- The closure removes the field's id from every `shown_prompt_ids` array among the deck's cards' review rows, scoped by card so no other deck's rows are read, and from the prompts and answers of every practice card of a card of the deck.
- The closure deletes the field row, and its values, its ledger rows and the review rows where it was rated cascade.
- The closure rebuilds the deck's mastery from the remaining review rows, deck-scoped. The result is exactly what the live path would have written had the same appearances happened without the field: a group where the field was one rated answer among others survives with one fewer rating and one less breadth; a group where it was a shown prompt loses that prompt; a group where it was the only rated answer vanishes.

No reader of practice cards resolves a placeholder for a deleted field, since every id in their arrays names a live field.

The save confirm names what goes, the cards affected, the configurations deleted and the active practices deleted, and never internal rows.

We will keep no archive: `field_def` carries no `archived_at`, a field's name is unique within its deck by the plain index `uq_field_def_deck_id_name`, and no route or read filters on archiving.

`DELETE /api/fields/{id}` deletes one field through `compute_deletion_impact` then `apply_deletion`, refuses below two active fields with `too_few_fields`, touches the deck, and returns 204.

## Alternatives considered

### Archive as the user's path

Rejected because a retired field's history would reach no user through any surface, and PDR 028 offers no way to set a field aside.

### The archive kept dormant

Rejected because it keeps a column, an index condition, two routes and the read filters for a state the product rules out, held back only by a rule in AGENTS.md, and keeps the hard route's bypass of the closure.

### Both field delete routes removed

Rejected because every test call to the archive route, the ownership guard's among them, would have to become a whole-deck changeset.

### The routes removed with the column kept

Rejected because it leaves a column that means nothing and an index still conditioned on it.

### The field's review rows kept with a null id

Rejected because the rows feed nothing once the field is gone, and the field's influence on its siblings would persist through the prompt-side updates unless the deck were rebuilt anyway.

### The field pruned out of configurations instead of deleting them

Rejected because a pruned configuration silently means something other than what the user saved; deleting it and counting it in the confirm is honest.

### The delete refused while an active run names the field

Rejected because it would be the only place a delete says no, and would add a blocking state the deck form has to explain.

### A rebuild of every deck the user owns

Rejected because a review group belongs to one card, so replaying one deck's groups reproduces that deck's rows exactly, and the ledger's order is the review's timestamp, so a scoped rebuild is safe for ordering.

### Dead prompt ids filtered at rebuild time instead of scrubbed

Rejected because a filter at run time hides a violated invariant, while the scrub makes every shown prompt id a live field and lets the ledger's foreign key enforce it loudly.

### Dead ids filtered when the breakdown reads practice cards

Rejected because every later reader of practice cards would have to repeat the filter.

### The placeholder for a deleted field kept

Rejected because it keeps the field's place in the practice that PDR 028 deletes.

### Dead ids scrubbed from snapshot arrays too

Rejected because it would change what a rerun covers, which is a product question, and would leave a snapshot's pool counts unmatched to its ids.

## Consequences

**Positive**

- The user's field delete leaves nothing behind: no row, no id in a practice card or review row, no configuration, and no influence on mastery.
- The user sees consistent mastery at once, since the rebuild runs inside the delete request.
- The developer finds a field either present or gone, in the data as in the product, with no archived state to filter.
- The developer sends every field delete through the closure.

**Negative**

- The user's history changes: sibling fields' current mastery and old runs' deltas move after a delete, and a completed practice's attempts keep fewer fields than they showed.
- The developer accepts a synchronous rebuild in the request; scoping it further is a later optimization if it ever hurts.
- The developer runs a migration that drops a column and replaces an index.
- The developer rewrites the tests of the archive route against the delete route.

**Neutral**

- The developer finds AGENTS.md's rule against exposing the archive with nothing left to guard.
