import { client, displayError } from 'src/api/client';
import type { components } from 'src/api/types';

export const createFieldDef = async (
  deckId: string,
  payload: components['schemas']['FieldDefCreate'],
) => {
  const { data, error } = await client.POST('/api/decks/{deck_id}/fields', {
    params: { path: { deck_id: deckId } },
    body: payload,
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const readFieldDefs = async (deckId: string, includeArchived = false) => {
  const { data, error } = await client.GET('/api/decks/{deck_id}/fields', {
    params: { path: { deck_id: deckId }, query: { include_archived: includeArchived } },
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const reorderFieldDefs = async (deckId: string, orderedIds: string[]) => {
  const { data, error } = await client.POST('/api/decks/{deck_id}/fields/reorder', {
    params: { path: { deck_id: deckId } },
    body: orderedIds,
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const readFieldDef = async (fieldId: string) => {
  const { data, error } = await client.GET('/api/fields/{field_id}', {
    params: { path: { field_id: fieldId } },
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const updateFieldDef = async (
  fieldId: string,
  payload: components['schemas']['FieldDefUpdate'],
) => {
  const { data, error } = await client.PATCH('/api/fields/{field_id}', {
    params: { path: { field_id: fieldId } },
    body: payload,
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const archiveFieldDef = async (fieldId: string) => {
  const { data, error } = await client.DELETE('/api/fields/{field_id}', {
    params: { path: { field_id: fieldId } },
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const hardDeleteFieldDef = async (fieldId: string) => {
  const { error } = await client.DELETE('/api/fields/{field_id}/hard', {
    params: { path: { field_id: fieldId } },
  });
  if (error) {
    displayError(error);
    throw error;
  }
};
