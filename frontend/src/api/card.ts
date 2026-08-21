import { client } from 'src/api/client';
import { unwrap, unwrapVoid } from 'src/api/unwrap';
import type { components } from 'src/api/types';

export const createCard = async (payload: components['schemas']['CardCreate']) =>
  unwrap(await client.POST('/api/cards', { body: payload }));

export const readCards = async (deckId: string) =>
  unwrap(await client.GET('/api/cards', { params: { query: { deck_id: deckId } } }));

export const readCard = async (cardId: string) =>
  unwrap(await client.GET('/api/cards/{card_id}', { params: { path: { card_id: cardId } } }));

export const updateCard = async (cardId: string, payload: components['schemas']['CardUpdate']) =>
  unwrap(
    await client.PATCH('/api/cards/{card_id}', {
      params: { path: { card_id: cardId } },
      body: payload,
    }),
  );

export const deleteCard = async (cardId: string) =>
  unwrapVoid(await client.DELETE('/api/cards/{card_id}', { params: { path: { card_id: cardId } } }));

export const readCardMastery = async (cardId: string) =>
  unwrap(await client.GET('/api/cards/{card_id}/mastery', { params: { path: { card_id: cardId } } }));
