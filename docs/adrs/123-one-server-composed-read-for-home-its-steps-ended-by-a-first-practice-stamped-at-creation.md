# ADR 123: One server-composed read for Home, its steps ended by a first practice stamped at creation

## Status

Active

## Context

PDR 048 shows on Home, until the user has made a practice, the three steps to a first one, each ticked as soon as its thing exists, and the steps never come back, even if the user later deletes everything. Once the user has made a practice, Home lists runs in two sections: Active, up to three active runs, those the user acted in most recently, newest first, each with its progress; and Recently completed, the three most recently completed runs, newest first, at most one of each practice and none of a practice that has an active run. Each run's row names its day, its practice and its decks, and its details give an active run's progress or a completed run's count of cards.

PDR 047 makes a run as recent as the last thing the user did in it. A run carries that as `last_activity_at` (ADR 117).

A run's day and its index within the day come from the server (ADR 114), and its N and M from its card rows and counted cards (ADR 113).

Every read that returns a collection returns it whole, in a number of statements fixed regardless of row count, and no endpoint paginates (ADR 091).

Every instant is stamped by the server in UTC, and no write accepts one from the caller (ADR 019). Clerk is the identity provider (ADR 007).

The frontend's queries have a staleness of zero, so Home refetches whenever it mounts (ADR 088).

Deleting a practice, a deck, a field or a card can delete runs and the review history of what it held.

`app_user.first_practice_at` is stamped today when a run starts.

ADR 087 stamped the first time the user made a practice, which meant starting a run. A practice is now created before it is run, and Home's steps end once one is created, so this record restates ADR 087.

## Decision

We will give `app_user` a nullable `first_practice_at`, an instant stamped by the server when the user first creates a practice. It records that event: it is not derived from the practices or reviews that exist, and no deletion recomputes or clears it. `POST /api/practices` writes it while it is null, in the practice's own transaction, so a refused create leaves it unwritten, and starting a run writes nothing to it.

We will serve Home from one read, `GET /api/home`, in a number of statements fixed regardless of the user's data. It returns `steps`, `has_deck` and `has_card`, null once `first_practice_at` is set; `active_runs`, up to three active runs, newest `last_activity_at` first; and `recent_runs`, up to three completed runs, the latest of each practice by `last_activity_at`, none of a practice with an active run, newest first. Each run carries its id, its practice's id and name, its `day` and `day_index`, its decks' names, its status, and an active run's progress counts or a completed run's N and M.

## Alternatives considered

### Whether any practice, or any review, exists

Rejected because deletions remove practices and reviews, so the steps would come back after the user deletes everything.

### A boolean

Rejected because it costs the same and records less.

### Browser storage

Rejected because it is per device and is cleared with site data.

### Clerk's user metadata

Rejected because it puts a product fact in the provider that holds the user's identity.

### The stamp kept at a run's start

Rejected because a practice made and not yet run would leave the steps on Home.

### Home built by the client from the lists of runs and practices

Rejected because every run would be loaded to show six, and the selection rules would live in TypeScript.

## Consequences

**Positive**

- The user's steps leave Home for good when they create their first practice, on every device, whatever they delete later.
- The developer decides Home's steps from one column, with no query over practices or reviews.
- The developer finds Home's selection of runs in one read on the server, returning exactly the runs PDR 048 lists.

**Negative**

- The developer who adds another path that creates a practice must write the column, and a path that forgets leaves the steps on Home with no error.
- The developer keeps one endpoint shaped to one page, which changes whenever Home's rows change.

**Neutral**

- The user who has created a practice and not yet run it sees no steps and no runs on Home.
