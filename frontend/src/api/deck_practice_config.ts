import { client } from 'src/api/client';
import { unwrap, unwrapVoid } from 'src/api/unwrap';
import type { components } from 'src/api/types';

/** Both optional: with neither, every config the user owns comes back, each carrying
 * its deck and subject. */
export type DeckPracticeConfigFilters = { subjectId?: string; deckId?: string };

export const createDeckPracticeConfig = async (
  payload: components['schemas']['DeckPracticeConfigCreate'],
) => unwrap(await client.POST('/api/deck_practice_configs', { body: payload }));

export const readDeckPracticeConfigs = async (filters: DeckPracticeConfigFilters = {}) =>
  unwrap(
    await client.GET('/api/deck_practice_configs', {
      params: {
        query: {
          ...(filters.subjectId ? { subject_id: filters.subjectId } : {}),
          ...(filters.deckId ? { deck_id: filters.deckId } : {}),
        },
      },
    }),
  );

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
