# ADR 114: A run's day worked out on read in the user's zone, with no stored name

## Status

Active

## Context

PDR 035 gives a run no name of its own: the user knows a run by the day it was run, and never names one. A run's day is written as a date with no time, such as "2026-11-03", and a later run of the same practice on the same day adds the next number in parentheses, such as "2026-11-03 (1)".

Every run belongs to exactly one practice (ADR 105).

PDR 048 lists runs of several practices on Home, at most one completed run of each practice, so Home's list does not hold a practice's other runs of the same day.

Every instant is stamped by the server in UTC, every user-facing date, any calendar-day boundary included, is computed in the user's stored zone at read time, and the zone is never used to store, order or compare an instant (ADR 019). On the frontend, `frontend/src/lib/datetime.ts` is the only module allowed to format a date, held by an ESLint rule (ADR 019).

`run.name` holds a label the client formats from the time at the run's start.

A run's day is the only date the user sees once a run has no name.

`new Date("2026-11-03")` reads the string as midnight UTC, so formatting it in a zone west of UTC prints the day before.

ADR 039 had the client supply a run's name. A run now has none, so this record replaces that part of it.

## Decision

We will store no name on a run: `run.name` is dropped, and starting a run sends none.

We will have every read that returns a run return `day`, the date of `run.created_at` in the user's stored timezone, and `day_index`, the run's place from 0 among its practice's runs of that day ordered by `created_at` then `id`, both worked out in the run's `db_*` read by one window function.

We will have the frontend write a run's day only through `formatRunDay(day, dayIndex)` in `frontend/src/lib/datetime.ts`, which writes `day` as the server sends it, adds the index in parentheses when it is above 0, and never parses `day` into a `Date`. `formatDate` and `formatDateTime` are removed; `userTimeZone()` and the ESLint rule stay.

## Alternatives considered

### The label stored when the run is created

Rejected because it is frozen in the zone of that moment, against computing every user-facing date at read time.

### The client numbering a day's runs from a list

Rejected because Home's list lacks the practice's other runs of the day.

### The day worked out in the browser from the run's instant

Rejected because the browser's day boundary and the server's can disagree after the user's zone changes.

### `formatDate` kept

Rejected because it would be a formatter of instants with no caller.

## Consequences

**Positive**

- The user reads a run's day in their own zone, and a run's label follows them when their zone changes.
- The developer finds every day boundary worked out on the server, and the frontend parsing no date.
- The developer meets one kind of date in the frontend.

**Negative**

- The server works out the day and its index on every read that returns a run.
- The developer runs a migration that drops `run.name`.

**Neutral**

- The user who changes zone can see a run's day, and the numbering of that day's runs, change.
