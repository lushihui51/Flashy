import { client } from 'src/api/client';
import { unwrap, unwrapVoid } from 'src/api/unwrap';
import type { components } from 'src/api/types';

export const createFieldDef = async (
  deckId: string,
  payload: components['schemas']['FieldDefCreate'],
) =>
  unwrap(
    await client.POST('/api/decks/{deck_id}/fields', {
      params: { path: { deck_id: deckId } },
      body: payload,
    }),
  );

export const readFieldDefs = async (deckId: string, includeArchived = false) =>
  unwrap(
    await client.GET('/api/decks/{deck_id}/fields', {
      params: { path: { deck_id: deckId }, query: { include_archived: includeArchived } },
    }),
  );

export const reorderFieldDefs = async (deckId: string, orderedIds: string[]) =>
  unwrap(
    await client.POST('/api/decks/{deck_id}/fields/reorder', {
      params: { path: { deck_id: deckId } },
      body: orderedIds,
    }),
  );

export const readFieldDef = async (fieldId: string) =>
  unwrap(await client.GET('/api/fields/{field_id}', { params: { path: { field_id: fieldId } } }));

export const updateFieldDef = async (
  fieldId: string,
  payload: components['schemas']['FieldDefUpdate'],
) =>
  unwrap(
    await client.PATCH('/api/fields/{field_id}', {
      params: { path: { field_id: fieldId } },
      body: payload,
    }),
  );

export const archiveFieldDef = async (fieldId: string) =>
  unwrap(await client.DELETE('/api/fields/{field_id}', { params: { path: { field_id: fieldId } } }));

export const hardDeleteFieldDef = async (fieldId: string) =>
  unwrapVoid(
    await client.DELETE('/api/fields/{field_id}/hard', { params: { path: { field_id: fieldId } } }),
  );
