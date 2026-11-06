import type { components } from 'src/api/types';

export type ChangeKind = components['schemas']['ChangeKind'];
export const CHANGE_KINDS = ['up_a_lot', 'up', 'no_change', 'down', 'down_a_lot'] as const satisfies readonly ChangeKind[];
/** The words a kind is spoken by, after "Mastery N%" on a row and before a count. */
export const CHANGE_WORDS: Record<ChangeKind, string> = {
  up_a_lot: 'up a lot',
  up: 'up',
  no_change: 'no change',
  down: 'down',
  down_a_lot: 'down a lot',
};
