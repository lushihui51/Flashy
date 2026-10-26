# ADR 005: Tailwind CSS for styling

## Status

Active

## Context

Flashy's frontend needs a styling approach. Tailwind was chosen from familiarity and its prevalence in the React ecosystem, without evaluating alternatives.

## Decision

We will use Tailwind CSS (v4) with utility classes applied directly in components. Colours are centralized as CSS custom properties in one `@theme` block in `src/index.css`, so a palette swap is a one-file edit.

## Alternatives considered

### Component libraries, CSS modules, and plain CSS

Not evaluated: component libraries such as MUI, CSS modules, and plain CSS were the candidates, and none was compared against Tailwind.

## Consequences

**Positive**

- The developer keeps styling colocated with markup and maintains no separate CSS architecture, which suits a solo project where development speed is the scarcest resource.

**Negative**

- The developer reads utility-heavy JSX, which is harder to scan; accepted because styling is the most reversible decision here, touching presentation only, never data or contracts.

**Neutral**
