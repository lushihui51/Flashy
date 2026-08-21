import { client } from 'src/api/client';
import { unwrap, unwrapVoid } from 'src/api/unwrap';
import type { components } from 'src/api/types';

export const createDeckPracticeConfig = async (
  payload: components['schemas']['DeckPracticeConfigCreate'],
) => unwrap(await client.POST('/api/deck_practice_configs', { body: payload }));

export const readDeckPracticeConfigs = async (deckId: string) =>
  unwrap(await client.GET('/api/deck_practice_configs', { params: { query: { deck_id: deckId } } }));

export const readDeckPracticeConfig = async (configId: string) =>
  unwrap(
    await client.GET('/api/deck_practice_configs/{config_id}', {
      params: { path: { config_id: configId } },
    }),
  );

export const updateDeckPracticeConfig = async (
  configId: string,
  payload: components['schemas']['DeckPracticeConfigUpdate'],
) =>
  unwrap(
    await client.PATCH('/api/deck_practice_configs/{config_id}', {
      params: { path: { config_id: configId } },
      body: payload,
    }),
  );

export const deleteDeckPracticeConfig = async (configId: string) =>
  unwrapVoid(
    await client.DELETE('/api/deck_practice_configs/{config_id}', {
      params: { path: { config_id: configId } },
    }),
  );
