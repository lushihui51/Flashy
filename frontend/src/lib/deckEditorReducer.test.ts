import { describe, it, expect } from 'vitest';
import {
  deckEditorReducer,
  initialDeckEditorState,
  isDeckEditorValid,
  buildDeckCreatePayload,
  deckDetailToEditorState,
  type DeckEditorState,
} from 'src/lib/deckEditorReducer';
import type { components } from 'src/api/types';

type DeckDetail = components['schemas']['DeckDetail'];

function stateWithFields(names: string[]): DeckEditorState {
  let state = initialDeckEditorState('subject-1');
  // Replace the two defaults with a fresh set so tests can pick their own names/keys.
  state = { ...state, fields: names.map((name, i) => ({ key: `f${i}`, name, type: 'text' as const })) };
  return state;
}

// A "saved" field carries an `id` — the only thing that distinguishes staged removal
// (Phase 7.5) from an outright delete of a brand-new one.
function stateWithSavedFields(names: string[]): DeckEditorState {
  let state = initialDeckEditorState('subject-1');
  state = {
    ...state,
    fields: names.map((name, i) => ({ key: `f${i}`, id: `id${i}`, name, type: 'text' as const })),
  };
  return state;
}

describe('deckEditorReducer', () => {
  it('initial state starts with Term and Definition, not dirty', () => {
    const state = initialDeckEditorState();
    expect(state.fields.map((f) => f.name)).toEqual(['Term', 'Definition']);
    expect(state.dirty).toBe(false);
    expect(state.subjectId).toBeNull();
  });

  it('ADD_FIELD appends a blank field and marks dirty', () => {
    const state = deckEditorReducer(initialDeckEditorState(), { type: 'ADD_FIELD' });
    expect(state.fields).toHaveLength(3);
    expect(state.fields[2]?.name).toBe('');
    expect(state.dirty).toBe(true);
  });

  it('RENAME_FIELD renames only the targeted field', () => {
    const initial = stateWithFields(['A', 'B']);
    const state = deckEditorReducer(initial, { type: 'RENAME_FIELD', key: 'f0', name: 'Word' });
    expect(state.fields.map((f) => f.name)).toEqual(['Word', 'B']);
  });

  it('REMOVE_FIELD drops a brand-new field outright', () => {
    const state = deckEditorReducer(stateWithFields(['A', 'B', 'C']), {
      type: 'REMOVE_FIELD',
      key: 'f0',
    });
    expect(state.fields.map((f) => f.key)).toEqual(['f1', 'f2']);
    expect(state.dirty).toBe(true);
  });

  it('REMOVE_FIELD is a no-op once only two fields remain (D3)', () => {
    const initial = stateWithFields(['A', 'B']);
    const state = deckEditorReducer(initial, { type: 'REMOVE_FIELD', key: 'f0' });
    expect(state.fields).toHaveLength(2);
    expect(state.fields.map((f) => f.key)).toEqual(['f0', 'f1']);
  });

  it('MOVE_FIELD reorders the fields list', () => {
    const initial = stateWithFields(['A', 'B', 'C']);
    const state = deckEditorReducer(initial, { type: 'MOVE_FIELD', key: 'f2', toIndex: 0 });
    expect(state.fields.map((f) => f.key)).toEqual(['f2', 'f0', 'f1']);
  });

  it('MOVE_FIELD clamps out-of-range indices', () => {
    const initial = stateWithFields(['A', 'B']);
    const state = deckEditorReducer(initial, { type: 'MOVE_FIELD', key: 'f0', toIndex: 99 });
    expect(state.fields.map((f) => f.key)).toEqual(['f1', 'f0']);
  });

});

describe('pending removal (Phase 7.5)', () => {
  it('REMOVE_FIELD on a saved field stages it instead of dropping it', () => {
    const initial = stateWithSavedFields(['A', 'B', 'C']);
    const state = deckEditorReducer(initial, { type: 'REMOVE_FIELD', key: 'f0' });
    expect(state.fields).toHaveLength(3); // still in the list, at its original position
    expect(state.fields[0]).toMatchObject({ key: 'f0', pendingRemoval: true });
    expect(state.dirty).toBe(true);
  });

  it('REMOVE_FIELD on a brand-new (id-less) field still drops it outright', () => {
    const initial = stateWithFields(['A', 'B', 'C']);
    const state = deckEditorReducer(initial, { type: 'REMOVE_FIELD', key: 'f0' });
    expect(state.fields.map((f) => f.key)).toEqual(['f1', 'f2']);
  });

  it('D3 floor counts non-pending fields only — blocks staging a second field at two active', () => {
    const initial = stateWithSavedFields(['A', 'B', 'C']);
    let state = deckEditorReducer(initial, { type: 'REMOVE_FIELD', key: 'f0' }); // 2 active left
    state = deckEditorReducer(state, { type: 'REMOVE_FIELD', key: 'f1' }); // blocked
    expect(state.fields[1]!.key).toBe('f1');
    expect(state.fields[1]!.pendingRemoval).not.toBe(true);
  });

  it('LOAD replaces the whole state wholesale — this is the global Undo', () => {
    const original = stateWithSavedFields(['A', 'B', 'C']);
    let state = original;
    state = deckEditorReducer(state, { type: 'RENAME_FIELD', key: 'f0', name: 'Renamed' });
    state = deckEditorReducer(state, { type: 'ADD_FIELD' });
    state = deckEditorReducer(state, { type: 'REMOVE_FIELD', key: 'f1' }); // stages B
    expect(state.dirty).toBe(true);
    expect(state.fields).toHaveLength(4);

    const reverted = deckEditorReducer(state, { type: 'LOAD', state: original });
    expect(reverted).toBe(original);
    expect(reverted.dirty).toBe(false);
    expect(reverted.fields.map((f) => [f.name, f.pendingRemoval])).toEqual([
      ['A', undefined],
      ['B', undefined],
      ['C', undefined],
    ]);
  });
});

describe('deckDetailToEditorState', () => {
  const deck: DeckDetail = {
    id: 'deck-1',
    name: 'French Vocab',
    subject_id: 'subject-1',
    created_at: '',
    last_activity_at: '',
    field_defs: [
      { id: 'back-id', name: 'Back', type: 'text', position: 1 },
      { id: 'front-id', name: 'Front', type: 'text', position: 0 },
    ],
    cards: [
      { id: 'card-1', deck_id: 'deck-1', created_at: '', values: { 'front-id': 'Bonjour', 'back-id': 'Hello' } },
    ],
  };

  it('orders fields by position, not by array order, and keeps their real ids', () => {
    const state = deckDetailToEditorState(deck);
    expect(state.fields.map((f) => [f.name, f.id])).toEqual([
      ['Front', 'front-id'],
      ['Back', 'back-id'],
    ]);
    expect(state.dirty).toBe(false);
  });

  it('two separate calls mint different keys — callers must reuse one result as both initial and original', () => {
    const a = deckDetailToEditorState(deck);
    const b = deckDetailToEditorState(deck);
    expect(a.fields[0]!.key).not.toBe(b.fields[0]!.key);
  });
});

describe('isDeckEditorValid', () => {
  it('requires a name, a subject, at least two fields, and non-empty non-duplicate field names', () => {
    const base = stateWithFields(['A', 'B']);
    expect(isDeckEditorValid({ ...base, name: '' })).toBe(false);
    expect(isDeckEditorValid({ ...base, name: 'Deck', subjectId: null })).toBe(false);
    expect(isDeckEditorValid({ ...base, name: 'Deck' })).toBe(true);
    expect(isDeckEditorValid(stateWithFields(['A', '']))).toBe(false);
    expect(isDeckEditorValid({ ...stateWithFields(['A', 'a']), name: 'Deck' })).toBe(false); // case-insensitive dup
  });

  it('D3: fewer than two fields is invalid, even with a name and subject chosen', () => {
    expect(isDeckEditorValid({ ...stateWithFields(['A']), name: 'Deck' })).toBe(false);
    expect(isDeckEditorValid({ ...stateWithFields([]), name: 'Deck' })).toBe(false);
  });

  it('Phase 7.5: a pending-removal field is exempt from name validation', () => {
    // Two active fields (A, B) plus a third staged for removal — the floor is
    // satisfied by the two active ones regardless of what the pending one looks like.
    const base = stateWithSavedFields(['A', 'B', 'C']);
    const pendingBlank: DeckEditorState = {
      ...base,
      name: 'Deck',
      fields: [base.fields[0]!, base.fields[1]!, { ...base.fields[2]!, name: '', pendingRemoval: true }],
    };
    expect(isDeckEditorValid(pendingBlank)).toBe(true);

    const pendingDuplicate: DeckEditorState = {
      ...base,
      name: 'Deck',
      fields: [base.fields[0]!, base.fields[1]!, { ...base.fields[2]!, name: 'A', pendingRemoval: true }],
    };
    expect(isDeckEditorValid(pendingDuplicate)).toBe(true);
  });

  it('Phase 7.5: two pending fields with only two active left below D3 is still invalid', () => {
    const base = stateWithSavedFields(['A', 'B', 'C']);
    const state: DeckEditorState = {
      ...base,
      name: 'Deck',
      fields: [
        { ...base.fields[0]!, pendingRemoval: true },
        { ...base.fields[1]!, pendingRemoval: true },
        base.fields[2]!,
      ],
    };
    expect(isDeckEditorValid(state)).toBe(false); // only 1 active field
  });
});

describe('buildDeckCreatePayload', () => {
  it('trims the deck name and field names', () => {
    const state: DeckEditorState = {
      ...stateWithFields(['  Front  ']),
      name: '  My Deck  ',
    };
    const payload = buildDeckCreatePayload(state);
    expect(payload.name).toBe('My Deck');
    expect(payload.field_defs[0]?.name).toBe('Front');
  });
});
