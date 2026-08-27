# 007 — Primary field

Formalizes and surfaces a convention the frontend already relies on implicitly: a card is identified, wherever showing every field would be too dense, by its deck's first field. This task makes that fact visible in the one place a user actually controls field order. Surfaced while decomposing 006 (its T3/T8 consume this definition — see ADR 032) but independently shippable and not a dependency of 006 in either direction. Branch: `rewrite/primary-field`, independent of 004/005/006 — touches only `DeckEditor.tsx` and its test, no files shared with those.

## ADRs

Decisions this file implements; full context and rejected alternatives live in the ADR.

- **ADR 032 — Primary field: a deck's first active field identifies its cards**: a deck's primary field is its active `field_def` at position 0 — derived, never stored. Formalizes a convention `CardSummaryRow.tsx`/`CardTable.tsx` already lean on silently; 006's completion breakdown is the first new consumer.

## Minor decisions

- **MD-1**: The visible "Primary" marker is scoped to `DeckEditor`'s field list only, not the read-only `CardSummaryRow`/`CardTable` displays that already consume the convention — those are read-only, not surfaces where a user sets or changes field position.

## Contracts

### Primary-field row (ADR 032, MD-1)

In `FieldsSection` (`DeckEditor.tsx`), the primary field is the first entry of `fields` with `pendingRemoval` not `true` — array order, not a stored `position` value (there isn't one on `EditorField`; array index _is_ position, exactly what the Move up/down handlers already reorder). A field staged for removal is never marked primary even if it sits at index 0, since it's about to stop being an active field. Marker placement: a small pill reading `Primary` immediately after that field's name input, same row, `text-[11px]` in `--color-text-muted` on `--color-surface-elevated` (matches the existing badge weight used elsewhere, e.g. `PracticeStatusBadge`). One line of static copy directly under the "Fields" `<h2>`, above the list: `text-[13px] text-(--color-text-muted)`, text: "The first field identifies this card in lists and summaries." The marker re-derives on every render — no new state, no confirmation on reorder.

## Tasks

### T1 — Primary field marker in the deck editor (ADR 032, MD-1)

- [ ] **Goal:** the field currently at position 0 is visibly labeled "Primary" in `DeckEditor`'s field list, and stays correctly labeled as the user reorders or removes fields.
- **Files:** `frontend/src/components/library/DeckEditor.tsx`, `frontend/src/components/library/DeckEditor.test.tsx`.
- **Details:** Implement the Primary-field row contract above, inside `FieldsSection`. The primary index is computed once per render as `fields.findIndex(f => !f.pendingRemoval)`; only that row (when not itself the pending-removal branch) renders the pill. No change to `onMove`, `onRename`, `onRemove`, or the reducer — this is presentational only, derived from existing state.
- **Out of scope:** any change to `CardSummaryRow.tsx` or `CardTable.tsx` (MD-1); a confirmation step when a reorder would change which field is primary; touching `CardFieldsForm.tsx`/`CardStandaloneForm.tsx` (card-content entry, not field ordering); persisting "primary" anywhere — it is never stored, only derived.
- **Done when:** tests cover — the first non-pending-removal field renders the "Primary" pill and no other field does; moving a different field to the top (via the Move up/down menu) moves the pill to match, verified by simulating the move and re-querying; a field staged pending-removal at index 0 does not carry the pill, and the pill instead lands on the next non-removed field; the static explanatory line renders under the "Fields" heading; `npx vitest run`, `npm run lint`, `npm run build` clean.
- Notes:
