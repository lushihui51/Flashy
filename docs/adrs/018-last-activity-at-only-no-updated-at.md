# ADR 018: `last_activity_at` as the sole recency column — no `updated_at`

## Status

Accepted

## Context

`subject` and `deck` need a sort key for "most recently relevant first" ordering — every list of subjects or decks in the app (library tabs, subject page, pickers) is ordered by it. The value has to bubble: creating, deleting, or moving a deck should bump its subject too, not just the deck's own row, or a subject with brand-new decks would sort as if nothing had happened to it.

The initial design (Phase 5.4 of `docs/plans/003-frontend-rebuild-creation-flows.md`, D13) shipped two separate timestamp columns instead of one:

- `last_activity_at` — the sort key. Bumps on the row's own edits and on bubbled child activity, written only by one helper, `touch()` (`app/services/activity.py`).
- `updated_at` — a conventional audit field. Bumps only when the row's own columns change, never bubbled, meant to answer "when was this specific row last edited."

The split existed because the two columns have genuinely different bubbling semantics, and collapsing them into one column would have made "sort key" and "audit trail of this row's own edits" the same number, which they aren't. The first implementation attempt tried to get `updated_at` for free via SQLAlchemy's column-level `onupdate=utcnow`, and it broke immediately: `onupdate` fires on _any_ UPDATE to the row, not only ones that changed that specific column, so a `touch()`-only write (bumping `last_activity_at` on a deck whose own columns hadn't changed — e.g. a card was added to it) was wrongly bumping `updated_at` too. The fix was to stop using `onupdate` and set `updated_at` explicitly, by hand, in every own-column-edit call site, alongside its `touch()` call.

That fix shipped and worked. But nothing was ever built that read `updated_at`: no endpoint sorted by it, no frontend component displayed it, no test asserted anything about it beyond its own bubbling rules. A grep across the entire codebase (backend and frontend) confirmed zero consumers — the column was written on every own-column edit, returned by every subject/deck read endpoint, and never once read back by anything.

## Decision

Drop `updated_at` from `subject` and `deck` entirely. `last_activity_at` is the only recency column either table carries.

- Migration `d99d2883e31f` drops the column from both tables (down-revision of `053542e7d50b`, the migration that originally added both columns — a new migration, not an amendment, per this repo's convention of never editing an already-applied one).
- Every explicit `row.updated_at = utcnow()` call site removed (`db_update_subject`, `apply_deck_batch_edit`); `touch()` is now the only writer of any timestamp on these two tables besides `created_at`.
- The two tests that existed solely to prove `updated_at`'s audit-only isolation (`test_field_write_does_not_change_deck_updated_at`, `test_card_edit_does_not_change_deck_updated_at`) were deleted outright rather than adapted — the invariant they enforced no longer has a column to enforce it on.

If a genuine audit-trail need shows up later — an actual UI or export that wants "when was this row's own data last edited," as distinct from "when did anything under it last happen" — the column can be reintroduced then, built against a real consumer instead of speculatively ahead of one.

## Alternatives considered

### Keep `updated_at`, since removing it later is easy to get wrong

Considered and rejected. Unused columns don't get easier to justify by aging in place — every future own-column-edit call site would have kept paying the cost of setting it by hand (a manual step that's easy to forget, since nothing would break immediately if it were skipped), for a value nothing consumes. The migration risk of removing it now, while only two tables and a handful of call sites are affected, is strictly lower than removing it after more code comes to depend on it existing.

### Collapse to one column, let `last_activity_at` serve as the audit field too

Rejected — this is what the original two-column split was avoiding. `last_activity_at` bubbles from child activity (a card added to a deck bumps the deck) and would give a misleading answer to "when did this row's own fields last change." Since nothing actually needs that answer today, the honest fix is to not carry a column for it, not to overload the one column that remains with two meanings.

## Consequences

Benefits:

- One fewer column to keep correct on every future own-column-edit path — `touch()` is the single write path for timestamp bookkeeping on `subject`/`deck`, with no parallel hand-set column to forget.
- Removes the historical `onupdate` foot-gun from the schema entirely — there's nothing left that a future contributor could plausibly try to wire up with `onupdate` and rediscover the same bug.

Costs:

- If an audit-trail need does show up later, this is a schema migration and a new write-path change rather than something already sitting there unused. Judged acceptable: the column sat unused since it shipped, so there was no evidence a real need was imminent.
