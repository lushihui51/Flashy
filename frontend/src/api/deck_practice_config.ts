import { client, displayError } from 'src/api/client';
import type { components } from 'src/api/types';

export const createDeckPracticeConfig = async (
  payload: components['schemas']['DeckPracticeConfigCreate'],
) => {
  const { data, error } = await client.POST('/api/deck_practice_configs', {
    body: payload,
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const readDeckPracticeConfigs = async (deckId: string) => {
  const { data, error } = await client.GET('/api/deck_practice_configs', {
    params: { query: { deck_id: deckId } },
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const readDeckPracticeConfig = async (configId: string) => {
  const { data, error } = await client.GET('/api/deck_practice_configs/{config_id}', {
    params: { path: { config_id: configId } },
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const updateDeckPracticeConfig = async (
  configId: string,
  payload: components['schemas']['DeckPracticeConfigUpdate'],
) => {
  const { data, error } = await client.PATCH('/api/deck_practice_configs/{config_id}', {
    params: { path: { config_id: configId } },
    body: payload,
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const deleteDeckPracticeConfig = async (configId: string) => {
  const { error } = await client.DELETE('/api/deck_practice_configs/{config_id}', {
    params: { path: { config_id: configId } },
  });
  if (error) {
    displayError(error);
    throw error;
  }
};
