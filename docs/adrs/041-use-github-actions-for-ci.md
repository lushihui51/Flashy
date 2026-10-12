# ADR 041: Use GitHub Actions for CI

## Status

Accepted

## Context

Every task ends with the same manual ritual — `pytest`, `npx vitest run`, `npm run lint`, `npm run build` — enforced only by convention. The repo already works through GitHub PRs. Two schema-heavy cycles (the rename, the mastery ledger) are about to land, and nothing anywhere exercises the alembic chain from zero: pytest builds its schema via `SQLModel.metadata.create_all`. Hosting and CD are deliberately out of scope — they are decision-dense enough to deserve their own /plan cycle after the ledger lands (009 MD-2).

## Decision

A GitHub Actions workflow runs on every pull request and push to `main`: a backend job (uv-managed Python, a Postgres service container, `alembic upgrade head` from an empty database as an explicit migration check, then `pytest`) and a frontend job (`npm ci`, lint, vitest, build). CI is the built-in choice for the forge the repo already lives on: zero integration distance, config versioned in-repo, native PR checks and branch protection, service containers for the real-Postgres test suite, and free at this scale.

## Alternatives considered

### Jenkins

Rejected — self-hosted maintenance burden absurd for a solo project.

### GitLab CI

Rejected — its advantage is being built into GitLab; the repo is on GitHub.

### External services (CircleCI, Travis, Buildkite)

Rejected — an extra account, code-access grant, and config dialect adding nothing the built-in option lacks at this scale.

## Consequences

Benefits:

- The ritual becomes enforcement; the migration chain is finally exercised from zero, exactly before the cycles that stress it.

Costs:

- CI minutes are bounded (free tier) but real; the workflow is one more file to keep honest as the ritual evolves.
