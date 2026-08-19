import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "src/test/server";
import {
  createDeckPracticeConfig,
  readDeckPracticeConfigs,
  readDeckPracticeConfig,
  updateDeckPracticeConfig,
  deleteDeckPracticeConfig,
} from "src/api/deck_practice_config";
import type { components } from "src/api/types";

const BASE = "http://localhost:8000";

const configBody = {
  deck_id: "deck_1",
  name: "Basics",
  prompt_field_ids: ["field_front"],
  answer_field_ids: ["field_back"],
  prompt_pool_ids: [],
  prompt_pool_counts: [],
  answer_pool_ids: [],
  answer_pool_counts: [],
};

describe("createDeckPracticeConfig", () => {
  it("sends the payload and returns the created config", async () => {
    const payload: components["schemas"]["DeckPracticeConfigCreate"] = configBody;
    let sentBody: unknown;

    server.use(
      http.post(`${BASE}/api/deck_practice_configs`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({ id: "config_1", ...payload }, { status: 201 });
      }),
    );

    const created = await createDeckPracticeConfig(payload);
    expect(sentBody).toEqual(payload);
    expect(created).toEqual({ id: "config_1", ...payload });
  });
});

describe("readDeckPracticeConfigs", () => {
  it("sends the deck_id query and returns the list of configs", async () => {
    let deckIdQuery: string | null = null;

    server.use(
      http.get(`${BASE}/api/deck_practice_configs`, ({ request }) => {
        const url = new URL(request.url);
        deckIdQuery = url.searchParams.get("deck_id");
        return HttpResponse.json([{ id: "config_1", ...configBody }]);
      }),
    );

    const configs = await readDeckPracticeConfigs("deck_1");
    expect(deckIdQuery).toBe("deck_1");
    expect(configs).toHaveLength(1);
  });
});

describe("readDeckPracticeConfig", () => {
  it("requests the right id and returns the config", async () => {
    server.use(
      http.get(`${BASE}/api/deck_practice_configs/:config_id`, ({ params }) =>
        HttpResponse.json({ id: params.config_id, ...configBody }),
      ),
    );

    await expect(readDeckPracticeConfig("config_1")).resolves.toEqual({
      id: "config_1",
      ...configBody,
    });
  });
});

describe("updateDeckPracticeConfig", () => {
  it("sends the patch body to the right id", async () => {
    const payload: components["schemas"]["DeckPracticeConfigUpdate"] = {
      name: "Updated",
    };
    let sentBody: unknown;

    server.use(
      http.patch(
        `${BASE}/api/deck_practice_configs/:config_id`,
        async ({ request, params }) => {
          sentBody = await request.json();
          return HttpResponse.json({
            id: params.config_id,
            ...configBody,
            name: "Updated",
          });
        },
      ),
    );

    const updated = await updateDeckPracticeConfig("config_1", payload);
    expect(sentBody).toEqual(payload);
    expect(updated?.name).toBe("Updated");
  });
});

describe("deleteDeckPracticeConfig", () => {
  it("resolves with no value on success", async () => {
    server.use(
      http.delete(
        `${BASE}/api/deck_practice_configs/:config_id`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    await expect(deleteDeckPracticeConfig("config_1")).resolves.toBeUndefined();
  });
});
