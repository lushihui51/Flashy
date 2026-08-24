import type { components } from 'src/api/types';

type FieldType = components['schemas']['FieldType'];
type DeckCreate = components['schemas']['DeckCreate'];
type DeckDetail = components['schemas']['DeckDetail'];

export type EditorField = {
  key: string;
  id?: string;
  name: string;
  type: FieldType;
  /** Phase 7.5: meaningful only when `id` is set. A saved field's Remove stages it
   * for deletion on save instead of dropping it from the list immediately — the row
   * stays in place, struck through, with no interactive control of its own. The
   * *only* way to reverse it is the header's single global Undo (Phase 7.5 §2),
   * which reverts the whole form at once. A brand-new field (no `id`) never carries
   * this — removing one just deletes it outright, since there's nothing on the
   * server to stage against. */
  pendingRemoval?: boolean;
};

export type EditorCard = {
  key: string;
  id?: string;
  values: Record<string, string>;
  /** Same staging rule as `EditorField.pendingRemoval`, for a saved card deleted
   * from inside the in-editor `CardForm`. */
  pendingRemoval?: boolean;
};

export type DeckEditorState = {
  name: string;
  subjectId: string | null;
  fields: EditorField[];
  cards: EditorCard[];
  dirty: boolean;
};

function makeKey(): string {
  return crypto.randomUUID();
}

/** A brand-new deck starts with the two fields most decks need (§4.7) — the user
 * renames or replaces them rather than starting from an empty list. */
export function initialDeckEditorState(subjectId: string | null = null): DeckEditorState {
  return {
    name: '',
    subjectId,
    fields: [
      { key: makeKey(), name: 'Term', type: 'text' },
      { key: makeKey(), name: 'Definition', type: 'text' },
    ],
    cards: [],
    dirty: false,
  };
}

/** Edit mode's starting state (Phase 7) — every pre-existing field and card keeps
 * its real `id`, plus a fresh client-only `key` for reducer/component use exactly
 * like a brand-new one gets. A card's `values` is re-keyed from field _id_ (the
 * DeckDetail shape) to field _key_ (what CardForm's in-editor role and the rest of
 * this reducer address fields by) so both modes share one `EditorCard` shape.
 *
 * Call this exactly once per edit session and reuse the same object as both the
 * reducer's initial state and the frozen `original` diffed against at save time —
 * two separate calls would mint two different sets of keys for the same rows,
 * breaking every id-based comparison in `buildDeckBatchEditPayload`. */
export function deckDetailToEditorState(deck: DeckDetail): DeckEditorState {
  const orderedFieldDefs = [...deck.field_defs].sort((a, b) => a.position - b.position);
  const fields: EditorField[] = orderedFieldDefs.map((fieldDef) => ({
    key: makeKey(),
    id: fieldDef.id,
    name: fieldDef.name,
    type: fieldDef.type,
  }));
  const keyByFieldId = new Map(fields.map((field) => [field.id!, field.key]));

  const cards: EditorCard[] = deck.cards.map((card) => ({
    key: makeKey(),
    id: card.id,
    values: Object.fromEntries(
      Object.entries(card.values).flatMap(([fieldId, value]) => {
        const fieldKey = keyByFieldId.get(fieldId);
        return fieldKey ? [[fieldKey, value]] : [];
      }),
    ),
  }));

  return {
    name: deck.name,
    subjectId: deck.subject_id,
    fields,
    cards,
    dirty: false,
  };
}

export type DeckEditorAction =
  | { type: 'SET_NAME'; name: string }
  | { type: 'SET_SUBJECT'; subjectId: string }
  | { type: 'ADD_FIELD' }
  | { type: 'RENAME_FIELD'; key: string; name: string }
  | { type: 'SET_FIELD_TYPE'; key: string; fieldType: FieldType }
  | { type: 'REMOVE_FIELD'; key: string }
  | { type: 'MOVE_FIELD'; key: string; toIndex: number }
  | { type: 'ADD_CARD'; values: Record<string, string> }
  | { type: 'UPDATE_CARD'; key: string; values: Record<string, string> }
  | { type: 'REMOVE_CARD'; key: string }
  /** Phase 7.5: replaces the *entire* state wholesale. Two callers — after a
   * successful edit-mode save, re-run through `deckDetailToEditorState` (real ids
   * for anything created via `client_key`, every pending flag cleared, `dirty`
   * reset); and the header's global Undo, dispatched with the frozen `original` to
   * discard every uncommitted change — renames, reorders, new rows, and pending
   * removals — in one step. */
  | { type: 'LOAD'; state: DeckEditorState };

export function deckEditorReducer(state: DeckEditorState, action: DeckEditorAction): DeckEditorState {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, name: action.name, dirty: true };

    case 'SET_SUBJECT':
      return { ...state, subjectId: action.subjectId, dirty: true };

    case 'ADD_FIELD': {
      const field: EditorField = { key: makeKey(), name: '', type: 'text' };
      return { ...state, fields: [...state.fields, field], dirty: true };
    }

    case 'RENAME_FIELD':
      return {
        ...state,
        fields: state.fields.map((f) => (f.key === action.key ? { ...f, name: action.name } : f)),
        dirty: true,
      };

    case 'SET_FIELD_TYPE':
      return {
        ...state,
        fields: state.fields.map((f) => (f.key === action.key ? { ...f, type: action.fieldType } : f)),
        dirty: true,
      };

    case 'REMOVE_FIELD': {
      // D3 counts non-pending fields only — a field already staged for removal
      // doesn't hold the floor open for another one (Phase 7.5 §1).
      const activeCount = state.fields.filter((f) => !f.pendingRemoval).length;
      if (activeCount <= 2) return state; // D3: never drop below two active fields.
      const field = state.fields.find((f) => f.key === action.key);
      if (!field) return state;
      if (field.id) {
        // A saved field: stage it, don't drop it — the row stays in place, with no
        // control of its own to reverse just this one (Phase 7.5 §1); only the
        // global Undo can bring it back.
        return {
          ...state,
          fields: state.fields.map((f) => (f.key === action.key ? { ...f, pendingRemoval: true } : f)),
          dirty: true,
        };
      }
      // A brand-new field never had server state to stage against — remove it
      // outright, same as before Phase 7.5.
      return {
        ...state,
        fields: state.fields.filter((f) => f.key !== action.key),
        // Values keyed by a field that no longer exists are just dead weight — strip
        // them so a card's `values` always reflects live fields only.
        cards: state.cards.map((c) => {
          if (!(action.key in c.values)) return c;
          return {
            ...c,
            values: Object.fromEntries(Object.entries(c.values).filter(([key]) => key !== action.key)),
          };
        }),
        dirty: true,
      };
    }

    case 'MOVE_FIELD': {
      const fromIndex = state.fields.findIndex((f) => f.key === action.key);
      if (fromIndex === -1) return state;
      const toIndex = Math.max(0, Math.min(action.toIndex, state.fields.length - 1));
      if (toIndex === fromIndex) return state;
      const fields = [...state.fields];
      const [moved] = fields.splice(fromIndex, 1);
      fields.splice(toIndex, 0, moved!);
      return { ...state, fields, dirty: true };
    }

    case 'ADD_CARD':
      return { ...state, cards: [...state.cards, { key: makeKey(), values: action.values }], dirty: true };

    case 'UPDATE_CARD':
      return {
        ...state,
        cards: state.cards.map((c) => (c.key === action.key ? { ...c, values: action.values } : c)),
        dirty: true,
      };

    case 'REMOVE_CARD': {
      const card = state.cards.find((c) => c.key === action.key);
      if (!card) return state;
      if (card.id) {
        // A saved card: stage it, same rule as a saved field (Phase 7.5 §1).
        return {
          ...state,
          cards: state.cards.map((c) => (c.key === action.key ? { ...c, pendingRemoval: true } : c)),
          dirty: true,
        };
      }
      return { ...state, cards: state.cards.filter((c) => c.key !== action.key), dirty: true };
    }

    case 'LOAD':
      return action.state;

    default:
      return state;
  }
}

export function isDeckEditorValid(state: DeckEditorState): boolean {
  if (state.name.trim() === '') return false;
  if (state.subjectId === null) return false;
  // Phase 7.5: a pending-removal field is on its way out on save, so it neither
  // counts toward the D3 floor nor blocks Save with a struck-through duplicate name.
  const activeFields = state.fields.filter((f) => !f.pendingRemoval);
  if (activeFields.length < 2) return false; // D3: a deck needs at least two fields.
  if (activeFields.some((f) => f.name.trim() === '')) return false;
  const lowerNames = activeFields.map((f) => f.name.trim().toLowerCase());
  if (new Set(lowerNames).size !== lowerNames.length) return false;
  return true;
}

function isBlank(value: string | undefined): boolean {
  return (value ?? '').trim() === '';
}

/** §2.2's payload: fields in list order, each card's `values` aligned to that same
 * order (D6 — positional, no client ids in the request body), blanks sent as `null`.
 * A card whose every value is blank is dropped entirely — silent, per §4.7's
 * "Validity" note; the equivalent single-card 422 rule (§2.6) is a different, later
 * code path and deliberately does not apply here. */
export function buildDeckCreatePayload(state: DeckEditorState): DeckCreate {
  return {
    name: state.name.trim(),
    subject_id: state.subjectId!,
    field_defs: state.fields.map((f) => ({ name: f.name.trim(), type: f.type })),
    cards: state.cards
      .filter((c) => Object.values(c.values).some((v) => !isBlank(v)))
      .map((c) => ({
        values: state.fields.map((f) => {
          const value = c.values[f.key];
          return isBlank(value) ? null : value!;
        }),
      })),
  };
}
