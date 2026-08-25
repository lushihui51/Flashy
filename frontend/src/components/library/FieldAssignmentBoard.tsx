import { useState } from 'react';
import {
  BOARD_SLOTS,
  SLOT_LABELS,
  fieldsIn,
  isPoolSlot,
  type BoardSlot,
  type BoardState,
  type PoolSlot,
} from 'src/lib/deckConfigurationBoard';
import type { components } from 'src/api/types';

type DeckFieldDef = components['schemas']['DeckFieldDefRead'];

const ROW_SLOTS = ['prompt_fields', 'answer_fields', 'prompt_pool', 'answer_pool'] as const;

type FieldAssignmentBoardProps = {
  /** The deck's **live** fields, already fetched by the page — archived fields never
   * reach here (invariant 5). */
  fieldDefs: DeckFieldDef[];
  state: BoardState;
  onMove: (fieldId: string, to: BoardSlot) => void;
  onToggleCount: (slot: PoolSlot, count: number) => void;
};

/**
 * The assignment board: an unassigned box over a four-row table, where every field sits
 * in exactly one place.
 *
 * Assignment has two paths on purpose. Dragging is the fast one, but HTML5 drag events
 * never fire on touch, and a hand-rolled pointer-drag would be code that can't be
 * verified on a real device — so each chip also carries a plain `<select>` of
 * destinations, which works with touch, keyboard and a screen reader alike. Both paths
 * call the same `onMove`.
 */
export default function FieldAssignmentBoard({
  fieldDefs,
  state,
  onMove,
  onToggleCount,
}: FieldAssignmentBoardProps) {
  const [dragOver, setDragOver] = useState<BoardSlot | null>(null);
  const nameById = new Map(fieldDefs.map((field) => [field.id, field.name]));

  const dropProps = (slot: BoardSlot) => ({
    onDragOver: (event: React.DragEvent) => {
      event.preventDefault();
      setDragOver(slot);
    },
    onDragLeave: () => setDragOver((current) => (current === slot ? null : current)),
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      setDragOver(null);
      const fieldId = event.dataTransfer.getData('text/plain');
      if (fieldId) onMove(fieldId, slot);
    },
  });

  const chips = (slot: BoardSlot) =>
    fieldsIn(state, slot).map((fieldId) => (
      <span
        key={fieldId}
        draggable
        onDragStart={(event) => event.dataTransfer.setData('text/plain', fieldId)}
        className="flex items-center gap-1 rounded-full bg-(--color-surface-elevated) py-1 pr-1 pl-3 text-sm text-(--color-text)"
      >
        <span className="truncate">{nameById.get(fieldId) ?? fieldId}</span>
        <select
          aria-label={`Move ${nameById.get(fieldId) ?? fieldId}`}
          value={slot}
          onChange={(event) => onMove(fieldId, event.target.value as BoardSlot)}
          className="h-7 rounded-full bg-transparent px-1 text-xs text-(--color-text-secondary)"
        >
          {BOARD_SLOTS.map((target) => (
            <option key={target} value={target}>
              {SLOT_LABELS[target]}
            </option>
          ))}
        </select>
      </span>
    ));

  const zoneClass = (slot: BoardSlot) =>
    `flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-dashed p-2 ${
      dragOver === slot ? 'border-(--color-primary)' : 'border-(--color-surface-elevated)'
    }`;

  return (
    <div className="flex flex-col gap-4">
      <section aria-label={SLOT_LABELS.unassigned}>
        <h2 className="pb-1 text-sm font-medium text-(--color-text-muted)">
          {SLOT_LABELS.unassigned}
        </h2>
        <div {...dropProps('unassigned')} className={zoneClass('unassigned')}>
          {chips('unassigned').length > 0 ? (
            chips('unassigned')
          ) : (
            <span className="px-1 text-sm text-(--color-text-muted)">Every field is assigned.</span>
          )}
        </div>
      </section>

      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className="text-left text-sm text-(--color-text-muted)">
            <th scope="col" className="w-28 pb-1 font-medium">
              <span className="sr-only">Row</span>
            </th>
            <th scope="col" className="pb-1 font-medium">
              Fields
            </th>
            <th scope="col" className="w-40 pb-1 font-medium">
              Frequency
            </th>
          </tr>
        </thead>
        <tbody>
          {ROW_SLOTS.map((slot) => {
            const size = fieldsIn(state, slot).length;
            const pool = isPoolSlot(slot);
            return (
              <tr key={slot} className="align-top">
                <th
                  scope="row"
                  className="py-1 pr-2 text-left text-sm font-medium text-(--color-text)"
                >
                  {SLOT_LABELS[slot]}
                </th>
                <td className="py-1 pr-2">
                  <div {...dropProps(slot)} className={zoneClass(slot)}>
                    {chips(slot)}
                  </div>
                </td>
                <td className="py-1">
                  {/* Frequency only means something for a pool: the fixed rows are always
                      shown in full, so there is no count to choose. */}
                  {!pool || size === 0 ? (
                    <span className="text-sm text-(--color-text-muted)">N/A</span>
                  ) : (
                    <fieldset className="flex flex-wrap items-center gap-2">
                      <legend className="sr-only">
                        How many {SLOT_LABELS[slot]} fields to draw per card
                      </legend>
                      {Array.from({ length: size }, (_, i) => i + 1).map((count) => (
                        <label
                          key={count}
                          className="flex items-center gap-1 text-sm text-(--color-text)"
                        >
                          <input
                            type="checkbox"
                            checked={state.counts[slot as PoolSlot].includes(count)}
                            onChange={() => onToggleCount(slot as PoolSlot, count)}
                          />
                          {count}
                        </label>
                      ))}
                    </fieldset>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="text-[13px] text-(--color-text-muted)">
        A pool draws one of its checked counts at random for each card — checking 1 and 3 means some
        cards show one of these fields and others show three.
      </p>
    </div>
  );
}
