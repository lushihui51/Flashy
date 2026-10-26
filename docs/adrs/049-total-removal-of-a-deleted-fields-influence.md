# ADR 049: Total removal of a deleted field's influence

## Status

Active

## Context

ADR 010 decided that a field is archived, never hard-deleted by default, with a gated hard delete for a field that has no values. Three things had drifted from that. No user interface ever called the archive endpoint or the gated hard delete; the deck editor's remove-field goes through the batch edit, which hard-deletes the row ungated (`app/services/deck_batch_edit.py`), and the dev database held zero archived fields. ADR 015 had made `review_log.field_def_id` `SET NULL`, so removing a field with review history succeeded silently instead of failing on the RESTRICT that ADR 010's gate had relied on (ADR 010's amendment records this). And the deleted field's influence lived on: its ratings had fed the prompt-side updates of its sibling fields (the breadth-weighted target in `EmaStrategy.expand`), its id stayed inside other rows' `shown_prompt_ids`, where a rebuild would try to insert a `mastery_log` row for it, configurations naming it stayed until run start rejected them, and a pending `practice_card` whose answer field it was could never be rated.

The user's position was that a resource they delete should be gone, and that archive earns nothing while no surface exposes it.

## Decision

We will make field removal a user-facing hard delete whose meaning is that all influence of the field is gone. Concretely, in one transaction, through the deletion closure:

- Configurations on the deck whose four id arrays name the field are deleted.
- Active runs holding a snapshot that names the field are deleted, after the user confirms; completed runs are untouched, their frozen arrays keeping the dead id, which rerun and the breakdown already tolerate.
- The field's id is removed from every `shown_prompt_ids` array among the deck's cards' review rows, scoped by card so no other deck's rows are read.
- The field row is deleted; its values, its ledger rows, and the review rows where it was rated cascade.
- The deck's mastery is rebuilt from the remaining review rows, deck-scoped. The result is exactly what the live path would have written had the same appearances happened without the field: a group where the field was one rated answer among others survives with one fewer rating and one less breadth; a group where it was a shown prompt loses that prompt; a group where it was the only rated answer vanishes.

The save confirm names what goes — cards affected, configurations deleted, active practices deleted — and never internal rows. Archive stays in the code as an option not implemented: nothing in this decision touches `archived_at`, its partial unique index, `DELETE /fields/{id}`, `DELETE /fields/{id}/hard`, or the archived-row filters.

## Alternatives considered

### Expose archive as the user path, as ADR 010 intended

Rejected. Archive's benefit — a retired field's history stays readable — reaches no user through any existing surface, and the shipped path was already hard delete. Keeping a second lifecycle for a benefit nobody gets is complexity without a customer.

### Strip archive out of the code

Rejected for now. One column, a partial index, two endpoints, five read filters, and about fifteen tests; leaving them dormant costs nothing at runtime and keeps the option open.

### Keep the field's review rows with a null id

Rejected. The rows feed nothing once the field is gone, and the field's influence on its siblings would persist through the prompt-side updates unless the deck were rebuilt anyway.

### Prune the field out of configurations instead of deleting them

Rejected. A pruned configuration silently means something other than what the user saved; deleting it and counting it in the confirm is honest.

### Refuse the delete while an active run names the field

Rejected. It would be the only place in the design where a delete says no, and would add a blocking state the editor has to explain. Deleting the run after confirmation is consistent with everything else here.

### Rebuild user-wide

Rejected. A review group belongs to one card, so replaying one deck's groups reproduces that deck's rows exactly; the ledger's order is the review's timestamp, so a scoped rebuild is safe for ordering. User-wide would replay every deck the user owns on every field delete.

### Filter dead prompt ids at rebuild time instead of scrubbing

Rejected. A runtime filter hides a violated invariant. The scrub makes "every shown prompt id is a live field" true, and the ledger's foreign key then enforces it loudly.

## Consequences

**Positive**

- The user's field delete leaves nothing: no row, no array element, no configuration, no mastery influence; the stuck-run bug cannot occur, and a configuration cannot go stale from a field delete.
- The user sees consistent mastery immediately, since the rebuild runs inside the delete request, deck-scoped.

**Negative**

- The user's history changes: sibling fields' current mastery and old runs' deltas move after a delete, and a completed run's attempt chains still show a retry the deleted field caused.
- The developer accepts a synchronous rebuild in the request, trivial at today's sizes; scoping it further is a later optimization if it ever hurts.
- The developer must know the archive code is dormant; AGENTS.md says so.

**Neutral**
