# ADR 005: Use Tailwind CSS for styling

## Status

Accepted

## Context

Flashy's frontend needs a styling approach. The decision was made without evaluating alternatives (component libraries such as MUI, CSS modules, plain CSS); Tailwind was chosen from familiarity and its prevalence in the React ecosystem.

## Decision

Use Tailwind CSS (v4) with utility classes applied directly in components.

### Colour tokens

Colours are centralized as CSS custom properties in one `@theme` block in
`src/index.css` (`--color-surface`, `--color-surface-elevated`, `--color-text`,
`--color-text-muted`, `--color-primary`, `--color-primary-contrast`,
`--color-scrim`), referenced via Tailwind v4's canonical `bg-(--color-x)`
shorthand (not the older `bg-[var(--color-x)]` arbitrary-value syntax), so a
future palette swap is a one-file edit. The current values are a placeholder —
`/* TODO(defer:colors) */` marks the block — no real brand palette or
dark/light mode exists yet.

## Consequences

Benefits:

- Styling stays colocated with markup and no separate CSS architecture needs to be maintained, which suits a solo project where development speed is the scarcest resource. \

Costs:

- Utility-heavy JSX is harder to scan, and the choice was made without comparison — accepted because styling is easily the most reversible decision in this log; unlike the database or API client, migrating away would touch presentation only, not data or contracts.
