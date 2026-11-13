# ADR 107: A practice's configuration per deck, copied into a frozen run configuration when each run is cut

## Status

Active

## Context

PDR 039 makes a deck's configuration a part of a practice, never a thing of its own: it has no name, and it is made with its practice, kept with it and gone with it. A practice holds, for each of its decks, the configuration its next run asks that deck by, which the user changes from the practice's page between runs. Every deck of a new practice has a configuration from the start. A run asks each deck as its configuration stood when the run started, to its end, and a completed run's page shows how it asked each deck, without changing it.

PDR 040 has every next run ask each deck by the practice's configurations as they stand.

PDR 047 moves nothing when the user changes a practice's configurations.

A configuration is six columns: the prompt fields every card shows, the prompt fields drawn at random, the answer fields every card shows, the answer fields drawn at random, each an array of field ids, and an array of counts for each of the two random draws. A field id names a `field_def` row of one deck (ADR 009).

Every run belongs to exactly one practice, and the tables of one go through a practice are named for the run (ADR 105).

Today a configuration is a `deck_practice_config` row: a named template of one deck, with routes and an editor of its own. A run copies one per deck into `practice_deck` at its start, under `UNIQUE (practice_run_id, deck_id)`, beside `source_config_id`, a link back to the configuration, and `source_config_name`, its name. Run start also refuses two configurations of one deck with `duplicate_deck`.

`source_config_id` is read by nothing that generates, validates or reruns, and `source_config_name` only names a configuration.

A practice's configuration and a run's copy change at different times: the practice's changes between runs, while a completed run's copy keeps how that run asked, and a run of chosen cards narrows its copy to those cards.

A foreign key with `ON DELETE CASCADE` removes the rows of a deleted deck, and the deletion closure removes a deleted field's id from uuid arrays.

ADR 013 copied a named configuration onto `practice_deck` at run start. ADR 078 held one copy per deck with a constraint and a refusal. ADR 040 and ADR 068 linked a copy to the configuration it came from and to that configuration's name. PDR 039 makes the configuration part of the practice, so this record replaces all four.

## Decision

We will hold a practice's configurations in `practice_configuration`, one row per deck of the practice: `practice_id` and `deck_id`, each `ON DELETE CASCADE`, the six array and count columns, and `UNIQUE (practice_id, deck_id)`. A practice's decks are its `practice_configuration` rows.

We will cut, for every run, one `run_configuration` per `practice_configuration` of its practice, copying the six columns, under `UNIQUE (run_id, deck_id)`. Every card generated for the run, the first batch and every requeue, reads only that frozen row, and nothing changes the row but the removal of a deleted field.

We will change a practice's configuration of a deck only through `PUT /api/practices/{id}/configurations/{deck_id}`, which replaces the whole row after validation and touches no `last_activity_at`. A save reaches the practice's next run and never a run already cut, so the server does not refuse a save while the practice has an active run.

We will drop `deck_practice_config` with its routes and its editor, and `source_config_id` and `source_config_name` from the run's copy. A run reaches the practice it was cut from through `run.practice_id`, and nothing else links a copy to its source.

## Alternatives considered

### One table, with a nullable `run_id` marking a run's copy

Rejected because every read must say which kind of row it wants, and one that forgets mixes them silently.

### `deck_practice_config` kept, with a `practice_id`

Rejected because it keeps a table named for a deck and owned by a practice, with routes and an editor for a thing PDR 039 removes.

### The latest run's copy as the practice's configuration

Rejected because a practice never run has none, and an edit would change a frozen copy.

### One JSON column on `practice`

Rejected because no foreign key would remove a deleted deck, and the deletion closure's scrub works on uuid arrays.

### A run reading the practice's configuration live

Rejected because a save between runs would change a run under way, and a completed run would show a layout it never asked.

### A refusal of a repeated deck beside the constraint

Rejected because it gives a code and a sentence to a case no screen reaches, and states the rule twice.

### A save refused while the practice has an active run

Rejected because a run's copy is cut at its start, so a save cannot reach it, and the refusal would be a code and a sentence for a case only a stale tab reaches.

### A change sent for each field moved

Rejected because the board saves or cancels as a whole.

### The link to the source configuration kept

Rejected because nothing that generates, validates or reruns reads it, and the practice and the deck already name the source.

## Consequences

**Positive**

- The user changes how a practice asks a deck between runs, and no change reaches a run under way or a completed run's record of how it asked.
- The developer reads a practice's decks and how each is asked from one table, and a run's from another, with no flag deciding which kind a row is.
- The developer gets a deck's removal from every practice and every run from foreign keys, with no code.

**Negative**

- The database stores the six columns once per deck for every run, beside the practice's own.
- The developer runs a migration that adds a table and drops a table and two columns.

**Neutral**

- The developer finds a run's copy linked to its source only through the run's practice and the copy's deck.
