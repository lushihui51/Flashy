# ADR 011: Append-only review_log as the mastery source of truth

## Status

Accepted

## Context

Mastery (how well a user knows a given field of a given card) could be stored as
primary state, updated in place every time the user rates a card. That's the
obvious shape. But it has a fatal problem for an app that expects to tune its
scoring algorithm over time: if a mastery value is primary state, changing how
mastery is computed means somehow reinterpreting every existing stored value under
new semantics — a lossy, unverifiable migration.

Separately, a naive eager design would create a `card_field_mastery` row for every
`(card, field_def)` pair the moment a card is created, regardless of whether that
pairing is ever actually reviewed — multiplying row count by (cards × fields) up
front for pairs nobody may ever touch.

## Decision

`review_log` is the source of truth: append-only, no `UPDATE`, no `DELETE`, ever —
not in application code, not in tests, not in fixtures. `card_field_mastery` is a
disposable cache, fully rebuildable from `review_log`, with rows created lazily —
only on first review of a given `(card_id, field_def_id)` pair.

**Why the log is authoritative, not the cache:** `rebuild_mastery`
(`app/services/mastery.py:152-163`) clears `card_field_mastery` and replays every
`review_log` row, oldest first, through **the exact same `apply_rating` primitive**
the live incremental write path uses (`app/services/mastery.py:23-47`) — not a
separately-implemented parallel formula. This is what makes "changing strategies is
not a migration, it's a rebuild" (`app/services/mastery.py:157-158`) literally true,
and it's what a property test verifies directly: generate a random review sequence,
apply it incrementally, snapshot `card_field_mastery`, run `rebuild_mastery`, assert
the two states are identical within float tolerance. That test is the reason the log
exists as a design — if arithmetic could live anywhere else, incremental writes and
a later rebuild could silently diverge.

**Why lazy creation is safe:** a missing `card_field_mastery` row means `None` all
the way up the stack, not zero and not a stored prior — `field_score` (the
`MasteryStrategy` protocol, `app/mastery/strategy.py:43-45`) returns `None` for a
missing state, and `card_score` decides how to fold that into a card-level
aggregate. Every query that needs "all fields of this card" must drive from
`field_def` and `LEFT JOIN` mastery — driving a query *from* `card_field_mastery`
is treated as a bug, because an absent row is a meaningful fact ("never reviewed"),
not a gap to be backfilled. Eagerly creating a row at some default value before any
review exists would assert a mastery value not derived from any log row, which is
exactly what "disposable cache" rules out.

**Why a `review_group_id`'s rows must be logged atomically:** one `review_group_id`
is one appearance — a bundle of every rated answer field plus the prompt fields
shown alongside them. Breadth (how many answer fields a prompt was shown alongside
in that one appearance) is a property of the *whole group*, and it changes the
weight of the prompt-side mastery update, not its target — it can't be decided one
log row at a time. If a group's rows could be written across more than one
transaction, a live incremental write (computed against however many rows existed
at that instant) could permanently disagree with what a later `rebuild_mastery`
computes once the group is complete.

Mechanism enforcing this (`app/database_ops/review_log.py`, `db_log_review_group`):
a Postgres advisory lock scoped to the group (`pg_advisory_xact_lock(hashtext(...))`
— chosen over `SELECT ... FOR UPDATE` because there's no row to lock yet for a
brand-new group), comparing the full set of `field_def_id`s already on record
against what's submitted (not a row-count delta, which a subset submission could
satisfy without actually matching), yielding one of three outcomes: `NEW` (writes
the rows), `RETRY` (the exact same field set is already logged — writes nothing,
and does **not** re-blend mastery, because the mastery write that happened when the
group was first logged already reflects it), or a raised `ReviewGroupInconsistent`
for anything else. A `UNIQUE(review_group_id, field_def_id)` constraint plus
`ON CONFLICT DO NOTHING` on insert is the database-level idempotency backstop.

## Alternatives considered

### Store mastery as primary state, updated in place

Rejected — see Context. Makes algorithm changes a lossy migration instead of a
cheap replay, and removes the ability to prove incremental writes and a full
recompute agree.

### Eagerly create a mastery row for every (card, field) pair at card-creation time

Rejected. Would multiply row count by cards × fields regardless of actual review
activity, and would materialize a value with no basis in any log row — a direct
violation of "disposable cache, fully rebuildable from the log."

## Consequences

Benefits:

- A client-side retry (e.g. a double-submitted rating after a flaky network) is
  trivially safe — mastery's correctness is defined entirely in terms of what's in
  the log, not in terms of how many times an update function happened to run.
- Swapping the scoring algorithm is a rebuild, not a migration.
- An absent mastery row is informative ("never reviewed"), not ambiguous.

Costs:

- `rebuild_mastery` is explicitly accepted as slow — replaying a full log in Python
  is strictly slower than any SQL-side recomputation could be, and that cost is
  accepted in exchange for provable correctness.
- The read side pays a fan-out cost the write side avoids: `card_mastery` fans out
  N×F rows (cards × fields) to Python on every read that needs it, which the
  rewrite's own deferred-work notes flag as the first place a whole-library
  dashboard would need a materialized view.
