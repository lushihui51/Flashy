import { client } from 'src/api/client';
import { unwrap, unwrapVoid } from 'src/api/unwrap';
import type { components } from 'src/api/types';

export const createDeck = async (payload: components['schemas']['DeckCreate']) =>
  unwrap(await client.POST('/api/decks', { body: payload }));

export const readDeck = async (deckId: string) =>
  unwrap(await client.GET('/api/decks/{deck_id}', { params: { path: { deck_id: deckId } } }));

export const readDecks = async (subjectId?: string) =>
  unwrap(
    await client.GET('/api/decks', {
      params: { query: subjectId ? { subject_id: subjectId } : {} },
    }),
  );

export const updateDeck = async (deckId: string, payload: components['schemas']['DeckUpdate']) =>
  unwrap(
    await client.PATCH('/api/decks/{deck_id}', {
      params: { path: { deck_id: deckId } },
      body: payload,
    }),
  );

export const deleteDeck = async (deckId: string) =>
  unwrapVoid(await client.DELETE('/api/decks/{deck_id}', { params: { path: { deck_id: deckId } } }));
