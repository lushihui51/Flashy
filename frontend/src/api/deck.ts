import { client, displayError } from 'src/api/client';
import type { components } from 'src/api/types';

export const createDeck = async (payload: components['schemas']['DeckCreate']) => {
  const { data, error } = await client.POST('/api/decks/deck', {
    body: payload,
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const readDeck = async (deckId: string) => {
  const { data, error } = await client.GET('/api/decks/deck/{deck_id}', {
    params: { path: { deck_id: deckId } },
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const readDecks = async (subjectId?: string) => {
  const { data, error } = await client.GET('/api/decks/decks', {
    params: { query: subjectId ? { subject_id: subjectId } : {} },
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const updateDeck = async (deckId: string, payload: components['schemas']['DeckUpdate']) => {
  const { data, error } = await client.PUT('/api/decks/deck/{deck_id}', {
    params: { path: { deck_id: deckId } },
    body: payload,
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const deleteDeck = async (deckId: string) => {
  const { error } = await client.DELETE('/api/decks/deck/{deck_id}', {
    params: { path: { deck_id: deckId } },
  });
  if (error) {
    displayError(error);
    throw error;
  }
};
