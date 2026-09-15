# ADR 046: Entity modules hold only a table's own row shapes; composite payloads live in payload modules

## Status

Accepted

## Context

`app/models/` grew by an unwritten convention: one module per table, holding the table class, its `Base`, and the shapes that move one row of that table in or out — `Create`, `Read`, `Update`, and a `Summary` that adds list-row scalars such as a count or a parent's name. No record adopted that layout. ADR 034 settled the three backend layers and made "one module per table" a `database_ops` rule, but said nothing about `app/models/`, and the entity vocabulary in AGENTS.md only says the twelve tables live there.

The convention held until composite shapes needed a home. Task 006 put the run page's `/state` and `/breakdown` payloads in `practice_card.py` by naming it in a Files line, with no rationale; by the mastery-ledger cycle (task 010) that file held 15 classes, 10 of which describe a run rather than a card, and imported `RunStatus` from `practice_run.py` solely for one of them — a cross-import that was a consequence of the placement, not its cause. `deck.py` held 14: the deck's own shapes plus the batch-edit changeset (`DeckBatchEdit` and its six parts), `DeckCreate` nesting a list of `FieldDefCreate`, and `DeckDetail` nesting `CardRead`. A reader looking for `PracticeRunState` opened `practice_run.py` and found nothing. The browse and statistics surfaces (010 MD-3) were about to add more composite payloads with the same question unanswered.

## Decision

An entity module `app/models/<table>.py` holds the table, its `Base`, and only shapes that are one row of that table going in or out: `Create`, `Read`, `Update`, `Summary`. A `Summary` may add scalars about that one row — a count, a parent's name, a derived fold such as `CardMasteryRead`'s two numbers — never a nested model. Everything else lives in a payload module named after the router it serves, `app/models/<router>_payloads.py`. Two tests decide, in order: any field typed as another model class → payload (`DeckDetail`, `PracticeRunSummary`, `RatingSubmissionResult`); scalar-only but not one row of this module's table → payload (`RunProgress` is a fold over a run, `RatingSubmission` is a flow request, `BreakdownBucket` exists only for the breakdown). Payload modules may import anything under `app/models/`.

At adoption this moves 14 classes out of `practice_card.py` and `practice_run.py` into `practice_run_payloads.py` and 11 (ten classes and the `DeckFieldOrderKey` alias) out of `deck.py` into `deck_payloads.py`, by cut-and-paste: class bodies and docstrings unchanged, so OpenAPI schema names — and therefore the generated frontend types — are byte-identical. Afterward every entity module imports only `app.models.base`, with one principled exception: a table class imported from a sibling for a `Relationship`, as `card.py` imports `CardFieldValue`.

That exception is exactly what makes the rule mechanically checkable. A source-scan guard test asserts that in every module under `app/models/` whose source contains `table=True`, each `from app.models.<sibling> import <name>` resolves to an object carrying a `__table__` attribute — which SQLModel sets on table classes and nothing else. A table class may cross modules; a shape may not. The guard does not police the second, judgment-based test above (a scalar-only shape misfiled in an entity module imports nothing and is invisible to it), and it does not enforce the `<router>_payloads.py` naming; those remain review's job.

## Alternatives considered

### Fold the run payloads into `practice_run.py`

Rejected — fixes the misleading name and leaves the bloat in place: `practice_run.py` becomes a 200-line file mixing a table with two page payloads, and the next cycle's payloads have no better answer.

### Leave the layout alone

Rejected — cheapest, but the cost recurs on every read: the file's name says one thing and its contents another, and each new composite shape is placed by whichever entity file happens to import cleanly.

### Move only `practice_card.py`'s shapes

Rejected — leaves `deck.py`'s composites as the single exception to a rule that is supposed to be general, and a rule with a standing exception is not one a guard can enforce.

### A guard that forbids every sibling import

Rejected — `card.py`'s `Relationship` to `CardFieldValue` needs the table class; forbidding it means rewriting the relationship with string forward references, churn with no connection to this cycle.

### Exempt `card.py` from the guard by name

Rejected — hides the rule's real shape (table classes may cross, shapes may not) behind a special case that the next relationship would have to extend.

### Record the rule and rely on review

Rejected — the convention had already drifted once without anyone noticing; a rule that only holds while review remembers it is the situation this ADR exists to end.

## Consequences

Benefits:

- A page or flow payload is found in the module named after its router; an entity module is exactly the table and its own row shapes, and imports only `base`.
- The coming browse and statistics cycles have a home for their payloads decided in advance.
- The half of the rule that can drift silently through imports is enforced by a test, in the same style as ADR 045's `create_all` guard.

Costs:

- Two more modules under `app/models/`, and `git blame` on the moved classes now points at a move commit before their real history.
- The scalar-only test ("is this one row of this table?") is judgment, not mechanics, and the guard cannot see a misfiled scalar-only shape; review holds that line.
- `<router>_payloads.py` naming is convention only; nothing fails if a payload module is misnamed.
