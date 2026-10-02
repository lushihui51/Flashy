# ADR 067: A configuration's default name is derived from its layout

## Status

Accepted. Implemented by task 022.

## Context

The configuration builder prefilled its Name with the current date-time, chosen because a name only has to be unique per deck and a timestamp is unique and better than "Untitled". In use, every configuration kept it. New practice's picker then listed nothing but dates, and once practice rows name their configurations (ADR 066), a date-named configuration would only put a second date on the row. A practice's name stays a date (task 022 MD-1): a practice is an event, a configuration is a layout.

## Decision

A new configuration's default name is its prompt-side field names, an arrow, then its answer-side field names: "Word → Definition". Within a side, always-shown fields come first, then random-draw fields, each group in the deck's field order, comma-joined; random draw is not marked. Each side shows at most two names and renders the rest as "+N": "Word, Example +1 → Definition". The name is empty while either side has no field.

In create mode the Name input follows the board until the user types in it, after which the text is theirs, through further assignments and a deck change. In edit mode the stored name is kept and never re-derived. The derivation lives with the board logic in `frontend/src/lib/deckConfigurationBoard.ts`; the server still derives nothing (ADR 039).

Derived names are not unique the way timestamps were. Two configurations of one deck with the same layout, or with layouts that differ only in draw mode, get the same default, and the save fails with the existing inline "already exists" error for the user to fix in place. There is no automatic numbering.

## Alternatives considered

### Keep the timestamp

Rejected: it names when the configuration was built, not what it contains, and nobody renamed.

### No default, name required

Rejected: friction on every configuration for a value the layout already implies.

### A character cap

Rejected: it cuts a field name mid-word and stores the ellipsis; a count cap never does, and the row's CSS truncation covers unusually long field names.

### Mark random-draw fields

Rejected: a longer default for a distinction the user can type in; the draw-mode collision is covered by the duplicate error.

### Number duplicates automatically

Rejected: a same-layout duplicate is more likely a mistake than a second configuration, and the existing error says so in place.

## Consequences

Benefits:

- The picker, the Selected list and practice rows read as layouts without the user naming anything.

Costs:

- Field names repeat across decks, so a default name alone does not identify a deck; the practice row pairs it with the deck (task 022 MD-2).
- Renaming a field does not reach a saved configuration's name, which is a string once saved.
