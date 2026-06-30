import { client, displayError } from 'src/api/client';
import type { components } from 'src/api/types';

export const createCard = async (payload: components['schemas']['CardCreate']) => {
  const { data, error } = await client.POST('/api/cards/card', {
    body: payload,
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const readCard = async (cardId: string) => {
  const { data, error } = await client.GET('/api/cards/card/{card_id}', {
    params: { path: { card_id: cardId } },
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const updateCard = async (cardId: string, payload: components['schemas']['CardUpdate']) => {
  const { data, error } = await client.PUT('/api/cards/card/{card_id}', {
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
  const { error } = await client.DELETE('/api/cards/card/{card_id}', {
    params: { path: { card_id: cardId } },
  });
  if (error) {
    displayError(error);
    throw error;
  }
};
