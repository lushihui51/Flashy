# ADR 087: A server-stamped first practice on the user, for Home's steps

## Status

Superseded by ADR 123

## Context

Home shows the five steps to a first practice until the user has made a practice, and the steps never come back, even after the user deletes everything (PDR 016).

A practice is created on three paths: run start, rerun and a practice of chosen cards, and a refused practice persists nothing (ADR 085).

`app_user` holds `clerk_user_id` and `timezone` only.

A user can delete a practice, and deleting a deck, a field or a card can delete practices and the review history of what it held (ADR 092, ADR 048).

Deleting a persistent entity recomputes every value derived from the deleted records (ADR 092).

Every deletion goes through one closure (ADR 093).

Every instant is stamped by the server in UTC, and no write accepts one from the caller (ADR 019).

Clerk is the identity provider, and its token's user id is the ownership key (ADR 007).

## Decision

We will give `app_user` a nullable `first_practice_at`, an instant stamped by the server when the user first makes a practice. It records that event: it is not derived from the practices or reviews that exist, and no deletion recomputes or clears it.

We will have every path that creates a practice write it while it is null, in the practice's own transaction, so a refused practice leaves it unwritten.

We will have Home show its steps exactly while it is null.

We will fill it, in the migration that adds it, from the user's earliest `practice_run.created_at`, else their earliest `review_log.reviewed_at`.

## Alternatives considered

### Whether any practice, or any review, exists

Rejected because deletions remove practices and reviews, so the steps would come back after the user deletes everything.

### A boolean

Rejected because it costs the same and records less.

### Browser storage

Rejected because it is per device and is cleared with site data.

### Clerk's user metadata

Rejected because it puts a product fact in the provider that holds the user's identity.

## Consequences

**Positive**

- The user's steps leave Home for good at their first practice, on every device, whatever they delete later.
- The developer decides Home's steps from one column, with no query over practices or reviews.
- The developer has the moment of the first practice, not only the fact that it happened.

**Negative**

- The developer who adds a path that creates a practice must write the column, and a path that forgets leaves the steps on Home with no error.
- The developer runs a migration that adds and backfills the column.

**Neutral**

- The developer finds one value on the user's row that no deletion touches.
