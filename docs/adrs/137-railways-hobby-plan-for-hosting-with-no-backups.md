# ADR 137: Railway's Hobby plan for hosting, with no backups

## Status

Active

## Context

One service, built from Node and Python, serves the frontend and the API, and is the only thing deployed (ADR 128). Its database is PostgreSQL (ADR 001).

PDR 053 publishes the app for the people its owner gives its link to, and has a visitor see a filled app the moment the page opens.

The example library exists only in the database that shows it, and a script is run against that database to make it (ADR 129).

Railway's Hobby plan is $5 a month and includes $5 of usage, metered at $10 a GB of memory, $20 a vCPU and $0.15 a GB of volume a month, with volumes up to 5 GB and two custom domains a service, each given a certificate automatically.

Railway puts a service to sleep only where its Serverless setting is turned on.

Railway gives a volume its backups on the Pro plan, at $20 a month, and refuses them on Hobby. It maintains its PostgreSQL template as a single node while the template is left as shipped.

`railway ssh` runs a command inside the deployed service. A Railway variable can be set as a reference to another service's variable, and follows it when it changes.

A 512 MB service on Render with its smallest paid PostgreSQL comes to about $13 a month, above what the owner set out to spend; that database can be restored to any moment of the past three days. Neon's free PostgreSQL sleeps after five idle minutes and keeps six hours of history, and costs about $19 a month kept awake. Fly.io's own managed PostgreSQL starts at $38 a month.

`Settings` in `app/config.py` reads `database_url`, `test_database_url`, `permitted_origins`, `vite_clerk_publishable_key`, `clerk_fapi_url`, `dev_auth_user_id` and `env`, the first five required. `test_database_url` is read only by `tests/conftest.py`.

The database's address holds its password and is the one secret among the settings. The API verifies a session against Clerk's public keys (ADR 007), fetched from `clerk_fapi_url`, and holds no Clerk secret. Clerk's publishable key is public by design, and is built into the frontend's files.

The local bypass answers every request as one user while `ENV=development` and `DEV_AUTH_USER_ID` are both set (ADR 131).

Both `.env` files are ignored by git. The owner develops against a local server, a development database and Clerk's development instance.

## Decision

We will run the service and its PostgreSQL on Railway, in one project, on the Hobby plan. The database is Railway's PostgreSQL template as shipped, with no backups. The service's Serverless setting stays off, and the owner's domain is attached to the service.

We will keep production's settings in the Railway service's variables, and nowhere in the repository. `DATABASE_URL` is set as a reference to the PostgreSQL service's own variable, so the password is never copied by hand. `PERMITTED_ORIGINS`, `CLERK_FAPI_URL` and `VITE_CLERK_PUBLISHABLE_KEY` are set beside it. `test_database_url` becomes optional in `Settings` in `app/config.py`, and production sets none. `ENV` and `DEV_AUTH_USER_ID` are never set there.

Development reads the two `.env` files as before, with its own database and Clerk's development instance, and no value of production's is in them.

## Alternatives considered

### Render

Rejected because it comes to about $13 a month, above what the owner set out to spend, though its paid database can be restored to any moment of the past three days.

### Railway's Pro plan

Rejected because it is $20 a month, and the backups are all it adds at this size.

### A nightly job that dumps the database to storage elsewhere

Rejected because it is a part that can stop with nothing saying so, and the owner takes the risk of no backup.

### A Fly.io machine with Neon's PostgreSQL

Rejected because it is two providers, and the database would either sleep after five idle minutes, on the free plan, or cost about $19 a month kept awake.

### Fly.io's own managed PostgreSQL

Rejected because it starts at $38 a month.

### A rented server run by the owner

Rejected because the certificate, the updates, PostgreSQL and its backups would all become the owner's to keep.

### A `.env` file placed on the host

Rejected because it would be a second copy of the password that someone keeps in step by hand.

### The database's address typed into the service's variables

Rejected because it would go stale when Railway changes the password or the host.

### `test_database_url` set in production to a made-up value

Rejected because the app would start with a setting that points nowhere and reads as real.

### A secrets manager apart from the host

Rejected because it is one more account for one secret.

## Consequences

**Positive**

- The owner pays one bill for the app and its database, of about $5 to $8 a month at a handful of visitors.
- The developer finds no production value in the repository, and development and production share no database, no Clerk instance and no setting's value.

**Negative**

- The user loses their decks and everything they practiced, and the owner the example library, if the database is lost or damaged.
- The developer cannot undo a migration that destroys data.
- The user sees the connection banner while the database restarts, since it is one node with no standby.
- The owner's database holds at most 5 GB on this plan.
- The developer adds a new setting in Railway before the deploy that reads it, or the app fails to start.
- The owner accepts that whoever can open the Railway project can read the database's password.
- The owner accepts that a service on which someone set both `ENV=development` and `DEV_AUTH_USER_ID` would answer every request as one user, and Railway's variables are the one place that could happen.

**Neutral**

- The developer's frontend build needs `VITE_CLERK_PUBLISHABLE_KEY` at build time, not only when the app runs.
