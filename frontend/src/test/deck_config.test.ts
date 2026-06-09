import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "src/test/server";
import {
  createDeckConfig,
  readDeckConfig,
  updateDeckConfig,
  deleteDeckConfig,
} from "src/api/deck_config";
import type { components } from "src/api/types";

const BASE = "http://localhost:8000";

describe("createDeckConfig", () => {
  it("sends the payload and returns the created deck config", async () => {
    const payload: components["schemas"]["DeckConfigCreate"] = {
      deck_id: "00000000-0000-0000-0000-000000000201",
      static_reveals: ["front"],
      static_conceals: ["back"],
      dynamic_reveals: ["hint"],
      dynamic_reveal_quantities: [1],
      dynamic_conceals: ["keyword"],
      dynamic_conceal_quantities: [2],
    };
    let sentBody: unknown;

    server.use(
      http.post(`${BASE}/api/deck_configs/deck_config`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json(
          { id: "00000000-0000-0000-0000-000000000202", ...payload },
          { status: 201 },
        );
      }),
    );

    const created = await createDeckConfig(payload);
    expect(sentBody).toEqual(payload);
    expect(created).toEqual({
      id: "00000000-0000-0000-0000-000000000202",
      ...payload,
    });
  });

  it("throws a formatted message on a 422 validation error", async () => {
    server.use(
      http.post(`${BASE}/api/deck_configs/deck_config`, () =>
        HttpResponse.json(
          {
            detail: [
              { loc: ["body", "name"], msg: "Field required", type: "missing" },
            ],
          },
          { status: 422 },
        ),
      ),
    );

    await expect(
      createDeckConfig({
        deck_id: "",
        static_reveals: [],
        static_conceals: [],
        dynamic_reveals: [],
        dynamic_reveal_quantities: [],
        dynamic_conceals: [],
        dynamic_conceal_quantities: [],
      }),
    ).rejects.toThrow("body.name: Field required");
  });
});

describe("readDeckConfig", () => {
  it("requests the right id and returns the deck config", async () => {
    server.use(
      http.get(
        `${BASE}/api/deck_configs/deck_config/:deck_config_id`,
        ({ params }) =>
          HttpResponse.json({
            id: params.deck_config_id,
            deck_id: "00000000-0000-0000-0000-000000000201",
            static_reveals: ["front"],
            static_conceals: ["back"],
            dynamic_reveals: ["hint"],
            dynamic_reveal_quantities: [1],
            dynamic_conceals: ["keyword"],
            dynamic_conceal_quantities: [2],
          }),
      ),
    );

    await expect(readDeckConfig("dc_42")).resolves.toEqual({
      id: "dc_42",
      deck_id: "00000000-0000-0000-0000-000000000201",
      static_reveals: ["front"],
      static_conceals: ["back"],
      dynamic_reveals: ["hint"],
      dynamic_reveal_quantities: [1],
      dynamic_conceals: ["keyword"],
      dynamic_conceal_quantities: [2],
    });
  });

  it("throws the detail string on a 404", async () => {
    server.use(
      http.get(`${BASE}/api/deck_configs/deck_config/:deck_config_id`, () =>
        HttpResponse.json({ detail: "Deck config not found" }, { status: 404 }),
      ),
    );

    await expect(readDeckConfig("nope")).rejects.toThrow(
      "Deck config not found",
    );
  });
});

describe("updateDeckConfig", () => {
  it("sends the patch body to the right id", async () => {
    const payload: components["schemas"]["DeckConfigUpdate"] = {
      static_reveals: ["front", "hint"],
    };
    let sentBody: unknown;

    server.use(
      http.patch(
        `${BASE}/api/deck_configs/deck_config/:deck_config_id`,
        async ({ request, params }) => {
          sentBody = await request.json();
          return HttpResponse.json({
            id: params.deck_config_id,
            deck_id: "00000000-0000-0000-0000-000000000201",
            static_reveals: ["front", "hint"],
            static_conceals: ["back"],
            dynamic_reveals: ["hint"],
            dynamic_reveal_quantities: [1],
            dynamic_conceals: ["keyword"],
            dynamic_conceal_quantities: [2],
          });
        },
      ),
    );

    const updated = await updateDeckConfig("dc_7", payload);
    expect(sentBody).toEqual(payload);
    expect(updated).toEqual({
      id: "dc_7",
      deck_id: "00000000-0000-0000-0000-000000000201",
      static_reveals: ["front", "hint"],
      static_conceals: ["back"],
      dynamic_reveals: ["hint"],
      dynamic_reveal_quantities: [1],
      dynamic_conceals: ["keyword"],
      dynamic_conceal_quantities: [2],
    });
  });
});

describe("deleteDeckConfig", () => {
  it("resolves with no value on success", async () => {
    server.use(
      http.delete(
        `${BASE}/api/deck_configs/deck_config/:deck_config_id`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    await expect(deleteDeckConfig("dc_7")).resolves.toBeUndefined();
  });
});
