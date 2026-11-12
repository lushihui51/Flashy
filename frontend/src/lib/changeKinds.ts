import type { components } from 'src/api/types';

export type ChangeKind = components['schemas']['ChangeKind'];
export const CHANGE_KINDS = [
  'up_a_lot',
  'up',
  'no_change',
  'down',
  'down_a_lot',
] as const satisfies readonly ChangeKind[];
/** The words a kind is spoken by, after "Mastery N%" on a row and before a count. */
export const CHANGE_WORDS: Record<ChangeKind, string> = {
  up_a_lot: 'up a lot',
  up: 'up',
  no_change: 'no change',
  down: 'down',
  down_a_lot: 'down a lot',
};

/** How many of the cards had each kind of change. */
export function countChanges(cards: { change: ChangeKind }[]): Record<ChangeKind, number> {
  const counts: Record<ChangeKind, number> = {
    up_a_lot: 0,
    up: 0,
    no_change: 0,
    down: 0,
    down_a_lot: 0,
  };
  for (const card of cards) counts[card.change] += 1;
  return counts;
}
