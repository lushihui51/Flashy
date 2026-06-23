import { client, displayError } from "src/api/client";
import type { components } from "src/api/types";

export const createDeckConfig = async (
  payload: components["schemas"]["DeckConfigCreate"],
) => {
  const { data, error } = await client.POST("/api/deck_configs/deck_config", {
    body: payload,
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const readDeckConfig = async (deckConfigId: string) => {
  const { data, error } = await client.GET(
    "/api/deck_configs/deck_config/{deck_config_id}",
    {
      params: { path: { deck_config_id: deckConfigId } },
    },
  );
  if (error) {
    displayError(error);
  }
  return data;
};

export const updateDeckConfig = async (
  deckConfigId: string,
  payload: components["schemas"]["DeckConfigUpdate"],
) => {
  const { data, error } = await client.PATCH(
    "/api/deck_configs/deck_config/{deck_config_id}",
    {
      params: { path: { deck_config_id: deckConfigId } },
      body: payload,
    },
  );
  if (error) {
    displayError(error);
  }
  return data;
};

export const deleteDeckConfig = async (deckConfigId: string) => {
  const { error } = await client.DELETE(
    "/api/deck_configs/deck_config/{deck_config_id}",
    {
      params: { path: { deck_config_id: deckConfigId } },
    },
  );
  if (error) {
    displayError(error);
  }
};
