# ADR 032: The first active field as a deck's primary field

## Status

Deprecated by the record rules' Type test

## Context

`CardSummaryRow.tsx` already uses `fieldDefs[0]`'s value as a card's title (falling back to "Untitled card"), and `CardTable.tsx` already freezes and links the same column — both silently, with no name for the convention and no visibility into why field position matters. Decomposing the practice-run completion breakdown surfaced the same need again: a compact way to identify a card without dumping every prompt/answer value onto one row. Inventing a second, different rule there would leave the app with two incompatible answers to "which field represents this card."

## Decision

We will define a deck's primary field as its active field at position 0, derived from the deck's field order and never stored, and make it the one rule for identifying a card compactly wherever a surface needs one. `DeckEditor` shows a visible marker on it, since it is the one surface where field position is set.

## Alternatives considered

### Leave it implicit, as it already is

Rejected — a user reordering fields in `DeckEditor` has no way to know position 0 carries this meaning, and a second consumer (the practice breakdown) was about to need the same rule with nothing to reference.

### Let the breakdown pick its own representative field independently (e.g. the first prompt field actually shown)

Rejected — that value can differ between attempts of the same card (pool sampling varies per attempt), making a card's identifying label unstable across its own retries. The primary field is a property of the deck, not of any one attempt.

## Consequences

**Positive**

- The developer has one named, stable rule for "which field represents this card", reusable anywhere a compact identifier is needed.
- The user editing field order sees the consequence of position 0 directly.

**Negative**

- The user whose most identifying content is not in the first field sees a less useful label until they reorder; the marker mitigates, not solves, it.

**Neutral**
