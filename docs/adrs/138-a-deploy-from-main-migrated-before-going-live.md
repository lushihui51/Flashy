# ADR 138: A deploy from `main`, migrated before going live

## Status

Active

## Context

A change reaches `main` only by a pull request with CI green, and CI runs again on the push to `main`, the whole migration chain from an empty database included (ADR 041).

`alembic upgrade` is the only way a schema changes, the app creates no tables when it starts, and a query that meets a schema it does not expect fails loudly (ADR 045).

ADR 045 rejected, for the time being, a check at startup that the database is at alembic head, because it would run inside every test, and left it to be looked at again once the app was hosted.

`GET /api/health` pings the database (ADR 130).

One service, built from Node and Python, is the only thing deployed (ADR 128). It runs on Railway, which holds production's settings in the service's variables, the database's password among them, and the frontend's build needs `VITE_CLERK_PUBLISHABLE_KEY` (ADR 137).

The repository holds a Python app at its root and a Node app in a folder.

Railway deploys a linked repository when a commit is pushed to the connected branch, and with Wait for CI on, skips the deploy when a workflow fails.

Railway builds from a `Dockerfile` at the repository's root, and a variable reaches the build only where the `Dockerfile` declares it.

A pre-deploy command runs between build and deploy, in a container of its own, and its failure stops the deploy.

With a healthcheck path set, the new deployment goes live only after the path answers, and the previous one stays live until then.

Railway's settings files in the repository, `railway.toml` and `railway.json`, are deprecated, closed to new services, and stop working on 1 December 2026.

A previous deployment can be restarted during a deploy, or brought back to undo one.

## Decision

We will start a deploy when a commit reaches `main`. Railway waits for CI on that commit, builds the service from a `Dockerfile` at the repository's root, runs `alembic upgrade head` as its pre-deploy command, and makes the new deployment live once `GET /api/health` answers 200.

The `Dockerfile` builds the frontend in a Node stage, taking `VITE_CLERK_PUBLISHABLE_KEY` as a build argument, and copies the built files into the Python image that runs the API.

Wait for CI, the pre-deploy command and the healthcheck path are set in the service's settings on Railway.

We will have the app make no check at startup that the database is at alembic head.

## Alternatives considered

### The migration run when the app starts

Rejected because schema changes stay out of startup, and a migration that failed would leave the app restarting in a loop.

### The migration run from CI

Rejected because CI would then hold the production database's password.

### A workflow in GitHub that pushes the build to Railway

Rejected because it needs a Railway token kept in GitHub for what the linked repository does unasked.

### Railway's own builder working the project out

Rejected because the repository holds a Python app at its root and a Node app in a folder, and a `Dockerfile` states the build exactly and runs on another host unchanged.

### A deploy on every push without waiting for CI

Rejected because a merge that breaks `main` would go live.

### The three settings in `railway.toml`

Rejected because Railway is retiring it.

### A check that refuses to start when the database is not at the code's own head

Rejected because a previous deployment, restarted during a deploy or brought back to undo one, would find the database ahead of it and refuse to start.

## Consequences

**Positive**

- The developer's merged pull request is live within minutes with no one acting, and nothing reaches production except through `main`.
- The user keeps the previous deployment when a migration or a health check fails.
- The developer's deployment never starts before its own migrations have run.
- The developer could build the app on another host from the same `Dockerfile`.

**Negative**

- The user's requests fail for a moment when a migration removes something the previous deployment reads, since that deployment runs against the new schema between the migration and the switch.
- The developer keeps three settings on Railway and in no file, where a change to them is seen by no review.
- The developer finds a database changed by hand, outside alembic, only at the query that meets the difference.

**Neutral**

- The developer who brings a previous deployment back starts it against the newer schema, and it works or fails by what that schema changed.
