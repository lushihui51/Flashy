# ADR 080: lucide-react as the icon set, a subject's icon stored as its name

## Status

Active

## Context

The frontend is a React app (ADR 004) that renders icons throughout its shell and its pages, for navigation, actions and status. `subject.icon` is a string column holding the picture the user chose for a subject, rendered wherever the subject appears.

What an icon library costs the bundle depends on how it is imported: an icon imported by name is tree-shaken with the rest, while a lookup through a record of every icon ships the whole set, about 1700 icons, however many are used.

An emoji is drawn by the device's own font and looks different on each device.

A stored icon name outlives the library that drew it.

## Decision

We will draw every icon from `lucide-react`, imported by name so the bundle carries only the icons used, never through its `icons` record.

`subject.icon` stores a lucide icon name in kebab case, resolved through the static map in `frontend/src/lib/subjectIcon.ts`, with `book-open` as the backend default and the fallback for any name the map does not hold.

## Alternatives considered

### Emoji strings in `subject.icon`

Rejected because they are an uncurated set that renders differently on every device.

### The `icons` record for dynamic lookup

Rejected because it ships every icon whatever is used.

## Consequences

**Positive**

- The developer ships only the icons used and reads the set the user may choose from in one map.
- The user sees the same picture for a subject on every device.

**Negative**

- The developer swapping the library touches every importing file and the stored `subject.icon` values, which are lucide's names, so the swap is a key map or a data migration, not a dependency bump.

**Neutral**

- The developer adds a picture the user may choose as one entry in the map; which pictures are offered is the product side's.
- The developer renders a stored name the map does not hold as `book-open` rather than as nothing.
