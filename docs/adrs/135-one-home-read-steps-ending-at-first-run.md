# ADR 135: One Home read, steps ending at first run

## Status

Active

## Context

PDR 057 shows on Home, until the user has started a run, the four steps to a first practice: making a deck, a card and a practice, and starting a run. Each is ticked as soon as its thing exists, and the fourth starts a run of the practice the user made most recently and opens its first card. The steps leave Home once the user has started a run, and never come back, even if the user later deletes everything.

Once the user has started a run, PDR 057 lists runs in two sections: Active, up to three active runs, those the user acted in most recently, newest first, each with its progress; and Recently completed, the three most recently completed runs, newest first, at most one of each practice and none of a practice that has an active run. A completed run's play button starts a new run of its practice and opens it.

PDR 047 makes a run as recent as the last thing the user did in it. A run carries that as `last_activity_at` (ADR 117).

A run's day and its index within the day come from the server (ADR 114), and its N and M from its card rows and counted cards (ADR 113).

Every read that returns a collection returns it whole, in a number of statements fixed regardless of row count, and no endpoint paginates (ADR 091).

Every instant is stamped by the server in UTC, and no write accepts one from the caller (ADR 019). Clerk is the identity provider (ADR 007).

The frontend's queries have a staleness of zero, so Home refetches whenever it mounts (ADR 088).

Deleting a practice, a deck, a field or a card can delete runs and the review history of what it held (ADR 118).

One function, `cut_run` in `app/services/run.py`, cuts every run: a practice's start, a rerun and a run of chosen cards (ADR 112).

`create_practice` in `app/services/practice.py` stamps `app_user.first_practice_at`, `get_home` in `app/services/home.py` ends the steps on it, and `HomeSteps` holds `has_deck` and `has_card` alone.

A completed run's play button on Home already calls `startRun` and opens the run.

The app is not published.

ADR 123 stamped the first time the user made a practice, and ended Home's steps on it. PDR 057 keeps the steps until the user has started a run and adds the step that starts it, so this record restates ADR 123.

## Decision

We will give `app_user` a nullable `first_run_at`, in place of `first_practice_at`: an instant stamped by the server when the user's first run is cut. It records that event: it is not derived from the runs or reviews that exist, and no deletion recomputes or clears it. `cut_run` in `app/services/run.py` writes it while it is null, inside the transaction that cuts the run, so a refused run leaves it unwritten, and nothing else writes it.

We will serve Home from one read, `GET /api/home`, in a number of statements fixed regardless of the user's data. It returns `steps`, null once `first_run_at` is set and until then `has_deck`, `has_card` and `practice_id`, the id of the user's most recently made practice or null; `active_runs`, up to three active runs, newest `last_activity_at` first; and `recent_runs`, up to three completed runs, the latest of each practice by `last_activity_at`, none of a practice with an active run, newest first. Each run carries its id, its practice's id and name, its `day` and `day_index`, its decks' names, its status, and an active run's progress counts or a completed run's N and M.

The third step is ticked when `practice_id` is set, and the fourth step calls `POST /api/practices/{practice_id}/runs` with it and opens the run.

One migration renames the column, sets it to the instant of each user's earliest run, and leaves it null for a user with no run.

## Alternatives considered

### The stamp at the first practice

Rejected because a user with a practice and no run would see no steps and no runs.

### A `first_run_at` beside `first_practice_at`

Rejected because the first would then be written and read by nothing.

### The name `first_practice_at` kept, and stamped at the first run

Rejected because it would say practice and mean run.

### No stamp, with the steps shown while the user has no run or no review

Rejected because deletions remove runs and reviews, so the steps would come back after the user deletes everything.

### A boolean

Rejected because it costs the same and records less.

### Browser storage

Rejected because it is per device and is cleared with site data.

### Clerk's user metadata

Rejected because it puts a product fact in the provider that holds the user's identity.

### A route of its own that picks the practice the fourth step starts

Rejected because it would be a route for one button.

### The client picking the practice from the list of practices

Rejected because it would put a selection rule in TypeScript and load every practice.

### Home built by the client from the lists of runs and practices

Rejected because every run would be loaded to show six, and the selection rules would live in TypeScript.

## Consequences

**Positive**

- The user's steps leave Home for good at their first run, cut on any path, on every device, whatever they delete later.
- The developer decides Home's steps from one column, with no query over runs or reviews.
- The developer who adds another way to start a run writes nothing for the steps, since every run is cut by the one function that stamps.
- The developer finds Home's selection of runs, and the practice its fourth step starts, in one read on the server.

**Negative**

- The developer keeps one endpoint shaped to one page, which changes whenever Home's rows change.
- The developer's dev-database user who ran a practice and then deleted it sees the steps again, since the migration finds no run to stamp from.

**Neutral**

- The user who has made a practice and not yet run it sees the steps on Home, with the fourth one left.
