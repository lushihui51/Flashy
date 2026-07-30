# ADR 004: Use React + TypeScript with Vite for frontend

## Status

Accepted

## Context

Flashy needs a frontend for user interactions. It needs to display UI, and receive and respond to user inputs by consulting with the backend. As a solo project, developing speed is the scarcest resource.

I am most familiar with web development, so the decision naturally comes down to which suite of JavaScript/TypeScript framework or library to use, with a web bundler.

Considered alternative for React is Angular, considered alternative for TypeScript is JavaScript, and considered alternative for Vite is webpack. Other considered alternatives are meta-frameworks like Next.js.

## Decision

Use React + TypeScript, with Vite as the bundler.

### Alternative Considered: Angular

Rejected because it requires significantly more boilerplate code to setup simple components, which is an overkill for a small application like Flashy.

### Alternative Considered: JavaScript

Rejected because it does not enforce type checks rigorously like TypeScript, which can lead to elongated debug sessions. Moreover, TypeScript has become the industry standard.

### Alternative Considered: webpack

Rejected because it has a steeper learning curve, and the added flexibility with its customizable plugins is not needed for a straight-forward app like Flashy, which just needs to be bundled and deployed quickly and reliably.

### Alternative Considered: Next.js

Rejected because FastAPI is already being used for the backend (See ADR 002), so the Next's server-side rendering and API routes buys nothing but more overhead. Moreover, Flashy has no SEO requirement, because its just an app sitting behind auth.

## Consequences

Benefits:

- Dev is familiar with the React + TypeScript setup as a frontend, thereby reducing times spent learning new tech stacks.
- Offers reusable UI components, without being confined by a rigid framework structure
- Simple and fast, with least configuration and boilerplate overhead
- Strict type checks limits ambiguity, reduces bugs and makes the codebase cleaner.

Costs:

- React provides no architectural conventions, so structure is on the developer and large codebases can sprawl. It's accepted for the benefits of being free from a rigid framework structure.
- Typing overhead is expected from TypeScript's strict type checkings, especially when passing concrete types to generic components in React. It's accepted for the benefits of type safety and code clarity.
