# ADR 001: PostgreSQL as the database

## Status

Active

## Context

Flashy needs to store data like subjects, decks and flashcards which should persist across sessions.

Attributes in an entity are mostly basic types with the exceptions of a few user defined collections, for example a flashcard's fields, and which fields are to be shown / hidden in a practice session. Moreover, none of the collections are to be modified. However, for each flashcard under a particular deck, its field should stay consistent with the rest of the cards in that deck because each practice session performed on a deck assumes it.

Joins are important, for example for fetching all flashcards in a deck, and all decks in a subject. Sorting is needed to determine what flashcards are shown next in a practice session, for example sorting by user confidence.

Considered alternatives were SQLite and NoSQL databases like Firestore.

PostgreSQL is a relational database, so joins and sorts are native to it, and it has JSONB and ARRAY columns for the collections.

## Decision

We will use PostgreSQL as Flashy's database.

## Alternatives considered

### SQLite

Rejected because it has weaker JSON/ARRAY support and no natural path to production hosting.

### Firestore

Rejected because Flashy's data are predominantly relational, and joins and cross-entity queries becomes application-side work.

## Consequences

**Positive**

- The developer writes joins and sorting in SQL rather than in application code.
- Because collections live in JSONB and ARRAY columns, the developer gets PostgreSQL's integrity constraints on every other attribute.

**Negative**

- The developer writes a migration for every change to a relational column, for example a new attribute on a subject.
- The developer runs a PostgreSQL server locally and in production, more operational overhead than an embedded database.

**Neutral**
