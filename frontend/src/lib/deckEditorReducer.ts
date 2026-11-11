import type { components } from 'src/api/types';

type FieldType = components['schemas']['FieldType'];
type DeckCreate = components['schemas']['DeckCreate'];
type DeckDetail = components['schemas']['DeckDetail'];

export type EditorField = {
  key: string;
  id?: string;
  name: string;
  type: FieldType;
  /** Meaningful only when `id` is set. A saved field's Remove stages it for deletion
   * on save instead of dropping it from the list immediately — the row stays in
   * place, struck through, with no interactive control of its own. The *only* way to
   * reverse it is the header's single global Undo, which reverts the whole form at
   * once. A brand-new field (no `id`) never carries this — removing one just deletes
   * it outright, since there's nothing on the server to stage against. */
  pendingRemoval?: boolean;
};

/** Identity and schema — a deck's name and what a card of it is made of. Cards are not
 * here: they are routine content, added and edited from the deck's own card list, not
 * from the form that defines the deck. */
export type DeckEditorState = {
  name: string;
  fields: EditorField[];
  dirty: boolean;
};

function makeKey(): string {
  return crypto.randomUUID();
}

/** A brand-new deck starts with the two fields most decks need — the user renames or
 * replaces them rather than starting from an empty list. */
export function initialDeckEditorState(): DeckEditorState {
  return {
    name: '',
    fields: [
      { key: makeKey(), name: 'Term', type: 'text' },
      { key: makeKey(), name: 'Definition', type: 'text' },
    ],
    dirty: false,
  };
}

/** Edit mode's starting state — every pre-existing field keeps its real `id`, plus a
 * fresh client-only `key` for reducer/component use exactly like a brand-new one gets.
 *
 * Call this once per loaded deck and reuse the same object as both the reducer's state
 * and the `original` diffed against at save time — two separate calls would mint two
 * different sets of keys for the same rows, breaking every id-based comparison in
 * `buildDeckBatchEditPayload`. */
export function deckDetailToEditorState(deck: DeckDetail): DeckEditorState {
  const orderedFieldDefs = [...deck.field_defs].sort((a, b) => a.position - b.position);
  const fields: EditorField[] = orderedFieldDefs.map((fieldDef) => ({
    key: makeKey(),
    id: fieldDef.id,
    name: fieldDef.name,
    type: fieldDef.type,
  }));
  return {
    name: deck.name,
    fields,
    dirty: false,
  };
}

export type DeckEditorAction =
  | { type: 'SET_NAME'; name: string }
  | { type: 'ADD_FIELD' }
  | { type: 'RENAME_FIELD'; key: string; name: string }
  | { type: 'SET_FIELD_TYPE'; key: string; fieldType: FieldType }
  | { type: 'REMOVE_FIELD'; key: string }
  | { type: 'MOVE_FIELD'; key: string; toIndex: number }
  /** Replaces the *entire* state wholesale. Two callers — after a successful
   * edit-mode save, re-run through `deckDetailToEditorState` (real ids for anything
   * created via `client_key`, every pending flag cleared, `dirty` reset); and the
   * header's global Undo, dispatched with the frozen `original` to discard every
   * uncommitted change — renames, reorders, new rows, and pending removals — in one
   * step. */
  | { type: 'LOAD'; state: DeckEditorState };

export function deckEditorReducer(
  state: DeckEditorState,
  action: DeckEditorAction,
): DeckEditorState {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, name: action.name, dirty: true };

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
        fields: state.fields.map((f) =>
          f.key === action.key ? { ...f, type: action.fieldType } : f,
        ),
        dirty: true,
      };

    case 'REMOVE_FIELD': {
      // The two-field floor counts non-pending fields only — a field already staged for
      // removal doesn't hold the floor open for another one.
      const activeCount = state.fields.filter((f) => !f.pendingRemoval).length;
      if (activeCount <= 2) return state; // Never drop below two active fields.
      const field = state.fields.find((f) => f.key === action.key);
      if (!field) return state;
      if (field.id) {
        // A saved field: stage it, don't drop it — the row stays in place, with no
        // control of its own to reverse just this one; only the global Undo can bring
        // it back.
        return {
          ...state,
          fields: state.fields.map((f) =>
            f.key === action.key ? { ...f, pendingRemoval: true } : f,
          ),
          dirty: true,
        };
      }
      // A brand-new field never had server state to stage against — remove it
      // outright.
      return { ...state, fields: state.fields.filter((f) => f.key !== action.key), dirty: true };
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

    case 'LOAD':
      return action.state;

    default:
      return state;
  }
}

export function isDeckEditorValid(state: DeckEditorState): boolean {
  if (state.name.trim() === '') return false;
  // A pending-removal field is on its way out on save, so it neither counts toward
  // the two-field floor nor blocks Save with a struck-through duplicate name.
  const activeFields = state.fields.filter((f) => !f.pendingRemoval);
  if (activeFields.length < 2) return false; // A deck needs at least two fields.
  if (activeFields.some((f) => f.name.trim() === '')) return false;
  const lowerNames = activeFields.map((f) => f.name.trim().toLowerCase());
  if (new Set(lowerNames).size !== lowerNames.length) return false;
  return true;
}

/** The create payload: name and fields in list order. A deck is born with a
 * schema and no content — the first card is added from the new deck's own card list,
 * and the create contract has no `cards` field at all. */
export function buildDeckCreatePayload(state: DeckEditorState): DeckCreate {
  return {
    name: state.name.trim(),
    field_defs: state.fields.map((f) => ({ name: f.name.trim(), type: f.type })),
  };
}
