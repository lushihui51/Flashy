# ADR 093: One deletion closure for every deletion, scrubbing practice cards

## Status

Active

## Context

Deleting a subject, deck, field or card takes configurations, runs, ledger rows, ids inside arrays and a deck-scoped rebuild with it, under the rule that persistent entities never depend on ephemeral ones (ADR 092).

The user confirms a delete after being told what goes with it.

A warning computed by one piece of code and a deletion executed by another can disagree as soon as either changes.

Foreign-key cascades remove some dependents; ids inside arrays and the rebuild need statements of their own.

Every read and write is scoped to the requesting user, and another user's resource is a 404.

The deck form's save, the deck delete and the subject delete each show a confirm, and each can delete more than one kind of thing at once.

A request that changes nothing can be a `GET`, which carries its ids in the URL.

ADR 051 had one service plan and execute every deletion, with a scrub of the deleted fields' ids from `review_log.shown_prompt_ids`; the practice cards of completed practices kept those ids.

## Decision

We will have one service, `app/services/deletion.py`, both plan and execute every deletion.

- `compute_deletion_impact(db, user_id, subject_ids, deck_ids, field_ids, card_ids)` is a pure read that computes the closure under the rule that persistent entities never depend on ephemeral ones and returns ids by type: decks of the subjects; active fields, cards, and configurations of those decks; configurations naming any explicitly deleted field; runs whose every practice deck is in the deleted set, plus active runs naming an explicitly deleted field; the surviving decks that lose fields; and the count of cards affected. An id not owned by the user is a 404 naming it. A field whose deck is also being deleted contributes nothing on its own: it is part of the deck cascade, so it triggers no configuration lookup, no run deletion, no scrub, and no rebuild.
- `apply_deletion(db, strategy, impact)` executes exactly that closure, in order: runs, configurations, the scrub of each explicitly deleted field's id from `shown_prompt_ids` and from practice cards' prompts and answers per surviving deck, bulk deletes of cards, fields, decks, and subjects by id, a flush, then a rebuild of each deck that lost a field. Foreign-key cascades remove only what the closure does not count. It is the only way a subject, deck, field, or card is deleted.
- `GET /api/deletion-impact?subject_ids=&deck_ids=&field_ids=&card_ids=` returns the same closure as counts, for the confirms. It is safe and idempotent.
- The delete transaction computes its own impact. The preview the user saw is advisory; the compute inside the transaction is authoritative and reflects the state at that moment. What the confirm shows and what the save does come from one function.

## Alternatives considered

### A dry-run flag on the batch edit

Rejected because it needs rollback machinery inside the edit and a second response shape on the edit route, and it would cover only the deck form's save, not the deck or subject delete.

### Per-type impact routes, or per-field lookups

Rejected because they repeat the closure per type, and a per-field lookup double-counts a configuration or run that names two of the removed fields.

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

### Practice cards left with a deleted field's id

Rejected because every reader of practice cards would have to filter the dead id out or resolve a placeholder.

## Consequences

**Positive**

- The user confirms counts that come from the same function that deletes the rows, so they cannot drift.
- The developer adds a new resource type or cascade rule as one step in the closure, and every delete path inherits it.
- The user gets an honest confirm on every delete, deck and subject included.
- The developer reading a practice card after a field delete finds no id that the closure left behind.

**Negative**

- The server runs two computations per confirmed delete, one advisory and one authoritative.
- The server pays one extra ownership read on a single-card delete.
- The developer reloads what they need after `apply_deletion`, since it deletes with SQL statements and a loaded object is not updated for rows the cascades remove.
- The server scrubs every practice card of a deck that loses a field, completed practices' included.

**Neutral**
