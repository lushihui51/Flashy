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
  /** The deck's fields, already fetched by the page. */
  fieldDefs: DeckFieldDef[];
  state: BoardState;
  onMove: (fieldId: string, to: BoardSlot) => void;
  onToggleCount: (slot: PoolSlot, count: number) => void;
};

/** The sheet's five possible destinations, in this fixed order. A field's own current
 * slot is filtered out at render time, so the sheet always offers exactly the other
 * four. */
const DESTINATIONS: BoardSlot[] = [
  'prompt_fields',
  'prompt_pool',
  'answer_fields',
  'answer_pool',
  'unassigned',
];

const RANDOM_DRAW_LEGEND: Record<PoolSlot, string> = {
  prompt_pool: 'How many random prompt fields each card shows',
  answer_pool: 'How many random answer fields each card shows',
};

/**
 * The assignment board: a "Not used" area on top, then a Prompt side card and an
 * Answer side card, each holding an Always shown area and a Random draw area whose
 * frequency checkboxes sit directly beneath the chips they govern.
 *
 * Every chip is a single button; tapping it opens a `BottomSheet` listing the other
 * four destinations, and choosing one calls `onMove`. This is the board's only
 * interaction path — HTML5 drag never fires on touch and there is no device here to
 * verify a hand-rolled gesture, so tap-to-assign is what ships.
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
  // BottomSheet's onCloseAutoFocus returns focus to that exact chip.
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
      className="tappable-sm h-tab max-w-full truncate rounded-xl bg-(--color-surface) px-3 text-sm font-semibold text-(--color-ink)"
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
          <span className="text-sm text-(--color-aside)">{emptyText}</span>
        )}
      </div>
    );
  };

  const frequencyRow = (slot: PoolSlot) => {
    const size = fieldsIn(state, slot).length;
    if (size === 0) return null;
    return (
      <fieldset className="flex basis-full flex-wrap items-center gap-1.5 text-label text-(--color-aside)">
        <legend className="sr-only">{RANDOM_DRAW_LEGEND[slot]}</legend>
        <span>Each card shows</span>
        {Array.from({ length: size }, (_, i) => i + 1).map((count) => {
          const chosen = state.counts[slot].includes(count);
          return (
            <label
              key={count}
              className={`tappable-sm relative flex h-7.5 w-8 cursor-pointer items-center justify-center rounded-full text-sm font-semibold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--color-ink) ${chosen ? 'tappable-pressed bg-(--color-ink) text-(--color-surface)' : 'bg-(--color-surface) text-(--color-ink)'}`}
            >
              <input
                type="checkbox"
                checked={chosen}
                onChange={() => onToggleCount(slot, count)}
                className="sr-only"
              />
              {count}
            </label>
          );
        })}
        <span>of these</span>
      </fieldset>
    );
  };

  const sideCard = (side: 'prompt' | 'answer') => {
    const alwaysSlot: BoardSlot = side === 'prompt' ? 'prompt_fields' : 'answer_fields';
    const randomSlot: PoolSlot = side === 'prompt' ? 'prompt_pool' : 'answer_pool';
    return (
      <section
        key={side}
        aria-label={side === 'prompt' ? 'Prompt side' : 'Answer side'}
        className="tappable flex flex-col rounded-block bg-(--color-surface) px-4"
      >
        <h2 className="flex h-10 items-center ruled-bottom text-sm font-semibold text-(--color-ink)">
          {side === 'prompt' ? 'Prompt side' : 'Answer side'}
        </h2>
        <section aria-label={SLOT_LABELS[alwaysSlot]} className="flex flex-col gap-2 pt-2.5 pb-3">
          <h3 className="text-label text-(--color-aside)">Always shown</h3>
          {area(alwaysSlot, 'None yet.')}
        </section>
        <section
          aria-label={SLOT_LABELS[randomSlot]}
          className="flex flex-col gap-2 border-t border-(--color-line) pt-2.5 pb-3"
        >
          <h3 className="text-label text-(--color-aside)">Random draw</h3>
          {area(randomSlot, 'None yet.')}
          {frequencyRow(randomSlot)}
        </section>
      </section>
    );
  };

  const activeSlot = activeFieldId ? state.slots[activeFieldId] : null;
  const activeName = activeFieldId ? (nameById.get(activeFieldId) ?? activeFieldId) : '';

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-label={SLOT_LABELS.unassigned}
        className="flex flex-col gap-2 rounded-block outlined-ink-dashed px-4 pt-3 pb-3.5"
      >
        <h2 className="text-sm font-semibold text-(--color-ink)">{SLOT_LABELS.unassigned}</h2>
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
        <h2 id={titleId} className="text-base font-semibold text-(--color-ink)">
          Move "{activeName}" to…
        </h2>
        <ul className="mt-3 flex flex-col gap-3">
          {DESTINATIONS.filter((destination) => destination !== activeSlot).map((destination) => (
            <li key={destination}>
              <button
                type="button"
                onClick={() => {
                  if (activeFieldId) onMove(activeFieldId, destination);
                  closeSheet();
                }}
                className="tappable flex min-h-14 w-full items-center rounded-2xl bg-(--color-surface) px-4 py-2 text-left font-medium text-(--color-ink)"
              >
                {SLOT_LABELS[destination]}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </div>
  );
}
