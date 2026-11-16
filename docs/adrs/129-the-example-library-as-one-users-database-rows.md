# ADR 129: The example library as one user's database rows

## Status

Active

## Context

PDR 053 shows every visitor who is not logged in, a guest, one example library, the same for all, and lets them change nothing. It fills the library with decks, cards, practices, completed runs and runs left partway, so that every page of the app has something to show.

The example library's runs are to show the days they were really run. It is to hold three runs left partway, each at a state the owner names: one at a first attempt with no card failed, one at a retry with others still to come back, and one at a first attempt with cards retried earlier. Its two decks are to hold 50 cards of five fields and 20 cards of three, 310 values in all.

Every page reads through fourteen `GET` routes, several of them composed on the server for one page (ADR 125).

The server works out mastery (ADR 116), the cutting of a run (ADR 112), what a deletion takes with it (ADR 118) and a run's day (ADR 114).

Ownership hangs from `app_user.id`: a deck carries its user (ADR 120), a practice carries its user and a run reaches its owner through its practice (ADR 105). A service takes the user's id and scopes every statement by it (ADR 034).

An `app_user` row is found by `clerk_user_id`, the id in a verified Clerk token (ADR 007), a column that is not null and unique. Clerk offers no user without credentials, and gives no session without them.

Every instant is the server's clock, and no write takes an instant from its caller (ADR 019).

A run's queue is ordered by mastery and by random draw (ADR 036, ADR 037).

`copy_deck` copies a deck's fields, cards and values, and never its mastery, review rows, practices or runs (ADR 108).

Tests build their own database (ADR 045), and nothing deploys the app yet.

The rows of one user's library span twelve tables.

## Decision

We will hold the example library in the database, as the rows of one `app_user` that has no Clerk identity, the example user, and read it through the same read routes, services and database operations as a logged-in user's own.

We will make `app_user.clerk_user_id` nullable, hold at most one row without it by a partial unique index, and read that row with `db_read_example_app_user`. A database with no such row has no example library.

We will make the example library by using the app as an account, in each database that is to show it. A script, `app/scripts/example_user.py`, then takes the Clerk identity off that account's `app_user` row, which makes the row the example user, and gives an identity back when the library is to be edited. The repository holds no copy of the library.

## Alternatives considered

### An `app_user` of its own for each guest

Rejected because a guest makes nothing under PDR 053, and each guest's row would need the example copied into it, runs and reviews included, which `copy_deck` leaves out.

### The reads' responses recorded once and served by the frontend as files

Rejected because a response whose shape changes would be recorded again by hand, and a field whose meaning changes under the same type would keep its old answer with no test failing.

### Read routes of its own for the example

Rejected because fourteen reads would be written twice.

### A TypeScript implementation answering the API in the browser

Rejected because every rule the server works out would be written twice and drift with no test failing.

### The backend's Python run in the browser, on a PostgreSQL built for the browser

Rejected because both would download before the first page works.

### Tables or a schema apart from accounts' data

Rejected because every migration would run twice.

### The example as a Clerk user

Rejected because Clerk gives no session without credentials.

### A script in the repository building the whole library through the services

Rejected because every run would be stamped the moment the script ran unless the script wrote instants itself, and the states the owner names would have to be steered through a queue ordered by mastery and random draw.

### A script writing the decks and cards from a file, with the runs made by hand

Rejected because the cards would live in the file and in the database, and a correction made in one would be missing from the other.

### The library made once and carried between databases as a dump

Rejected because it spans twelve tables and would go stale with every migration.

### A flag on an account that keeps its Clerk identity

Rejected because whoever holds that account's password would change what every guest sees, and the account's own requests would move its stored zone, and with it the days its runs show.

### A sentinel string in `clerk_user_id`

Rejected because it leans on Clerk never issuing that string.

### The example user's id in configuration

Rejected because an environment that sets it wrong would show another user's library to every guest with nothing failing.

## Consequences

**Positive**

- The guest's pages are drawn by the reads a logged-in user's are, so the developer's change to a read reaches the example library with no further work.
- The guest reads on the example library's runs the days the owner ran them.
- The developer's change to the schema carries the example library with every other row.

**Negative**

- The developer keeps every path that writes away from the example user's rows, since a guest sees whatever they hold.
- The owner types the library's 310 values and runs its practices by hand, in production before publishing, and again in any other database that is to show it.
- The guest finds no example library in a database where nobody has made one, or while the library is being edited, since its row then has an identity.
- The owner who loses the production database loses the library, since the repository holds no copy.

**Neutral**

- The developer finds one `app_user` row with no Clerk identity.
