# ADR 141: Account deletion committed once Clerk deletes the user

## Status

Active

## Context

A user deletes their own account once they have confirmed it, told that it cannot be undone. The deletion takes the account, its sign-in and everything the user made in Flashy, at once, keeps nothing of them, and leaves the user where logging out leaves them (PDR 061).

The privacy page tells a person how a user has their data deleted (PDR 062).

An account lives in two systems, the user at Clerk and the user's rows in Flashy's database, and no transaction spans both.

Clerk is the authentication provider. The API verifies the session tokens Clerk issues and uses the token's user id as the ownership key (ADR 007). It checks a token against Clerk's public keys alone, and holds no Clerk secret key.

Clerk's server API deletes a user by id, at `DELETE https://api.clerk.com/v1/users/{user_id}`, authenticated by the instance's secret key as a Bearer token. A secret key can administer every user of its instance.

Clerk's docs do not say whether deleting a user ends that user's sessions.

Clerk's browser client can delete the signed-in user itself through `user.delete()`, where the instance's setting for a user deleting themselves allows it. Clerk can also send a signed `user.deleted` webhook to a public route of the app.

`httpx` is installed at runtime through `fastapi[standard]`.

Production's settings are the Railway service's variables, kept nowhere in the repository, and development reads `.env` files with values of its own (ADR 137). Production has a Clerk instance of its own, apart from development's (ADR 139).

One deletion closure, `compute_deletion_impact` then `apply_deletion` in `app/services/deletion.py`, plans and executes every deletion of a deck, field or card, and is the only way one is deleted. `apply_deletion` never commits. A practice is deleted by its foreign keys' cascades, which take its configurations and runs and leave review rows alone (ADR 118).

A review row is appended only by the rating path and deleted only with the card or field it belongs to (ADR 011). `review_log.user_id` has no `ON DELETE` rule, and PostgreSQL refuses a delete whose cascade reaches a row through a key with no `ON DELETE` rule, so deleting an `app_user` row that still has review rows fails.

A practice carries its user (ADR 105), through `fk_practice_user_id_app_user`, which cascades. The closure deletes no practice: a deck's deletion takes its practices' configurations and leaves the practices. Nothing outside a practice holds its id inside an array, and nothing derived from it is recomputed, so its foreign keys are its whole deletion.

A service owns the transaction it composes, and a writer that adds and flushes inside its caller's transaction without committing is named `db_stage_<verb>_<noun>` (ADR 055).

The API creates an `app_user` row the first time it sees a verified Clerk user id (ADR 130).

With the local bypass on, every route answers as the one Clerk user id `DEV_AUTH_USER_ID` names (ADR 131), and development runs against Clerk's development instance.

## Decision

We will delete an account in one request and one transaction. The backend stages the deletion of every row of the user, then deletes the user at Clerk through Clerk's server API, and commits only once Clerk confirms the deletion. When Clerk refuses or cannot be reached, the transaction rolls back and nothing is deleted on either side.

We will give the backend its Clerk instance's secret key as `clerk_secret_key` in `Settings` in `app/config.py`, set among the Railway service's variables in production and in the `.env` in development, and call Clerk with it through `httpx`.

We will stage the deletion of the user's rows by passing every deck of the user through `compute_deletion_impact` then `apply_deletion`, then deleting the `app_user` row through `db_stage_delete_app_user`, whose cascades take the user's practices, and by flushing before Clerk is called. We will give `review_log.user_id` no cascade, so that the closure stays the only way a deck is deleted.

## Alternatives considered

### The API deleting the rows, then the frontend calling Clerk's `user.delete()`

Rejected because it depends on Clerk's setting for a user deleting themselves, and a failure between the two steps leaves a sign-in with nothing behind it while the privacy page says everything is deleted.

### The frontend calling `user.delete()`, and Clerk's `user.deleted` webhook deleting the rows

Rejected because it adds a public `POST` route outside `CurrentUserDep`, a signing secret and a dependency, needs a tunnel in development, and leaves the rows when a delivery fails for good.

### No Clerk secret key on the backend

Rejected because it leaves only the two ways above.

### One delete of the `app_user` row, with `review_log.user_id` given `ON DELETE CASCADE` by a migration

Rejected because two paths would then delete decks, and a rule added to the closure would be skipped silently when an account is deleted.

### A staged delete of the user's practices before the user row

Rejected because it deletes the same rows as the cascade a practice's own deletion already relies on.

## Consequences

**Positive**

- The user who deletes their account loses it at Clerk and in Flashy together, or keeps it on both sides when either refuses.
- The developer finds one request that deletes an account everywhere, with no public route and no webhook to receive.
- The developer finds decks deleted in one way only, and a future table that references `app_user` or `deck` with no cascade fails the flush before Clerk is called.

**Negative**

- The owner keeps in production a secret that can administer every user of the Clerk instance, readable by whoever can open the Railway project.
- The user whose deletion fails at the commit, after Clerk has deleted them, leaves rows under a Clerk id no one can sign in as.
- The developer finds an empty `app_user` row made for a deleted Clerk id when a request carrying a session token issued before the deletion arrives after it.
- The developer's future table of user data with no key leading to `app_user` survives an account's deletion with nothing failing.
- The developer who deletes their account on the dev servers with the local bypass on deletes that id's user in Clerk's development instance.

**Neutral**

- The developer adds `CLERK_SECRET_KEY` to the Railway service's variables before the deploy that reads it.
