# ADR 017: Use React Testing Library with a per-file jsdom environment

## Status

Accepted

## Context

Before the app-shell rebuild (`docs/plans/002-frontend-rebuild-app-shell.md`), the frontend's Vitest suite only tested pure functions in `src/api/*.ts` against a mocked HTTP layer (MSW) — no React component was ever rendered in a test, so `vite.config.ts`'s `test.environment` was `'node'` (no DOM, fastest possible test startup). Plan 002's ground rule 5 ("each component ships with a Vitest + RTL test covering the acceptance criteria") introduced the first React component tests in the project, which need a real DOM to render into and query against.

## Decision

Add `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, and `jsdom` as dev dependencies. Rather than flipping the global `test.environment` to `'jsdom'`, each component test file opts in individually with a `// @vitest-environment jsdom` docblock at its top; the global default in `vite.config.ts` stays `'node'`.

`src/test/setup.ts` — which already ran for every test file via MSW's `beforeAll`/`afterEach`/`afterAll` — gained `import '@testing-library/jest-dom/vitest'` (matcher extensions like `toBeInTheDocument`) and an explicit `afterEach(() => cleanup())`, since React Testing Library's automatic cleanup only self-registers under Vitest's `globals: true`, which this repo doesn't set (imports stay explicit throughout, matching the rest of the codebase's style).

Two shared test helpers were added: `src/test/testUtils.tsx` (`renderWithRouter` wraps a component in `MemoryRouter`; `renderWithProviders` additionally wraps it in a fresh `QueryClientProvider` with retries off, for components/pages that fetch via TanStack Query) and `src/test/mocks/clerk.ts` (mocks `@clerk/react`'s `useUser`/`useClerk` at the module level, with `mockSignedOut()`/`mockLoading()`/`mockSignedIn()` convenience setters).

### Alternative Considered: Global jsdom environment

Rejected because it would silently tax every existing and future pure-function API test with DOM setup/teardown it never needs, for a codebase where most of the test suite at the time of this decision (six `src/api/*.ts` files' worth) is not component tests.

## Consequences

Benefits:

- Existing API-layer tests keep their original speed and `node` semantics unchanged.
- New component tests get a real DOM (`getByRole`, `userEvent`, keyboard interaction, focus assertions) without a global config change.

Costs:

- Every new component test file must remember the `// @vitest-environment jsdom` pragma — an easy one-line omission to make, and a missing pragma fails with a DOM-not-defined error rather than a message pointing at the fix.
- jsdom does not apply compiled CSS or do real layout — discovered concretely during the app-shell work (ADR 016) when a Tailwind *class*-based `pointer-events` fix would have passed in jsdom (which never loads `index.css`, so the class has no effect there) while doing nothing in a real browser. The eventual fix used an inline style specifically because inline styles behave identically in jsdom and a real browser. Anything that depends on real layout, computed style from an actual stylesheet, or visual clipping is not covered by this test environment and needs manual browser verification instead.
