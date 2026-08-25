import type { components } from 'src/api/types';
import type { DeckEditorState, EditorField } from 'src/lib/deckEditorReducer';

type DeckBatchEdit = components['schemas']['DeckBatchEdit'];
type FieldDefBatchUpdate = components['schemas']['FieldDefBatchUpdate'];

/** A field's identity in a §2.3 changeset: its real id once it has one, its
 * client-generated `key` (doubling as the request's `client_key`) until then — the
 * same rule the create-mode payload builder uses for `field_defs.order`. */
function fieldRef(field: EditorField): string {
  return field.id ?? field.key;
}

/** Builds the §2.3 changeset between the deck editor's frozen `original` state (as
 * loaded from `deckDetailToEditorState`, never mutated) and its live `current`
 * reducer state — the only two things Phase 7's edit-mode Save needs to produce a
 * `PATCH` body. A key with nothing changed anywhere is omitted entirely, down to the
 * whole `field_defs` object — an edit with no changes at all produces `{}`,
 * which the caller uses to skip the request rather than send a no-op `PATCH`. */
export function buildDeckBatchEditPayload(
  original: DeckEditorState,
  current: DeckEditorState,
): DeckBatchEdit {
  const payload: DeckBatchEdit = {};

  const trimmedName = current.name.trim();
  if (trimmedName !== original.name.trim()) {
    payload.name = trimmedName;
  }
  if (current.subjectId !== null && current.subjectId !== original.subjectId) {
    payload.subject_id = current.subjectId;
  }

  const fieldDefsPatch = buildFieldDefsPatch(original.fields, current.fields);
  if (fieldDefsPatch) payload.field_defs = fieldDefsPatch;

  return payload;
}

function buildFieldDefsPatch(
  originalFields: EditorField[],
  currentFields: EditorField[],
): DeckBatchEdit['field_defs'] {
  const originalById = new Map(
    originalFields.filter((f): f is EditorField & { id: string } => !!f.id).map((f) => [f.id, f]),
  );
  // A pending-removal field (Phase 7.5) stays in `currentFields` — struck-through,
  // still occupying its row — until Save actually sends it as a delete. It's
  // "surviving" nowhere from here on: not created/updated, not in the resulting
  // order (and, via `buildDeckBatchEditPayload`'s `fieldByKey`, not referenceable
  // by any card update either).
  const survivingFields = currentFields.filter((f) => !f.pendingRemoval);

  const create = survivingFields
    .filter((f) => !f.id)
    .map((f) => ({ client_key: f.key, name: f.name.trim(), type: f.type }));

  const update: FieldDefBatchUpdate[] = [];
  for (const field of survivingFields) {
    if (!field.id) continue;
    const original = originalById.get(field.id);
    if (!original) continue;
    const entry: FieldDefBatchUpdate = { id: field.id };
    let changed = false;
    const trimmedName = field.name.trim();
    if (trimmedName !== original.name) {
      entry.name = trimmedName;
      changed = true;
    }
    if (field.type !== original.type) {
      entry.type = field.type;
      changed = true;
    }
    if (changed) update.push(entry);
  }

  // Deleted = a pending-removal field, or (defensively — shouldn't happen once
  // every id-bearing removal stages instead of dropping) missing from
  // `currentFields` entirely.
  const currentById = new Map(
    currentFields.filter((f): f is EditorField & { id: string } => !!f.id).map((f) => [f.id, f]),
  );
  const del = originalFields
    .filter((f): f is EditorField & { id: string } => !!f.id)
    .filter((f) => {
      const now = currentById.get(f.id);
      return !now || now.pendingRemoval === true;
    })
    .map((f) => f.id);

  const order = survivingFields.map(fieldRef);
  const originalOrder = originalFields.map(fieldRef);
  const orderChanged = order.join(' ') !== originalOrder.join(' ');

  if (create.length === 0 && update.length === 0 && del.length === 0 && !orderChanged) {
    return undefined;
  }
  return { create, update, delete: del, order };
}

