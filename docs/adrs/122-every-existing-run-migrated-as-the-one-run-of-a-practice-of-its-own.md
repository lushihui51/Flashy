# ADR 122: Every existing run migrated as the one run of a practice of its own

## Status

Active

## Context

PDR 035 gives every run to one practice, and a practice a name. PDR 039 keeps in every practice the configurations it was made with. Existing names are kept, and a practice's name is unique among its user's practices, a name another practice has taking the next untaken number in parentheses, such as "Cycle 032 T3 judgement (1)" (ADR 115).

Every run belongs to a practice through `practice_id`, and the run tables are renamed for the run (ADR 105). A practice holds one configuration per deck, a run's copies are cut from them, and `deck_practice_config`, `source_config_id` and `source_config_name` are dropped (ADR 107). A run of chosen cards narrows each copy by `card_ids` (ADR 112). A run carries no name (ADR 114). A run carries `last_activity_at`, the last of its start, its ratings and its end (ADR 117). A run's count of the cards it could ask is its `run_counted_card` rows (ADR 113).

Nothing links a rerun to the run it came from.

A whole run's card rows are the cards it could ask at its start, less those deleted since.

The dev database holds 31 runs, 10 of them active, one name held by two runs, 3 copies narrowed to chosen cards and no `deck_practice_config` row. Nothing is in production.

`alembic upgrade` is the only path by which a persistent database's schema changes (ADR 045).

## Decision

We will move every existing run into a practice of its own, in one migration and one transaction. For each run, the migration:

- creates a practice with the run's user, the run's name and its `created_at`, a later practice whose name its user's earlier one already has taking the next untaken number in parentheses;
- gives the practice one `practice_configuration` per copy of the run, with the copy's six arrays;
- sets the run's `last_activity_at` to the later of its `created_at` and its latest review's `reviewed_at`;
- writes the run's `run_counted_card` rows as the distinct cards of its `run_card` rows.

The migration then drops `run.name`, applies ADR 105's renames, and drops `source_config_id`, `source_config_name` and `deck_practice_config`.

## Alternatives considered

### Runs grouped into one practice by a shared set of decks and arrays

Rejected because it is a guess that can merge practices the user made apart.

### The migration aborting on a name two runs share

Rejected because the dev database holds one.

## Consequences

**Positive**

- The user keeps every existing run, with its summary, under a practice named as the run was.
- The user finds no two runs merged into one practice that they ran apart.

**Negative**

- The user finds one practice for each past run, reruns of one practice included, with no way to merge them.
- The user's existing runs of chosen cards read M as their chosen cards, and every other existing run reads M as the cards it holds rows for, since what each could ask at its start is not stored.
- The developer dry-runs the migration on a copy of the dev database, and no downgrade rebuilds the dropped names or tables.

**Neutral**

- The developer finds every migrated practice made at its run's start, with its run as its only one.
