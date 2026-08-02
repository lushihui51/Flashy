# ADR 005: Use Tailwind CSS for styling

## Status

Accepted

## Context

Flashy's frontend needs a styling approach. The decision was made without evaluating alternatives (component libraries such as MUI, CSS modules, plain CSS); Tailwind was chosen from familiarity and its prevalence in the React ecosystem.

## Decision

Use Tailwind CSS (v4) with utility classes applied directly in components.

## Consequences

Benefits:

- Styling stays colocated with markup and no separate CSS architecture needs to be maintained, which suits a solo project where development speed is the scarcest resource. \

Costs:

- Utility-heavy JSX is harder to scan, and the choice was made without comparison — accepted because styling is easily the most reversible decision in this log; unlike the database or API client, migrating away would touch presentation only, not data or contracts.
