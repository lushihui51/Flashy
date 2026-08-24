import { describe, it, expect } from 'vitest';
import {
  boardFromConfig,
  boardToPayload,
  boardValidationError,
  emptyBoard,
  fieldsIn,
  hasAnyAssignment,
  moveField,
  pruneCounts,
  toggleCount,
} from 'src/lib/practiceConfigBoard';

const fieldDefs = [
  { id: 'f3', name: 'Reading', type: 'text' as const, position: 2 },
  { id: 'f1', name: 'Term', type: 'text' as const, position: 0 },
  { id: 'f2', name: 'Meaning', type: 'text' as const, position: 1 },
];

const emptyConfigArrays = {
  prompt_field_ids: [],
  answer_field_ids: [],
  prompt_pool_ids: [],
  prompt_pool_counts: [],
  answer_pool_ids: [],
  answer_pool_counts: [],
};

describe('emptyBoard', () => {
  it("starts every field unassigned, in the deck's own position order", () => {
    const board = emptyBoard(fieldDefs);

    expect(board.order).toEqual(['f1', 'f2', 'f3']);
    expect(fieldsIn(board, 'unassigned')).toEqual(['f1', 'f2', 'f3']);
    expect(hasAnyAssignment(board)).toBe(false);
  });
});

describe('moveField', () => {
  it('moves rather than copies — a field is in exactly one place', () => {
    let board = emptyBoard(fieldDefs);
    board = moveField(board, 'f1', 'prompt_fields');
    board = moveField(board, 'f1', 'answer_pool');

    expect(fieldsIn(board, 'prompt_fields')).toEqual([]);
    expect(fieldsIn(board, 'answer_pool')).toEqual(['f1']);
    expect(fieldsIn(board, 'unassigned')).toEqual(['f2', 'f3']);
  });

  it('rows render in deck order regardless of the order fields were added', () => {
    let board = emptyBoard(fieldDefs);
    board = moveField(board, 'f3', 'prompt_pool');
    board = moveField(board, 'f1', 'prompt_pool');

    expect(fieldsIn(board, 'prompt_pool')).toEqual(['f1', 'f3']);
  });

  it('prunes counts that no longer fit when a pool row shrinks', () => {
    let board = emptyBoard(fieldDefs);
    board = moveField(board, 'f1', 'prompt_pool');
    board = moveField(board, 'f2', 'prompt_pool');
    board = toggleCount(board, 'prompt_pool', 1);
    board = toggleCount(board, 'prompt_pool', 2);
    expect(board.counts.prompt_pool).toEqual([1, 2]);

    board = moveField(board, 'f2', 'unassigned');

    expect(board.counts.prompt_pool).toEqual([1]);
  });

  it("leaves the other pool's counts alone", () => {
    let board = emptyBoard(fieldDefs);
    board = moveField(board, 'f1', 'answer_pool');
    board = toggleCount(board, 'answer_pool', 1);
    board = moveField(board, 'f2', 'prompt_pool');
    board = moveField(board, 'f2', 'unassigned');

    expect(board.counts.answer_pool).toEqual([1]);
  });

  it('is a no-op for an unknown field or a move to where it already is', () => {
    const board = moveField(emptyBoard(fieldDefs), 'f1', 'prompt_fields');

    expect(moveField(board, 'nope', 'answer_fields')).toBe(board);
    expect(moveField(board, 'f1', 'prompt_fields')).toBe(board);
  });
});

describe('toggleCount', () => {
  it('checks, unchecks, and keeps the list ascending', () => {
    let board = emptyBoard(fieldDefs);
    board = moveField(board, 'f1', 'prompt_pool');
    board = moveField(board, 'f2', 'prompt_pool');
    board = moveField(board, 'f3', 'prompt_pool');

    board = toggleCount(board, 'prompt_pool', 3);
    board = toggleCount(board, 'prompt_pool', 1);
    expect(board.counts.prompt_pool).toEqual([1, 3]);

    board = toggleCount(board, 'prompt_pool', 3);
    expect(board.counts.prompt_pool).toEqual([1]);
  });
});

describe('pruneCounts', () => {
  it('drops out-of-range values, dedupes, and sorts', () => {
    expect(pruneCounts([3, 1, 1, 0, 5], 3)).toEqual([1, 3]);
    expect(pruneCounts([1, 2], 0)).toEqual([]);
  });
});

describe('boardFromConfig', () => {
  it('re-hydrates each of the four arrays into its row', () => {
    const board = boardFromConfig(fieldDefs, {
      ...emptyConfigArrays,
      prompt_field_ids: ['f1'],
      answer_field_ids: ['f2'],
      prompt_pool_ids: ['f3'],
      prompt_pool_counts: [1],
    });

    expect(fieldsIn(board, 'prompt_fields')).toEqual(['f1']);
    expect(fieldsIn(board, 'answer_fields')).toEqual(['f2']);
    expect(fieldsIn(board, 'prompt_pool')).toEqual(['f3']);
    expect(board.counts.prompt_pool).toEqual([1]);
  });

  it('drops ids the deck no longer has live, and prunes counts to what survived', () => {
    // 'archived' was archived after the config was saved: it must not appear anywhere in
    // the builder (invariant 5), and the count of 2 it made possible goes with it.
    const board = boardFromConfig(fieldDefs, {
      ...emptyConfigArrays,
      answer_field_ids: ['f1'],
      prompt_pool_ids: ['f2', 'archived'],
      prompt_pool_counts: [1, 2],
    });

    expect(board.order).not.toContain('archived');
    expect(fieldsIn(board, 'prompt_pool')).toEqual(['f2']);
    expect(board.counts.prompt_pool).toEqual([1]);
  });
});

describe('boardToPayload', () => {
  it('maps rows to the six arrays, uuids only, counts ascending', () => {
    let board = emptyBoard(fieldDefs);
    board = moveField(board, 'f1', 'prompt_fields');
    board = moveField(board, 'f2', 'answer_pool');
    board = moveField(board, 'f3', 'answer_pool');
    board = toggleCount(board, 'answer_pool', 2);
    board = toggleCount(board, 'answer_pool', 1);

    expect(boardToPayload(board)).toEqual({
      prompt_field_ids: ['f1'],
      answer_field_ids: [],
      prompt_pool_ids: [],
      prompt_pool_counts: [],
      answer_pool_ids: ['f2', 'f3'],
      answer_pool_counts: [1, 2],
    });
  });
});

describe('boardValidationError', () => {
  function boardWith(
    assignments: [string, Parameters<typeof moveField>[2]][],
    counts: [Parameters<typeof toggleCount>[1], number][] = [],
  ) {
    let board = emptyBoard(fieldDefs);
    for (const [id, slot] of assignments) board = moveField(board, id, slot);
    for (const [slot, n] of counts) board = toggleCount(board, slot, n);
    return board;
  }

  it('accepts fixed fields on both sides', () => {
    expect(
      boardValidationError(
        boardWith([
          ['f1', 'prompt_fields'],
          ['f2', 'answer_fields'],
        ]),
      ),
    ).toBeNull();
  });

  it('accepts a counted pool in place of fixed fields on either side', () => {
    const board = boardWith(
      [
        ['f1', 'prompt_pool'],
        ['f2', 'answer_pool'],
      ],
      [
        ['prompt_pool', 1],
        ['answer_pool', 1],
      ],
    );
    expect(boardValidationError(board)).toBeNull();
  });

  it('rejects a pool with fields but no checked counts — it would draw nothing', () => {
    const board = boardWith([
      ['f1', 'prompt_pool'],
      ['f2', 'answer_fields'],
    ]);
    expect(boardValidationError(board)).toMatch(/how many prompt pool fields/);
  });

  it('rejects an answer pool with fields but no checked counts', () => {
    const board = boardWith([
      ['f1', 'prompt_fields'],
      ['f2', 'answer_pool'],
    ]);
    expect(boardValidationError(board)).toMatch(/how many answer pool fields/);
  });

  it('rejects a side with nothing on it at all', () => {
    expect(boardValidationError(boardWith([['f2', 'answer_fields']]))).toMatch(
      /at least one prompt field/,
    );
    expect(boardValidationError(boardWith([['f1', 'prompt_fields']]))).toMatch(
      /at least one answer field/,
    );
  });

  it('rejects an empty board', () => {
    expect(boardValidationError(emptyBoard(fieldDefs))).not.toBeNull();
  });
});
