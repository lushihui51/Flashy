# ADR ???: Use PostgreSQL for database

## Status

Accepted

## Context

Flashy needs to store data like subjects, decks and flashcards which should persist across sessions.

Attributes in an entity are mostly basic types with the exceptions of a few user defined collections, for example a flashcard's fields, and which fields are to be shown / hide in a practice session. Moreover, none of the collections, are to be modified. However, for each flashcard under a particular deck, its field should stay consistent with the rest of the cards in that deck because each practice session performed on a deck assumes it.

Joins are important, for example for fetching all flashcards in a deck, and all decks in a subject. Sorting is needed to determine what flashcards are shown next in a practice session, for example sorting by user confidence.

Considered alternatives were SQLite and NoSQL databses like Firestore.

## Decision

I will use PostgreSQL as Flashy's database, with SQLModel handling the ORM layer. PostgreSQL is chosen specifically because it is a realtional database (good with joins and sorts) that has efficient JSONB/ARRAY columns for the immutable user-defined collections.

## Consequences

Joins and sorting are efficient and expressed directly in SQL rather than in application code. Because collections live in JSONB and ARRAY columns, the remaining attributes are fixed and structured, so PostgreSQL enforces data integrity on everything outside those columns.

Costs accepted:

- PostgreSQL cannot enforce the constraint that all flashcards within a deck share the same fields, since the fields live inside JSONB. This constraint is instead enforced at the application layer.
- Schema evolution on the relational columns requires migrations. For example, adding new attributes to a subject to track status.
- Running PostgreSQL locally and in production is more operational overhead than an embedded database like SQLite.
