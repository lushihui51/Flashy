import { describe, it, expect } from 'vitest';
import { buildDeckBatchEditPayload } from 'src/lib/deckEditorDiff';
import type { DeckEditorState, EditorField, EditorCard } from 'src/lib/deckEditorReducer';

const FRONT: EditorField = { key: 'k-front', id: 'front-id', name: 'Front', type: 'text' };
const BACK: EditorField = { key: 'k-back', id: 'back-id', name: 'Back', type: 'text' };

function baseState(overrides: Partial<DeckEditorState> = {}): DeckEditorState {
  return {
    name: 'French Vocab',
    subjectId: 'subject-id',
    fields: [FRONT, BACK],
    cards: [],
    dirty: false,
    ...overrides,
  };
}

function card(overrides: Partial<EditorCard> = {}): EditorCard {
  return { key: 'k-card', id: 'card-id', values: {}, ...overrides };
}

describe('buildDeckBatchEditPayload', () => {
  it('no changes at all produces an empty body', () => {
    const original = baseState();
    const current = baseState({ fields: [{ ...FRONT }, { ...BACK }] }); // same content, new object identity
    expect(buildDeckBatchEditPayload(original, current)).toEqual({});
  });

  it('unchanged cards with the same values produce no cards patch', () => {
    const withCard = baseState({
      cards: [card({ values: { [FRONT.key]: 'Bonjour', [BACK.key]: 'Hello' } })],
    });
    const original = withCard;
    const current = baseState({
      cards: [card({ values: { [FRONT.key]: 'Bonjour', [BACK.key]: 'Hello' } })],
    });
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

  it('new field + new card referencing it via the field key (client_key)', () => {
    const notes: EditorField = { key: 'k-notes', name: 'Notes', type: 'text' };
    const original = baseState();
    const current = baseState({
      fields: [{ ...FRONT }, { ...BACK }, notes],
      cards: [
        card({
          id: undefined,
          key: 'k-new-card',
          values: { [FRONT.key]: 'Bonjour', [BACK.key]: 'Hello', [notes.key]: 'greeting' },
        }),
      ],
    });
    const payload = buildDeckBatchEditPayload(original, current);
    expect(payload.field_defs).toEqual({
      create: [{ client_key: 'k-notes', name: 'Notes', type: 'text' }],
      update: [],
      delete: [],
      order: ['front-id', 'back-id', 'k-notes'],
    });
    expect(payload.cards).toEqual({
      create: [{ values: { 'front-id': 'Bonjour', 'back-id': 'Hello', 'k-notes': 'greeting' } }],
      update: [],
      delete: [],
    });
  });

  it('an all-blank new card is dropped, not sent as a create', () => {
    const original = baseState();
    const current = baseState({
      cards: [card({ id: undefined, key: 'k-blank', values: { [FRONT.key]: '', [BACK.key]: '  ' } })],
    });
    expect(buildDeckBatchEditPayload(original, current)).toEqual({});
  });

  it('existing card value change produces a partial update, only the changed field', () => {
    const original = baseState({
      cards: [card({ values: { [FRONT.key]: 'Bonjour', [BACK.key]: 'Hello' } })],
    });
    const current = baseState({
      cards: [card({ values: { [FRONT.key]: 'Bonjour', [BACK.key]: 'Salut' } })],
    });
    expect(buildDeckBatchEditPayload(original, current)).toEqual({
      cards: { create: [], update: [{ id: 'card-id', values: { 'back-id': 'Salut' } }], delete: [] },
    });
  });

  it('existing card gets a value for a same-request new field, via update not create', () => {
    const notes: EditorField = { key: 'k-notes', name: 'Notes', type: 'text' };
    const original = baseState({
      cards: [card({ values: { [FRONT.key]: 'Bonjour', [BACK.key]: 'Hello' } })],
    });
    const current = baseState({
      fields: [{ ...FRONT }, { ...BACK }, notes],
      cards: [
        card({ values: { [FRONT.key]: 'Bonjour', [BACK.key]: 'Hello', [notes.key]: 'greeting' } }),
      ],
    });
    const payload = buildDeckBatchEditPayload(original, current);
    expect(payload.cards).toEqual({
      create: [],
      update: [{ id: 'card-id', values: { 'k-notes': 'greeting' } }],
      delete: [],
    });
  });

  it('delete card produces a delete entry', () => {
    const original = baseState({
      cards: [card({ id: 'card-1' }), card({ id: 'card-2', key: 'k-card-2' })],
    });
    const current = baseState({ cards: [card({ id: 'card-1' })] });
    expect(buildDeckBatchEditPayload(original, current)).toEqual({
      cards: { create: [], update: [], delete: ['card-2'] },
    });
  });

  it('new card produces a create entry keyed by real field ids', () => {
    const original = baseState();
    const current = baseState({
      cards: [
        card({ id: undefined, key: 'k-new', values: { [FRONT.key]: 'Oui', [BACK.key]: 'Yes' } }),
      ],
    });
    expect(buildDeckBatchEditPayload(original, current)).toEqual({
      cards: { create: [{ values: { 'front-id': 'Oui', 'back-id': 'Yes' } }], update: [], delete: [] },
    });
  });

  it('mixed: rename deck, rename a field, add a card, delete a card, all in one payload', () => {
    const original = baseState({
      cards: [card({ id: 'keep' }), card({ id: 'gone', key: 'k-gone' })],
    });
    const current = baseState({
      name: 'Updated Name',
      fields: [{ ...FRONT, name: 'Word' }, { ...BACK }],
      cards: [
        card({ id: 'keep' }),
        card({ id: undefined, key: 'k-added', values: { [FRONT.key]: 'Bonsoir', [BACK.key]: 'Evening' } }),
      ],
    });
    expect(buildDeckBatchEditPayload(original, current)).toEqual({
      name: 'Updated Name',
      field_defs: {
        create: [],
        update: [{ id: 'front-id', name: 'Word' }],
        delete: [],
        order: ['front-id', 'back-id'],
      },
      cards: {
        create: [{ values: { 'front-id': 'Bonsoir', 'back-id': 'Evening' } }],
        update: [],
        delete: ['gone'],
      },
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

  it("a pending field's values are absent from any card update", () => {
    const original = baseState({
      cards: [card({ values: { [FRONT.key]: 'Bonjour', [BACK.key]: 'Hello' } })],
    });
    const current = baseState({
      fields: [{ ...FRONT, name: 'Word' }, { ...BACK, pendingRemoval: true }],
      cards: [card({ values: { [FRONT.key]: 'Bonjour', [BACK.key]: 'Salut' } })], // BACK changed too, but it's pending
    });
    const payload = buildDeckBatchEditPayload(original, current);
    expect(payload.field_defs?.update).toEqual([{ id: 'front-id', name: 'Word' }]);
    // no cards patch at all: the only card "change" was to a field that's being deleted
    expect(payload.cards).toBeUndefined();
  });

  it('a pending card lands in cards.delete, never in cards.update', () => {
    const original = baseState({
      cards: [card({ values: { [FRONT.key]: 'Bonjour', [BACK.key]: 'Hello' } })],
    });
    const current = baseState({
      cards: [card({ pendingRemoval: true, values: { [FRONT.key]: 'Edited', [BACK.key]: 'Hello' } })],
    });
    expect(buildDeckBatchEditPayload(original, current)).toEqual({
      cards: { create: [], update: [], delete: ['card-id'] },
    });
  });

  it('reverting a pending field back to false (Phase 7.5\'s global Undo does this via LOAD) produces no diff', () => {
    const original = baseState();
    const markedPending = baseState({ fields: [{ ...FRONT }, { ...BACK, pendingRemoval: true }] });
    const undone = baseState({ fields: [{ ...FRONT }, { ...BACK, pendingRemoval: false }] });
    expect(buildDeckBatchEditPayload(original, markedPending)).not.toEqual({});
    expect(buildDeckBatchEditPayload(original, undone)).toEqual({});
  });

  it('reverting a pending card back to false produces no diff', () => {
    const original = baseState({
      cards: [card({ values: { [FRONT.key]: 'Bonjour', [BACK.key]: 'Hello' } })],
    });
    const undone = baseState({
      cards: [card({ pendingRemoval: false, values: { [FRONT.key]: 'Bonjour', [BACK.key]: 'Hello' } })],
    });
    expect(buildDeckBatchEditPayload(original, undone)).toEqual({});
  });
});
