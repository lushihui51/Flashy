import { client, displayError } from 'src/api/client';
import type { components } from 'src/api/types';

export const createCard = async (payload: components['schemas']['CardCreate']) => {
  const { data, error } = await client.POST('/api/cards', {
    body: payload,
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const readCards = async (deckId: string) => {
  const { data, error } = await client.GET('/api/cards', {
    params: { query: { deck_id: deckId } },
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const readCard = async (cardId: string) => {
  const { data, error } = await client.GET('/api/cards/{card_id}', {
    params: { path: { card_id: cardId } },
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const updateCard = async (cardId: string, payload: components['schemas']['CardUpdate']) => {
  const { data, error } = await client.PATCH('/api/cards/{card_id}', {
    params: { path: { card_id: cardId } },
    body: payload,
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const deleteCard = async (cardId: string) => {
  const { error } = await client.DELETE('/api/cards/{card_id}', {
    params: { path: { card_id: cardId } },
  });
  if (error) {
    displayError(error);
    throw error;
  }
};

export const readCardMastery = async (cardId: string) => {
  const { data, error } = await client.GET('/api/cards/{card_id}/mastery', {
    params: { path: { card_id: cardId } },
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};
