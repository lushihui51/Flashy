import { describe, it, expect } from 'vitest';
import { buildDeckBatchEditPayload } from 'src/lib/deckEditorDiff';
import type { DeckEditorState, EditorField } from 'src/lib/deckEditorReducer';

const FRONT: EditorField = { key: 'k-front', id: 'front-id', name: 'Front', type: 'text' };
const BACK: EditorField = { key: 'k-back', id: 'back-id', name: 'Back', type: 'text' };

function baseState(overrides: Partial<DeckEditorState> = {}): DeckEditorState {
  return {
    name: 'French Vocab',
    subjectId: 'subject-id',
    fields: [FRONT, BACK],
    dirty: false,
    ...overrides,
  };
}

describe('buildDeckBatchEditPayload', () => {
  it('no changes at all produces an empty body', () => {
    const original = baseState();
    const current = baseState({ fields: [{ ...FRONT }, { ...BACK }] }); // same content, new object identity
    expect(buildDeckBatchEditPayload(original, current)).toEqual({});
  });

  it('rename only: just name in the body, nothing else', () => {
    const original = baseState();
    const current = baseState({ name: 'Renamed Deck' });
    expect(buildDeckBatchEditPayload(original, current)).toEqual({ name: 'Renamed Deck' });
  });

  it('subject change only', () => {
    const original = baseState();
    const current = baseState({ subjectId: 'other-subject-id' });
    expect(buildDeckBatchEditPayload(original, current)).toEqual({ subject_id: 'other-subject-id' });
  });

  it('reorder only: field_defs.order flips, no create/update/delete', () => {
    const original = baseState();
    const current = baseState({ fields: [{ ...BACK }, { ...FRONT }] });
    expect(buildDeckBatchEditPayload(original, current)).toEqual({
      field_defs: { create: [], update: [], delete: [], order: ['back-id', 'front-id'] },
    });
  });

  it('field rename produces an update entry, not a create', () => {
    const original = baseState();
    const current = baseState({ fields: [{ ...FRONT, name: 'Word' }, { ...BACK }] });
    expect(buildDeckBatchEditPayload(original, current)).toEqual({
      field_defs: {
        create: [],
        update: [{ id: 'front-id', name: 'Word' }],
        delete: [],
        order: ['front-id', 'back-id'],
      },
    });
  });

  it('field delete produces a delete entry and drops it from order', () => {
    const original = baseState();
    const current = baseState({ fields: [{ ...FRONT }] });
    expect(buildDeckBatchEditPayload(original, current)).toEqual({
      field_defs: { create: [], update: [], delete: ['back-id'], order: ['front-id'] },
    });
  });

});

describe('buildDeckBatchEditPayload — pending removal (Phase 7.5)', () => {
  it('a pending field lands in field_defs.delete and is excluded from order', () => {
    const original = baseState();
    const current = baseState({ fields: [{ ...FRONT }, { ...BACK, pendingRemoval: true }] });
    expect(buildDeckBatchEditPayload(original, current)).toEqual({
      field_defs: { create: [], update: [], delete: ['back-id'], order: ['front-id'] },
    });
  });

  it('reverting a pending field back to false (Phase 7.5\'s global Undo does this via LOAD) produces no diff', () => {
    const original = baseState();
    const markedPending = baseState({ fields: [{ ...FRONT }, { ...BACK, pendingRemoval: true }] });
    const undone = baseState({ fields: [{ ...FRONT }, { ...BACK, pendingRemoval: false }] });
    expect(buildDeckBatchEditPayload(original, markedPending)).not.toEqual({});
    expect(buildDeckBatchEditPayload(original, undone)).toEqual({});
  });

});
