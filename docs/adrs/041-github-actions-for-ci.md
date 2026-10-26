# ADR 041: GitHub Actions for CI

## Status

Active

## Context

Every task ends with the same manual ritual — `pytest`, `npx vitest run`, `npm run lint`, `npm run build` — enforced only by convention. The repo already works through GitHub PRs. Two schema-heavy cycles (the rename, the mastery ledger) are about to land, and nothing anywhere exercises the alembic chain from zero: pytest builds its schema via `SQLModel.metadata.create_all`. Hosting and CD are deliberately out of scope — they are decision-dense enough to deserve their own cycle after the ledger lands.

GitHub Actions is built into the forge the repo already lives on: zero integration distance, config versioned in-repo, native PR checks and branch protection, service containers for the real-Postgres test suite, and free at this scale.

## Decision

We will run a GitHub Actions workflow on every pull request and push to `main`: a backend job, uv-managed Python, a Postgres service container, `alembic upgrade head` from an empty database as an explicit migration check, then `pytest`; and a frontend job, `npm ci`, lint, vitest, build.

## Alternatives considered

### Jenkins

Rejected — self-hosted maintenance burden absurd for a solo project.

### GitLab CI

Rejected — its advantage is being built into GitLab; the repo is on GitHub.

### An external CI service

Rejected — an extra account, code-access grant, and config dialect adding nothing the built-in option lacks at this scale.

## Consequences

**Positive**

- The developer gets the ritual enforced, and the migration chain exercised from zero before the cycles that stress it.

**Negative**

- The project spends bounded free-tier CI minutes, and the developer keeps one more file honest as the ritual evolves.

**Neutral**
