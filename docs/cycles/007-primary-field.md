# 007 — Primary field

## Goal

Outcome: A card is identified, wherever showing every field would be too dense, by its deck's first field, and the deck editor, the one place a user controls field order, makes that visible.

Scope: The "Primary" marker in `DeckEditor`'s field list and its test. Not covered: the read-only displays `CardSummaryRow` and `CardTable`, which already rely on the convention.

Judgement: None.

## Records

None.

## Tasks

### T1 — Primary field marker in the deck editor

**Status**

- [x]

**Goal**

The field currently at position 0 is visibly labeled "Primary" in `DeckEditor`'s field list, and stays correctly labeled as the user reorders or removes fields.

**Dependencies**

None.

**Files**

- `frontend/src/components/library/DeckEditor.tsx`
- `frontend/src/components/library/DeckEditor.test.tsx`

**Details**

The visible "Primary" marker must be scoped to `DeckEditor`'s field list only, never the read-only `CardSummaryRow` or `CardTable` displays.

In `FieldsSection` (`DeckEditor.tsx`), the primary field is the first entry of `fields` with `pendingRemoval` not `true`. A field staged for removal is never marked primary even if it sits at index 0.

The primary index is computed once per render as `fields.findIndex(f => !f.pendingRemoval)`; only that row, when not itself the pending-removal branch, renders the pill.

Marker placement: a small pill reading `Primary` immediately after that field's name input, same row, `text-[11px]` in `--color-text-muted` on `--color-surface-elevated`.

One line of static copy directly under the "Fields" `<h2>`, above the list: `text-[13px] text-(--color-text-muted)`, text: "The first field identifies this card in lists and summaries."

The marker re-derives on every render, with no new state and no confirmation on reorder. No change to `onMove`, `onRename`, `onRemove`, or the reducer.

**Out of scope**

- Any change to `CardSummaryRow.tsx` or `CardTable.tsx`.
- A confirmation step when a reorder would change which field is primary.
- Touching `CardFieldsForm.tsx` or `CardStandaloneForm.tsx`.
- Persisting "primary" anywhere: never.

**Done when**

- The first non-pending-removal field renders the "Primary" pill and no other field does.
- Moving a different field to the top through the Move up/down menu moves the pill to match, verified by simulating the move and re-querying.
- A field staged pending-removal at index 0 does not carry the pill, and the pill lands on the next non-removed field.
- The static line renders under the "Fields" heading.

**Debrief**

No departures from Details. 4 new tests in `DeckEditor.test.tsx` under a new describe block, reusing the existing `renderEditor`, `renderEditDeck`, `mockSubjects` and `mockEditDeck` helpers. Full suite: `npx vitest run` 378/378 passed, `npm run lint` clean, `npm run build` clean.
