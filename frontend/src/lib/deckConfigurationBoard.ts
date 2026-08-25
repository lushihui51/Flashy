import type { components } from 'src/api/types';

type DeckFieldDef = components['schemas']['DeckFieldDefRead'];
type DeckPracticeConfigCreate = components['schemas']['DeckPracticeConfigCreate'];

/** The five places a field can be. `unassigned` is the box above the table; the other
 * four are the config's four arrays. */
export const BOARD_SLOTS = [
  'unassigned',
  'prompt_fields',
  'answer_fields',
  'prompt_pool',
  'answer_pool',
] as const;

export type BoardSlot = (typeof BOARD_SLOTS)[number];

export const POOL_SLOTS = ['prompt_pool', 'answer_pool'] as const;
export type PoolSlot = (typeof POOL_SLOTS)[number];

export function isPoolSlot(slot: BoardSlot): slot is PoolSlot {
  return slot === 'prompt_pool' || slot === 'answer_pool';
}

export const SLOT_LABELS: Record<BoardSlot, string> = {
  unassigned: 'Unassigned',
  prompt_fields: 'Prompt fields',
  answer_fields: 'Answer fields',
  prompt_pool: 'Prompt pool',
  answer_pool: 'Answer pool',
};

/**
 * Where every field currently sits, plus the pool draw counts.
 *
 * `slots` is keyed by field id and holds exactly one slot per field, which is what makes
 * the four arrays pairwise disjoint *by construction* (invariant 6) — assigning a field
 * moves it, and there is no representable state where it is in two places at once.
 *
 * Field order inside a row is not modelled: the four arrays are sets to the backend, so
 * rows always render in the deck's own field order (`order`) instead of carrying a
 * second, meaningless ordering the user would have to maintain.
 */
export type BoardState = {
  order: string[];
  slots: Record<string, BoardSlot>;
  counts: Record<PoolSlot, number[]>;
};

export function fieldsIn(state: BoardState, slot: BoardSlot): string[] {
  return state.order.filter((id) => state.slots[id] === slot);
}

export function emptyBoard(fieldDefs: DeckFieldDef[]): BoardState {
  const order = [...fieldDefs].sort((a, b) => a.position - b.position).map((f) => f.id);
  return {
    order,
    slots: Object.fromEntries(order.map((id) => [id, 'unassigned' as BoardSlot])),
    counts: { prompt_pool: [], answer_pool: [] },
  };
}

/**
 * An existing config re-hydrated onto the board.
 *
 * Ids the config references but the deck no longer has live are dropped rather than
 * rendered: archived fields never appear in the builder (invariant 5), and a config
 * saved before a field was archived still names it. Saving from this board therefore
 * also repairs the config — which is the same thing session start would otherwise
 * reject it for.
 */
export function boardFromConfig(
  fieldDefs: DeckFieldDef[],
  config: Pick<
    DeckPracticeConfigCreate,
    | 'prompt_field_ids'
    | 'answer_field_ids'
    | 'prompt_pool_ids'
    | 'prompt_pool_counts'
    | 'answer_pool_ids'
    | 'answer_pool_counts'
  >,
): BoardState {
  const board = emptyBoard(fieldDefs);
  const live = new Set(board.order);

  const assign = (ids: string[], slot: BoardSlot) => {
    for (const id of ids) if (live.has(id)) board.slots[id] = slot;
  };
  assign(config.prompt_field_ids, 'prompt_fields');
  assign(config.answer_field_ids, 'answer_fields');
  assign(config.prompt_pool_ids, 'prompt_pool');
  assign(config.answer_pool_ids, 'answer_pool');

  // Counts are pruned against what actually survived, so a config whose pool lost a
  // field to archival doesn't load with a count it can no longer reach.
  return {
    ...board,
    counts: {
      prompt_pool: pruneCounts(config.prompt_pool_counts, fieldsIn(board, 'prompt_pool').length),
      answer_pool: pruneCounts(config.answer_pool_counts, fieldsIn(board, 'answer_pool').length),
    },
  };
}

/** Checked draw counts are only meaningful up to the number of fields in the row, so a
 * row that shrinks drops the counts it can no longer satisfy. Always sorted ascending —
 * the payload's order, so nothing downstream has to re-sort. */
export function pruneCounts(counts: number[], size: number): number[] {
  return [...new Set(counts.filter((n) => n >= 1 && n <= size))].sort((a, b) => a - b);
}

export function moveField(state: BoardState, fieldId: string, to: BoardSlot): BoardState {
  if (!(fieldId in state.slots) || state.slots[fieldId] === to) return state;

  const next: BoardState = { ...state, slots: { ...state.slots, [fieldId]: to } };
  return {
    ...next,
    counts: {
      prompt_pool: pruneCounts(next.counts.prompt_pool, fieldsIn(next, 'prompt_pool').length),
      answer_pool: pruneCounts(next.counts.answer_pool, fieldsIn(next, 'answer_pool').length),
    },
  };
}

export function toggleCount(state: BoardState, slot: PoolSlot, count: number): BoardState {
  const current = state.counts[slot];
  const next = current.includes(count)
    ? current.filter((n) => n !== count)
    : [...current, count].sort((a, b) => a - b);
  return { ...state, counts: { ...state.counts, [slot]: next } };
}

export function hasAnyAssignment(state: BoardState): boolean {
  return state.order.some((id) => state.slots[id] !== 'unassigned');
}

export type ConfigPayloadArrays = Pick<
  DeckPracticeConfigCreate,
  | 'prompt_field_ids'
  | 'answer_field_ids'
  | 'prompt_pool_ids'
  | 'prompt_pool_counts'
  | 'answer_pool_ids'
  | 'answer_pool_counts'
>;

/** Uuids only — names are display strings and never travel (invariant 4). */
export function boardToPayload(state: BoardState): ConfigPayloadArrays {
  return {
    prompt_field_ids: fieldsIn(state, 'prompt_fields'),
    answer_field_ids: fieldsIn(state, 'answer_fields'),
    prompt_pool_ids: fieldsIn(state, 'prompt_pool'),
    prompt_pool_counts: state.counts.prompt_pool,
    answer_pool_ids: fieldsIn(state, 'answer_pool'),
    answer_pool_counts: state.counts.answer_pool,
  };
}

/**
 * The backend's rules, restated for the Save button (`app/services/deck_practice_config.py`
 * stays authoritative — this only decides whether it is worth asking).
 *
 * Disjointness is absent on purpose: the board cannot express an overlap, so there is
 * nothing to check. Returns the first unmet rule as a sentence to show under Save, or
 * null when the config is saveable.
 */
export function boardValidationError(state: BoardState): string | null {
  const promptFields = fieldsIn(state, 'prompt_fields');
  const answerFields = fieldsIn(state, 'answer_fields');
  const promptPool = fieldsIn(state, 'prompt_pool');
  const answerPool = fieldsIn(state, 'answer_pool');

  if (promptPool.length > 0 && state.counts.prompt_pool.length === 0) {
    return 'Choose how many prompt pool fields each card should draw.';
  }
  if (answerPool.length > 0 && state.counts.answer_pool.length === 0) {
    return 'Choose how many answer pool fields each card should draw.';
  }
  if (promptFields.length === 0 && promptPool.length === 0) {
    return 'Add at least one prompt field, or fields to the prompt pool.';
  }
  if (answerFields.length === 0 && answerPool.length === 0) {
    return 'Add at least one answer field, or fields to the answer pool.';
  }
  return null;
}
