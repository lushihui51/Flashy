import { useId, useRef, useState } from 'react';
import BottomSheet from 'src/components/ui/BottomSheet';
import {
  fieldsIn,
  SLOT_LABELS,
  type BoardSlot,
  type BoardState,
  type PoolSlot,
} from 'src/lib/deckConfigurationBoard';
import type { components } from 'src/api/types';

type DeckFieldDef = components['schemas']['DeckFieldDefRead'];

type FieldAssignmentBoardProps = {
  /** The deck's **live** fields, already fetched by the page — archived fields never
   * reach here (invariant 5). */
  fieldDefs: DeckFieldDef[];
  state: BoardState;
  onMove: (fieldId: string, to: BoardSlot) => void;
  onToggleCount: (slot: PoolSlot, count: number) => void;
};

/** The sheet's five possible destinations, in the fixed order the ADR 020 contract
 * specifies. A field's own current slot is filtered out at render time, so the sheet
 * always offers exactly the other four. */
const DESTINATIONS: { slot: BoardSlot; label: string }[] = [
  { slot: 'prompt_fields', label: 'Prompt · always shown' },
  { slot: 'prompt_pool', label: 'Prompt · random draw' },
  { slot: 'answer_fields', label: 'Answer · always shown' },
  { slot: 'answer_pool', label: 'Answer · random draw' },
  { slot: 'unassigned', label: 'Not used' },
];

const RANDOM_DRAW_LEGEND: Record<PoolSlot, string> = {
  prompt_pool: 'How many random prompt fields each card shows',
  answer_pool: 'How many random answer fields each card shows',
};

/**
 * The assignment board (ADR 020): a "Not used" area on top, then a Prompt side card
 * and an Answer side card, each holding an Always shown area and a Random draw area
 * whose frequency checkboxes sit directly beneath the chips they govern.
 *
 * Every chip is a single button; tapping it opens a `BottomSheet` listing the other
 * four destinations, and choosing one calls `onMove`. This is the board's only
 * interaction path — HTML5 drag never fires on touch and there is no device here to
 * verify a hand-rolled gesture, so tap-to-assign is what ships (ADR 020's rejected
 * alternatives cover why the other shapes lost).
 */
export default function FieldAssignmentBoard({
  fieldDefs,
  state,
  onMove,
  onToggleCount,
}: FieldAssignmentBoardProps) {
  const nameById = new Map(fieldDefs.map((field) => [field.id, field.name]));
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  // One shared trigger ref, reassigned to whichever chip was tapped most recently, so
  // BottomSheet's onCloseAutoFocus returns focus to that exact chip (ADR 020's Costs).
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();

  const closeSheet = () => setActiveFieldId(null);

  const chipButton = (fieldId: string) => (
    <button
      key={fieldId}
      type="button"
      aria-haspopup="dialog"
      onClick={(event) => {
        triggerRef.current = event.currentTarget;
        setActiveFieldId(fieldId);
      }}
      className="min-h-9 truncate rounded-full bg-(--color-surface-elevated) px-3 py-1.5 text-sm text-(--color-text)"
    >
      {nameById.get(fieldId) ?? fieldId}
    </button>
  );

  const area = (slot: BoardSlot, emptyText: string) => {
    const ids = fieldsIn(state, slot);
    return (
      <div className="flex flex-wrap items-center gap-2">
        {ids.length > 0 ? (
          ids.map(chipButton)
        ) : (
          <span className="text-sm text-(--color-text-muted)">{emptyText}</span>
        )}
      </div>
    );
  };

  const frequencyRow = (slot: PoolSlot) => {
    const size = fieldsIn(state, slot).length;
    if (size === 0) return null;
    return (
      <fieldset className="flex flex-wrap items-center gap-2 text-sm text-(--color-text)">
        <legend className="sr-only">{RANDOM_DRAW_LEGEND[slot]}</legend>
        <span>Each card shows</span>
        {Array.from({ length: size }, (_, i) => i + 1).map((count) => (
          <label key={count} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={state.counts[slot].includes(count)}
              onChange={() => onToggleCount(slot, count)}
            />
            {count}
          </label>
        ))}
        <span>of these</span>
      </fieldset>
    );
  };

  const sideCard = (side: 'prompt' | 'answer') => {
    const alwaysSlot: BoardSlot = side === 'prompt' ? 'prompt_fields' : 'answer_fields';
    const randomSlot: PoolSlot = side === 'prompt' ? 'prompt_pool' : 'answer_pool';
    return (
      <div
        key={side}
        className="flex flex-col gap-3 rounded-lg border border-(--color-surface-elevated) p-3"
      >
        <h2 className="text-sm font-medium text-(--color-text)">
          {side === 'prompt' ? 'Prompt side' : 'Answer side'}
        </h2>
        <section aria-label={SLOT_LABELS[alwaysSlot]} className="flex flex-col gap-1">
          <h3 className="text-sm text-(--color-text-muted)">Always shown</h3>
          {area(alwaysSlot, 'None yet.')}
        </section>
        <section aria-label={SLOT_LABELS[randomSlot]} className="flex flex-col gap-1">
          <h3 className="text-sm text-(--color-text-muted)">Random draw</h3>
          {area(randomSlot, 'None yet.')}
          {frequencyRow(randomSlot)}
        </section>
      </div>
    );
  };

  const activeSlot = activeFieldId ? state.slots[activeFieldId] : null;
  const activeName = activeFieldId ? (nameById.get(activeFieldId) ?? activeFieldId) : '';

  return (
    <div className="flex flex-col gap-4">
      <section aria-label={SLOT_LABELS.unassigned} className="flex flex-col gap-1">
        <h2 className="text-sm font-medium text-(--color-text-muted)">{SLOT_LABELS.unassigned}</h2>
        {area('unassigned', 'Every field is assigned.')}
      </section>

      {sideCard('prompt')}
      {sideCard('answer')}

      <BottomSheet
        open={activeFieldId !== null}
        onClose={closeSheet}
        triggerRef={triggerRef}
        ariaLabelledBy={titleId}
      >
        <h2 id={titleId} className="text-base font-semibold text-(--color-text)">
          Move "{activeName}" to…
        </h2>
        <ul className="flex flex-col">
          {DESTINATIONS.filter((destination) => destination.slot !== activeSlot).map(
            (destination) => (
              <li key={destination.slot}>
                <button
                  type="button"
                  onClick={() => {
                    if (activeFieldId) onMove(activeFieldId, destination.slot);
                    closeSheet();
                  }}
                  className="flex min-h-14 w-full items-center rounded-xl px-2 text-left font-medium text-(--color-text)"
                >
                  {destination.label}
                </button>
              </li>
            ),
          )}
        </ul>
      </BottomSheet>
    </div>
  );
}
