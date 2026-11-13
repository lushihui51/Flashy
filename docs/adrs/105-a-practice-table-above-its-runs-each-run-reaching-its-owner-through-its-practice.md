# ADR 105: A practice table above its runs, each run reaching its owner through its practice

## Status

Active

## Context

PDR 035 makes a practice a thing the user keeps: a named set of decks that they run as many times as they like, until they delete it. Each go through a practice is a run, and every run belongs to exactly one practice. A practice can exist before its first run, and a run has no name of its own.

The schema has nothing above `practice_run`. A run carries its own `user_id`, and its per-deck copy, `practice_deck`, and its cards, `practice_card`, hang from it. `mastery_log.practice_run_id` attributes a ledger row to the run it came from.

In `practice_run`, `practice_deck` and `practice_card`, the word "practice" names one go. Some names in the code still say `session` for the same thing.

Every read and write of user data keeps ownership in the query, either by taking the user's id or by being keyed by an id the caller has already scoped, and another user's resource returns 404 (ADR 034).

Every constraint and index name comes from the naming convention in `app/database.py`, and a column rename renames the constraints derived from that column in the same migration (ADR 054). The dev database still names `practice_run`'s primary key, status check and user foreign key after `practice_session`.

The code's names are a namespace of their own, listed beside the user's words in `docs/vocabulary.md` (ADR 069).

ADR 038 named the one-go table `practice_run` and the durable template `deck_practice_config`. Under PDR 035 the durable thing is the practice, so ADR 038's split of names no longer matches the concepts. This record replaces it.

## Decision

We will add a `practice` table holding a kept practice: its user, its name and when it was made. Every run belongs to exactly one practice through a not-null `practice_id` with `ON DELETE CASCADE`.

We will rename every name in which "practice" means one go through a practice: `practice_run` becomes `run`, `practice_deck` becomes `run_configuration`, `practice_card` becomes `run_card`, every foreign key column follows the table it references, and every `session` name that means a run becomes `run`. Models, `db_*` modules, services, routes, frontend modules and the generated types follow. Applied migrations keep the names they were written with. The migration renames every constraint and index to the name the naming convention derives, the names left from `practice_session` included.

We will give `run` no `user_id`. Every read and write of a run, or of a row that hangs from a run, is scoped to its user by joining `practice` and comparing `practice.user_id` in the statement.

## Alternatives considered

### Runs grouped by a shared id, with no `practice` table

Rejected because a practice that has never been run would have nowhere to live.

### ADR 038's names kept, with `practice` added above them

Rejected because `practice_deck` would read as a practice's own configuration of a deck, and `practice_card` as a card of the practice.

### `run_deck` for a run's per-deck copy

Rejected because it names the row by its deck, not by what it holds.

### `attempt` for a run's card row

Rejected because a pending row names an attempt not yet made.

### `run.user_id` kept beside `practice_id`

Rejected because the two owners can disagree, with nothing to catch it.

### `run.user_id` kept, with a composite foreign key to `practice (id, user_id)`

Rejected because the constraint's only job is keeping a copy in step.

## Consequences

**Positive**

- The developer reads whose a table is from its name: a practice's rows start with `practice`, a run's with `run`.
- The developer finds a run's owner in one place, so no run can belong to one user while its practice belongs to another.
- The user can keep a practice they have not yet run.

**Negative**

- The server joins `practice` on every read and write of a run to check its owner.
- The developer reads earlier records, applied migrations and git history in the old names, and maps `practice_run`, `practice_deck` and `practice_card` to `run`, `run_configuration` and `run_card`.
- The developer runs one migration that renames three tables, their foreign key columns and every derived constraint and index.

**Neutral**

- The developer meets "practice" in the code only for the thing the user keeps.
