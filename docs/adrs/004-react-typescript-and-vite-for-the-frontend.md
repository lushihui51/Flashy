# ADR 004: React, TypeScript, and Vite for the frontend

## Status

Active

## Context

Flashy needs a frontend for user interactions. It needs to display UI, and receive and respond to user inputs by consulting with the backend. As a solo project, development speed is the scarcest resource.

I am most familiar with web development, so the decision naturally comes down to which suite of JavaScript/TypeScript framework or library to use, with a web bundler.

Considered alternative for React is Angular, considered alternative for TypeScript is JavaScript, and considered alternative for Vite is webpack. Other considered alternatives are meta-frameworks like Next.js.

## Decision

We will use React with TypeScript, and Vite as the bundler.

## Alternatives considered

### Angular

Rejected because it requires significantly more boilerplate code to setup simple components, which is an overkill for a small application like Flashy.

### JavaScript

Rejected because it does not enforce type checks rigorously like TypeScript, which can lead to elongated debug sessions. Moreover, TypeScript has become the industry standard.

### webpack

Rejected because it has a steeper learning curve, and the added flexibility with its customizable plugins is not needed for a straight-forward app like Flashy, which just needs to be bundled and deployed quickly and reliably.

### Next.js

Rejected because FastAPI is already being used for the backend, so Next's server-side rendering and API routes buys nothing but more overhead. Moreover, Flashy has no SEO requirement, because it's just an app sitting behind auth.

## Consequences

**Positive**

- The developer is familiar with the React + TypeScript setup as a frontend, thereby reducing time spent learning new tech stacks.
- The developer gets reusable UI components, without being confined by a rigid framework structure.
- The developer gets a simple and fast setup, with the least configuration and boilerplate overhead.
- The developer gets strict type checks that limit ambiguity, reduce bugs and make the codebase cleaner.

**Negative**

- The developer owns the structure, since React provides no architectural conventions and large codebases can sprawl. It's accepted for the benefits of being free from a rigid framework structure.
- The developer pays typing overhead under TypeScript's strict type checks, especially when passing concrete types to generic components in React. It's accepted for the benefits of type safety and code clarity.

**Neutral**
