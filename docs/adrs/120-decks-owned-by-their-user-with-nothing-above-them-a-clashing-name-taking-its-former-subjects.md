# ADR 120: Decks owned by their user with nothing above them, a clashing name taking its former subject's

## Status

Active

## Context

PDR 033 has the user make decks and nothing above them, lists every deck in Your library as one list, keeps a deck's name unique among the user's decks, and takes away the subjects the user has made while keeping every deck they held. A deck whose name another of the user's decks also has takes its former subject's name in parentheses after its own, such as "Verbs (Spanish)", and a subject's description and picture go with it.

`deck.subject_id` places every deck in a subject, `uq_deck_subject_id` holds a deck's name unique within its subject, and a deck reaches its owner only through `subject.user_id`. A subject's name is unique among its user's subjects.

Every read and write of user data keeps ownership in the query (ADR 034).

`alembic upgrade` is the only path by which a persistent database's schema changes (ADR 045).

Every constraint name comes from the naming convention, a unique constraint named by its first column (ADR 054).

The dev database holds three deck names shared within one user, over six decks, and no deck name with parentheses. Nothing is in production.

## Decision

We will give `deck` a not-null `user_id`, `fk_deck_user_id_app_user`, and hold a deck's name unique among its user's decks with `UNIQUE (user_id, name)` as `uq_deck_user_id`, in place of `uq_deck_subject_id`. We will drop `deck.subject_id` and the `subject` table. Every read and write of a deck is scoped by `deck.user_id` in the statement.

We will move the data in one migration, in one transaction. It fills `deck.user_id` from the deck's subject; renames every deck whose name another deck of its user has to its own name followed by its subject's name in parentheses; adds `uq_deck_user_id`, rolling back whole if a clash remains; and drops `deck.subject_id`, `uq_deck_subject_id` and `subject`.

## Alternatives considered

### One hidden subject per user

Rejected because it keeps a table that is no product concept, and holds a deck's name unique per user only while each user has one subject.

### A number added on a clash the rename leaves

Rejected because it is a naming rule no product decision sets, for a case no database holds.

### The renames done in application code

Rejected because only an alembic migration changes a persistent database.

## Consequences

**Positive**

- The developer reads a deck's owner and its unique name off the deck's own row.
- The server scopes every deck read with one comparison instead of a join to `subject`.

**Negative**

- The user whose deck shared a name with another of their decks finds it renamed after its former subject.
- The user loses every subject's description and picture, which no downgrade restores.
- The developer dry-runs the migration on a copy of the dev database before applying it.

**Neutral**

- The developer finds no subject anywhere in the schema, the API or the frontend.
