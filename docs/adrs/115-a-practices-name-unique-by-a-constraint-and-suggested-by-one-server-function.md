# ADR 115: A practice's name unique by a constraint, and suggested by one server function

## Status

Active

## Context

PDR 035 makes a practice a named set of decks the user keeps. A practice's name is unique among the user's practices, as PDR 033 makes a deck's among their decks, and a typed name another practice already has is refused beside the Name input, on New practice and on Edit practice.

New practice shows, in grey while the user has typed nothing, the names of its decks in the order picked, joined by " + ", such as "Commands + Ports", and a practice created with Name blank takes that name. A suggested name another practice already has adds the next untaken number in parentheses, such as "Ports (1)". The suggestion shows exactly the name Create gives, number included.

Every practice belongs to one user (ADR 105).

A deck's name clash is refused by a unique constraint and a code, `deck_name_taken`.

Every refusal a user reaches carries a code, and the frontend chooses the sentence by that code (ADR 070).

A staged insert that reports a constraint failure by returning `None` is named `db_try_stage_<verb>_<noun>` (ADR 055). Constraint names follow the naming convention, the first column naming a unique constraint (ADR 054).

The frontend reads server data through TanStack Query, keyed by resource (ADR 088).

## Decision

We will hold a practice's name unique among its user's practices with `UNIQUE (user_id, name)` on `practice`, named `uq_practice_user_id`, comparing names as stored. Creating and renaming a practice turn an `IntegrityError` on it into `Refusal("practice_name_taken")`, answered as a 400 with the coded detail.

We will work out a new practice's suggested name in one function, `suggest_practice_name(db, user_id, deck_ids)`: the picked decks' names in the order picked, joined by " + ", with the first free number from 1 added in parentheses when that name is taken.

New practice reads the suggestion from `GET /api/practices/suggested-name?deck_ids=` through TanStack Query, keyed by the picked decks. A create with no name calls the same function inside its transaction, and when `db_try_stage_create_practice` returns `None` on the name, works the name out again once.

## Alternatives considered

### A service check alone

Rejected because two concurrent creates both pass it.

### The service check beside the constraint

Rejected because it states the rule twice.

### The client working out the grey text

Rejected because the rule would live in two languages and drift silently.

### The client always sending the name

Rejected because a race would refuse a name the user never typed.

## Consequences

**Positive**

- The developer gets one code for a name clash, whichever way a practice is named.
- The user sees in grey exactly the name Create would give.

**Negative**

- The server answers one more request each time the picked decks change.
- The developer handles a blank create that loses a race, which works its name out once more.

**Neutral**

- The user can keep two practices whose names differ only in letter case.
