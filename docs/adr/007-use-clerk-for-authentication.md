# ADR 007: Use Clerk for authentication

## Status

Accepted (implementation pending)

## Context

Each flashcard Deck has exactly one owner, and practice sessions are per-user state. In the current scope, a deck is readable and writable only by its owner; broader sharing models are out of scope for this decision. The same applies to Subjects and Cards.

At the time of this decision, the tech stack is settled: the backend is FastAPI over PostgreSQL and the frontend is a React + TypeScript SPA built with Vite (see ADR 001, ADR 002, and ADR 004). Authentication must therefore integrate with an existing ASGI application and a React SPA. For Flashy, authentication does not differentiate the product.

## Decision

Use Clerk as the managed authentication provider. The React app uses Clerk's components and hooks for sign-in state, and the FastAPI backend verifies Clerk-issued JWTs on protected routes and uses the token's user ID as the ownership key in PostgreSQL.

### Considered Alternative: Build auth in-house

Rejected because weeks of work would produce an undifferentiated feature with a higher security risk than a managed provider.

### Considered Alternative: Self-hosted auth (e.g. Keycloak)

This alternative avoids vendor dependencies, however it's rejected for the costs of running, upgrading and securing an auth server, which is too much operation burden for a solo project.

## Consequences

Benefits:

- Auth is production-grade in days rather than weeks, including flows(social login, email verification) that would not be built at all in-house.
- The backend stays stateless because JWT verification requires no session store.

Costs:

- A hard vendor dependency on Clerk's availability and pricing; free-tier limits could bind if the app grew.
