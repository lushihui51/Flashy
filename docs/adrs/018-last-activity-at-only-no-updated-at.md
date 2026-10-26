# ADR 018: `last_activity_at` as the sole recency column — no `updated_at`

## Status

Active

## Context

`subject` and `deck` need a sort key for "most recently relevant first" ordering — every list of subjects or decks in the app (library tabs, subject page, pickers) is ordered by it. The value has to bubble: creating, deleting, or moving a deck should bump its subject too, not just the deck's own row, or a subject with brand-new decks would sort as if nothing had happened to it.

The initial design shipped two separate timestamp columns instead of one:

- `last_activity_at` — the sort key. Bumps on the row's own edits and on bubbled child activity, written only by one helper, `touch()` (`app/services/activity.py`).
- `updated_at` — a conventional audit field. Bumps only when the row's own columns change, never bubbled, meant to answer "when was this specific row last edited."

The split existed because the two columns have genuinely different bubbling semantics, and collapsing them into one column would have made "sort key" and "audit trail of this row's own edits" the same number, which they aren't. The first implementation attempt tried to get `updated_at` for free via SQLAlchemy's column-level `onupdate=utcnow`, and it broke immediately: `onupdate` fires on _any_ UPDATE to the row, not only ones that changed that specific column, so a `touch()`-only write (bumping `last_activity_at` on a deck whose own columns hadn't changed — e.g. a card was added to it) was wrongly bumping `updated_at` too. The fix was to stop using `onupdate` and set `updated_at` explicitly, by hand, in every own-column-edit call site, alongside its `touch()` call.

That fix shipped and worked. But nothing was ever built that read `updated_at`: no endpoint sorted by it, no frontend component displayed it, no test asserted anything about it beyond its own bubbling rules. A grep across the entire codebase (backend and frontend) confirmed zero consumers — the column was written on every own-column edit, returned by every subject/deck read endpoint, and never once read back by anything.

## Decision

We will drop `updated_at` from `subject` and `deck`; `last_activity_at` is the only recency column either table carries, written only by `touch()`. At adoption, one migration drops the column from both tables, the explicit `updated_at` writes go, and the two tests that proved its isolation are deleted.

## Alternatives considered

### Keep `updated_at`, since removing it later is easy to get wrong

Considered and rejected. Unused columns don't get easier to justify by aging in place — every future own-column-edit call site would have kept paying the cost of setting it by hand (a manual step that's easy to forget, since nothing would break immediately if it were skipped), for a value nothing consumes. The migration risk of removing it now, while only two tables and a handful of call sites are affected, is strictly lower than removing it after more code comes to depend on it existing.

### Collapse to one column, let `last_activity_at` serve as the audit field too

Rejected — this is what the original two-column split was avoiding. `last_activity_at` bubbles from child activity (a card added to a deck bumps the deck) and would give a misleading answer to "when did this row's own fields last change." Since nothing actually needs that answer today, the honest fix is to not carry a column for it, not to overload the one column that remains with two meanings.

## Consequences

**Positive**

- The developer keeps one fewer column correct on every own-column edit; `touch()` is the single write path for recency on these tables.
- The developer cannot rediscover the `onupdate` foot-gun, since nothing is left to wire it to.

**Negative**

- The developer who later needs an audit trail writes a migration and a new write path, instead of finding a column already there.

**Neutral**
