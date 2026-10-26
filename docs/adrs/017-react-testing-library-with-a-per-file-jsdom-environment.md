# ADR 017: React Testing Library with a per-file jsdom environment

## Status

Active

## Context

Before the app-shell rebuild, the frontend's Vitest suite only tested pure functions in `src/api/*.ts` against a mocked HTTP layer (MSW) — no React component was ever rendered in a test, so `vite.config.ts`'s `test.environment` was `'node'` (no DOM, fastest possible test startup). The rebuild's ground rule that each component ships with a Vitest + RTL test covering its acceptance criteria introduced the first React component tests in the project, which need a real DOM to render into and query against.

## Decision

We will add `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, and `jsdom` as dev dependencies. Each component test file opts in to jsdom with a `// @vitest-environment jsdom` docblock; the global `test.environment` stays `node`. `src/test/setup.ts` registers jest-dom's matchers and an explicit `afterEach(cleanup)`, since React Testing Library's automatic cleanup registers itself only under `globals: true`, which the repo does not set. Shared helpers in `src/test/testUtils.tsx` wrap a component in the router and, for fetching components, a fresh `QueryClientProvider`, and `src/test/mocks/clerk.ts` mocks Clerk's hooks.

## Alternatives considered

### A global jsdom environment

Rejected because it would silently tax every existing and future pure-function API test with DOM setup/teardown it never needs, for a codebase where most of the test suite at the time of this decision (six `src/api/*.ts` files' worth) is not component tests.

## Consequences

**Positive**

- The developer keeps the API-layer tests at their original speed and `node` semantics.
- The developer gets a real DOM, `getByRole`, `userEvent`, keyboard and focus assertions, in component tests without a global config change.

**Negative**

- The developer must remember the pragma in every new component test file; a missing one fails with a DOM-not-defined error rather than a message pointing at the fix.
- The developer gets no layout or compiled CSS from jsdom, so anything that depends on real layout or computed style needs manual browser verification; a class-based `pointer-events` fix passed in jsdom while doing nothing in a browser, and the fix used an inline style for that reason.

**Neutral**
