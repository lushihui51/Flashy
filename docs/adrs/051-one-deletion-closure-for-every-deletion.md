# ADR 051: One deletion closure for every deletion

## Status

Active

## Context

Under ADR 047 through ADR 049, deleting a subject, deck, field, or card takes configurations, runs, ledger rows, array elements, and a rebuild with it, and the user must be told what goes before it goes. The confirm dialogs could not say so: the deck editor's save confirm counted removed fields only, the deck delete confirm promised "Your review history is kept", and the subject confirm counted decks from client state. Three routers and the batch edit each deleted their own way, relying partly on foreign-key cascades and partly on hand-written cleanup. A warning computed by one piece of code and a deletion executed by another can disagree the moment either changes.

## Decision

We will have one service, `app/services/deletion.py`, both plan and execute every deletion.

- `compute_deletion_impact(db, user_id, subject_ids, deck_ids, field_ids, card_ids)` is a pure read that computes the closure under the rule that persistent entities never depend on ephemeral ones and returns ids by type: decks of the subjects; active fields, cards, and configurations of those decks; configurations naming any explicitly deleted field; runs whose every practice deck is in the deleted set, plus active runs naming an explicitly deleted field; the surviving decks that lose fields; and the count of cards affected. An id not owned by the user is a 404 naming it. A field whose deck is also being deleted contributes nothing on its own: it is part of the deck cascade, so it triggers no configuration lookup, no run deletion, no scrub, and no rebuild.
- `apply_deletion(db, strategy, impact)` executes exactly that closure, in order: runs, configurations, the scrub of `shown_prompt_ids` per surviving deck, bulk deletes of cards, fields, decks, and subjects by id, a flush, then a rebuild of each deck that lost a field. Foreign-key cascades remove only what the closure does not count. It is the only way a subject, deck, field, or card is deleted.
- `GET /api/deletion-impact?subject_ids=&deck_ids=&field_ids=&card_ids=` returns the same closure as counts, for the confirms. Safe and idempotent.
- The delete transaction computes its own impact. The preview the user saw is advisory; the compute inside the transaction is authoritative and reflects the state at that moment. What the confirm shows and what the save does come from one function.

## Alternatives considered

### A dry-run flag on the batch edit

Rejected. It needs rollback machinery inside the edit, and a second response shape on the edit route — a union every caller narrows, or a wrapper that changes the existing response for consumers that never read it. It would also cover only the editor's own save, not the deck or subject delete.

### Per-type impact routes, or per-field lookups

Rejected. They repeat the closure per type, and a per-field lookup double-counts a configuration or run that names two of the removed fields.

### A server-held pending deletion, executed on confirm

Rejected. Either a new ephemeral entity with its own cleanup, executing a plan that can go stale while the dialog is open, or a database transaction held across the user's pause.

### The client sends the plan back

Rejected. A client-supplied id list is untrusted input that must be re-verified, which is most of what compute does, and it still executes a possibly stale plan.

### A conflict check: refuse when the recomputed counts differ from what was shown

Rejected. Recomputing inside the transaction already deletes what is there now, which is correct; for a single-user app the surprise it guards against is not worth a 409 path.

### Per-resource delete functions consuming the impact's ids

Rejected. Each would lean on cascades the closure only models; a divergence between them would show as a wrong count with no test to catch it.

### `POST` for the query

Rejected. The query changes nothing; `GET` says so. Its cost is that ids ride the URL, roughly 170 per request; the editor sends field ids only and derives its own card counts from state, and deck and subject deletes send one id.

## Consequences

**Positive**

- The user confirms counts that come from the same function that deletes the rows, so they cannot drift.
- The developer adds a new resource type or cascade rule as one step in the closure, and every delete path inherits it.
- The user gets an honest confirm on every delete, deck and subject included.

**Negative**

- The server runs two computations per confirmed delete, one advisory and one authoritative; milliseconds of indexed reads.
- The server pays one extra ownership read on a single-card delete.
- The developer reloads what they need after `apply_deletion`, since it deletes with SQL statements and a loaded object is not updated for rows the cascades remove.

**Neutral**
