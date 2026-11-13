# ADR 117: `last_activity_at` on decks, cards and runs, with practices ordered by their runs

## Status

Active

## Context

PDR 047 puts first, in every collection the user meets, what the user changed most recently, from the moment the change is saved, wherever it was made. A card changes when the user adds or edits it, and a deck when the user adds or edits it or one of its cards. Practicing changes no deck or card. A run is as recent as the last thing the user did in it: starting it, rating a card in it, or ending it. Practices are listed by the last thing the user did in any of their runs, and a practice never run by when it was made; renaming a practice or changing its configurations moves it nowhere. A change that reaches many items at once moves none of them.

A column-level `onupdate` stamps every update of a row, whether or not the row's own content changed.

`touch()` in `app/services/activity.py` writes `last_activity_at`, makes no session call, and every statement, ordering included, is a `db_*` function (ADR 055).

Every instant is stamped by the server in UTC (ADR 019).

A card is updated by id through its own route or through the batch edit's card update (ADR 079). Several writes reach every card of a deck at once: the batch edit's field operations, every path that adds a field, and the deletion closure's scrubs.

Every run belongs to exactly one practice (ADR 105). A run is cut by one function (ADR 112), a rating is submitted on its current card, and ending it deletes its pending rows and marks it completed, as does the read that finds nothing pending (ADR 111). A practice's configuration changes by a save that touches nothing (ADR 107).

A run's `run_card` rows and the `review_log` rows of their ratings cascade with their card.

ADR 018 made `last_activity_at` the only recency column on subjects and decks, and ADR 096 added it to cards and configurations. Subjects and configurations are gone and runs need it, so this record restates both.

## Decision

We will keep `last_activity_at` as the only recency column, on `deck`, `card` and `run`, written only by `touch()` in `app/services/activity.py`. No table carries `updated_at`, the database stamps no column on update, and a practice carries no recency column of its own.

We will touch a card when it is created and when it is updated by id, through its own route or through the batch edit's card update. A write that reaches many cards at once touches none of them.

We will touch a run when it is cut, on every rating submitted in it and when it is ended, and on nothing else, its completion on read included.

We will order a deck's cards by `last_activity_at` descending, then by id, and runs by `last_activity_at` descending, then by id. We will order practices on read by the latest `last_activity_at` of their runs, or their `created_at` when they have none, descending, then by id, served by an index `ix_run_practice_id` on `run (practice_id, last_activity_at)`. The frontend shows each list in the order it receives it and sorts nothing.

## Alternatives considered

### An `updated_at` audit column beside it

Rejected because nothing reads it, and every write of a row's own content would have to set it by hand.

### A separate `edited_at`

Rejected because it is a second recency column, which leaves the next collection to pick one and needs a writer and a guard of its own.

### A stamp the database sets on every update of the row

Rejected because a field change would then reorder the whole deck.

### `created_at` alone

Rejected because an edit would move nothing.

### A run's recency worked out from its ratings and an end time

Rejected because deleting a card deletes its ratings, so the runs that rated it would move.

### A stored `practice.last_activity_at`

Rejected because a run deleted by a deck's deletion would leave it stale.

## Consequences

**Positive**

- The developer has one column and one writer ordering every collection PDR 047 orders by recency.
- The user's runs move only by what they do in them, and deleting a card moves none of them.
- The developer keeps nothing in step for a practice's place, which follows its runs.

**Negative**

- The developer who adds a write that is the user's activity on a deck, a card or a run must call `touch()`, and a missed call leaves the item where it was with no error.
- The server aggregates every practice's runs to order a list of practices.
- The developer runs a migration that adds the column to `run` and the index.

**Neutral**

- The developer finds that renaming a practice or saving its board writes no recency at all.
