# ADR 118: One deletion closure for every deletion of a deck, field or card, a practice deleted by its cascades

## Status

Active

## Context

PDR 033 leaves decks nothing above them. PDR 044 deletes a field with everything it held, its place in every run that showed or asked it included. PDR 035 keeps a practice until the user deletes it, and every run under one practice.

Deleting a practice takes every run and every summary it has, and what its runs did to the user's mastery stays. No screen offers a way to delete a single run.

Persistent entities never depend on ephemeral ones: a practice and its configurations are persistent, and a run with its copies, card rows and counted cards is ephemeral. Deleting a deck, field or card takes practices' configurations of it, runs, ledger rows, ids inside arrays and a deck-scoped rebuild with it.

`review_log` is appended to only by the rating path, and its rows are deleted only with the card or field they belong to (ADR 011). `mastery_log.run_id` attributes a ledger row to a run and goes null when the run is deleted (ADR 042).

Every run belongs to a practice through `ON DELETE CASCADE` (ADR 105). A practice's configurations cascade with the practice and with their deck (ADR 107), and a run's counted cards cascade with the run and the card (ADR 113).

The user confirms a delete after being told what goes with it, and the deck confirm counts the cards, fields and runs it deletes and the practices it takes the deck out of.

A warning computed by one piece of code and a deletion executed by another can disagree as soon as either changes. Foreign-key cascades remove some dependents; ids inside arrays and the rebuild need statements of their own.

Every read and write is scoped to the requesting user, and another user's resource is a 404 (ADR 034). A one-query handler calls a committing `db_*` function directly (ADR 055).

A request that changes nothing can be a `GET`, which carries its ids in the URL.

ADR 093 had one service plan and execute every deletion, subjects and configurations included, and ADR 039 let the user delete a single run. Subjects are gone, a configuration is now pruned rather than deleted, and a practice's deletion is all cascades, so this record restates ADR 093 and replaces ADR 039's run deletion.

## Decision

We will have one service, `app/services/deletion.py`, both plan and execute every deletion of a deck, field or card.

- `compute_deletion_impact(db, user_id, deck_ids, field_ids, card_ids)` is a pure read that computes the closure under the rule that persistent entities never depend on ephemeral ones and returns ids by type: active fields and cards of the deleted decks; the practices that hold a deleted deck; runs whose every `run_configuration` is of a deleted deck, plus active runs whose copy names an explicitly deleted field; the surviving decks that lose fields; and the count of cards affected. An id not owned by the user is a 404 naming it. A field whose deck is also being deleted contributes nothing on its own: it is part of the deck cascade, so it triggers no configuration change, no run deletion, no scrub, and no rebuild.
- `apply_deletion(db, strategy, impact)` executes exactly that closure, in order: runs; the removal of each explicitly deleted field from its deck's practice and run configurations; the scrub of that field's id from `shown_prompt_ids` and from run cards' prompts and answers per surviving deck; bulk deletes of cards, fields and decks by id; a flush; then a rebuild of each deck that lost a field. Foreign-key cascades remove only what the closure does not count. It is the only way a deck, field or card is deleted.
- `GET /api/deletion-impact?deck_ids=&field_ids=&card_ids=` returns the same closure as counts, for the confirms. It is safe and idempotent.
- The delete transaction computes its own impact. The preview the user saw is advisory; the compute inside the transaction is authoritative and reflects the state at that moment. What the confirm shows and what the save does come from one function.

We will delete a practice through `DELETE /api/practices/{practice_id}`, which calls a committing `db_delete_practice`: one `DELETE` statement scoped to the user, whose foreign keys' cascades remove the practice's configurations and its runs, with each run's copies, card rows and counted cards, set `mastery_log.run_id` null and leave `review_log` alone. It does not go through the closure. No route deletes a single run.

## Alternatives considered

### Practices in the deletion closure

Rejected because every caller of the closure would pass an empty list of practices, and the closure would plan nothing for a practice that its cascades do not already do.

### The single-run delete kept

Rejected because no screen reaches it.

### A dry-run flag on the batch edit

Rejected because it needs rollback machinery inside the edit and a second response shape on the edit route, and it would cover only the deck form's save, not the deck delete.

### Per-type impact routes, or per-field lookups

Rejected because they repeat the closure per type, and a per-field lookup double-counts a run that names two of the removed fields.

### A server-held pending deletion, executed on confirm

Rejected because it is either a new ephemeral entity with its own cleanup, executing a plan that can go stale while the confirm is open, or a database transaction held across the user's pause.

### The client sending the plan back

Rejected because a list of ids from the client is untrusted input that must be verified again, which is most of what the compute does, and it still executes a plan that may be stale.

### A conflict check that refuses when the recomputed counts differ from what was shown

Rejected because recomputing inside the transaction already deletes what is there now, and the surprise it guards against is not worth a 409 path.

### Delete functions per resource, consuming the impact's ids

Rejected because each would lean on cascades the closure only models, and a divergence between them would show as a wrong count with no test to catch it.

### `POST` for the query

Rejected because the query changes nothing, and `GET` says so.

### Run cards left with a deleted field's id

Rejected because every reader of run cards would have to filter the dead id out or resolve a placeholder.

## Consequences

**Positive**

- The user confirms counts that come from the same function that deletes the rows, so they cannot drift.
- The developer adds a new resource type or cascade rule as one step in the closure, and every delete path inherits it.
- The user's practice is deleted all or nothing, in one statement, and their mastery stays as it was.
- The developer reading a run card after a field delete finds no id that the closure left behind.

**Negative**

- The server runs two computations per confirmed delete, one advisory and one authoritative.
- The developer reloads what they need after `apply_deletion`, since it deletes with SQL statements and a loaded object is not updated for rows the cascades remove.
- The server scrubs every run card of a deck that loses a field, completed runs' included.
- The user cannot delete one run without deleting its practice.

**Neutral**

- The user whose practice loses its last deck keeps the practice, with no decks and no runs, and starting it is refused with `no_cards`.
