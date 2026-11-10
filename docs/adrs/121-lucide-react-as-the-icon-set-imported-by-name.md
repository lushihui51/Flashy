# ADR 121: lucide-react as the icon set, imported by name

## Status

Active

## Context

The frontend is a React app (ADR 004) that renders icons throughout its shell and its pages, for navigation, actions and status.

What an icon library costs the bundle depends on how it is imported: an icon imported by name is tree-shaken with the rest, while a lookup through a record of every icon ships the whole set, about 1700 icons, however many are used.

ADR 080 chose `lucide-react` and stored a subject's picture as a lucide icon name. Subjects and their pictures are gone (PDR 033), so this record restates the icon set alone.

## Decision

We will draw every icon from `lucide-react`, imported by name so the bundle carries only the icons used, never through its `icons` record.

## Alternatives considered

### The `icons` record for dynamic lookup

Rejected because it ships every icon whatever is used.

## Consequences

**Positive**

- The developer ships only the icons used.

**Negative**

- The developer swapping the library touches every importing file.

**Neutral**

- The developer finds no icon name stored in the database.
