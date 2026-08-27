# ADR 032: Primary field — a deck's first active field identifies its cards

## Status

Accepted

## Context

`CardSummaryRow.tsx` already uses `fieldDefs[0]`'s value as a card's title (falling back to "Untitled card"), and `CardTable.tsx` already freezes and links the same column — both silently, with no name for the convention and no visibility into why field position matters. Decomposing the practice-run completion breakdown surfaced the same need again: a compact way to identify a card without dumping every prompt/answer value onto one row (`docs/tasks/006-practice-run.md`). Inventing a second, different rule there would leave the app with two incompatible answers to "which field represents this card."

## Decision

A deck's **primary field** is its active `field_def` at position 0, per the deck's existing field ordering (`db_read_field_defs`, `app/database_ops/field_def.py:24-36`, already active-only and position-sorted). It is derived, never stored. It becomes the one rule for identifying a card compactly: the practice completion breakdown's per-card row (`docs/tasks/006-practice-run.md`), and a visible marker in `DeckEditor`'s field list so a user reordering fields can see which one currently plays this role (`docs/tasks/007-primary-field.md`) — scoped to `DeckEditor` only, since it's the one surface where field position is actually set; the read-only displays that already consume the convention (`CardSummaryRow`, `CardTable`) are unchanged.

## Alternatives considered

### Leave it implicit, as it already is

Rejected — a user reordering fields in `DeckEditor` has no way to know position 0 carries this meaning, and a second consumer (the practice breakdown) was about to need the same rule with nothing to reference.

### Let the breakdown pick its own representative field independently (e.g. the first prompt field actually shown)

Rejected — that value can differ between attempts of the same card (pool sampling varies per attempt), making a card's identifying label unstable across its own retries. The primary field is a property of the deck, not of any one attempt.

## Consequences

Benefits:

- One named, stable rule for "which field represents this card," reusable anywhere a compact identifier is needed.
- A user editing field order sees the consequence of position 0 directly instead of discovering it indirectly.

Costs:

- A deck whose most identifying content isn't in its first field shows a less useful label until the user notices and reorders — mitigated, not solved, by the visible `DeckEditor` marker.
