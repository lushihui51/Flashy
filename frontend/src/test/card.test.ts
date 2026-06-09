import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "src/test/server";
import { createCard, readCard, updateCard, deleteCard } from "src/api/card";
import type { components } from "src/api/types";

const BASE = "http://localhost:8000";

describe("createCard", () => {
  it("sends the payload and returns the created card", async () => {
    const payload: components["schemas"]["CardCreate"] = {
      deck_id: "00000000-0000-0000-0000-000000000001",
      fields: { front: "Q", back: "A" },
    };
    let sentBody: unknown;

    server.use(
      http.post(`${BASE}/api/cards/card`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json(
          {
            id: "00000000-0000-0000-0000-000000000101",
            last_modified: "2026-01-01T00:00:00Z",
            ...payload,
          },
          { status: 201 },
        );
      }),
    );

    const created = await createCard(payload);
    expect(sentBody).toEqual(payload);
    expect(created).toEqual({
      id: "00000000-0000-0000-0000-000000000101",
      last_modified: "2026-01-01T00:00:00Z",
      ...payload,
    });
  });

  it("throws a formatted message on a 422 validation error", async () => {
    server.use(
      http.post(`${BASE}/api/cards/card`, () =>
        HttpResponse.json(
          {
            detail: [
              {
                loc: ["body", "front"],
                msg: "Field required",
                type: "missing",
              },
            ],
          },
          { status: 422 },
        ),
      ),
    );

    await expect(
      createCard({
        deck_id: "",
        fields: {},
      }),
    ).rejects.toThrow("body.front: Field required");
  });
});

describe("readCard", () => {
  it("requests the right id and returns the card", async () => {
    server.use(
      http.get(`${BASE}/api/cards/card/:card_id`, ({ params }) =>
        HttpResponse.json({
          id: params.card_id,
          deck_id: "00000000-0000-0000-0000-000000000001",
          fields: { front: "Q", back: "A" },
          last_modified: "2026-01-01T00:00:00Z",
        }),
      ),
    );

    await expect(readCard("card_42")).resolves.toEqual({
      id: "card_42",
      deck_id: "00000000-0000-0000-0000-000000000001",
      fields: { front: "Q", back: "A" },
      last_modified: "2026-01-01T00:00:00Z",
    });
  });

  it("throws the detail string on a 404", async () => {
    server.use(
      http.get(`${BASE}/api/cards/card/:card_id`, () =>
        HttpResponse.json({ detail: "Card not found" }, { status: 404 }),
      ),
    );

    await expect(readCard("nope")).rejects.toThrow("Card not found");
  });
});

describe("updateCard", () => {
  it("sends the update body to the right id", async () => {
    const payload: components["schemas"]["CardUpdate"] = {
      fields: { front: "Updated" },
    };
    let sentBody: unknown;

    server.use(
      http.put(
        `${BASE}/api/cards/card/:card_id`,
        async ({ request, params }) => {
          sentBody = await request.json();
          return HttpResponse.json({
            id: params.card_id,
            deck_id: "00000000-0000-0000-0000-000000000001",
            fields: { front: "Updated", back: "A" },
            last_modified: "2026-01-02T00:00:00Z",
          });
        },
      ),
    );

    const updated = await updateCard("card_7", payload);
    expect(sentBody).toEqual(payload);
    expect(updated).toEqual({
      id: "card_7",
      deck_id: "00000000-0000-0000-0000-000000000001",
      fields: { front: "Updated", back: "A" },
      last_modified: "2026-01-02T00:00:00Z",
    });
  });
});

describe("deleteCard", () => {
  it("resolves with no value on success", async () => {
    server.use(
      http.delete(
        `${BASE}/api/cards/card/:card_id`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    await expect(deleteCard("card_7")).resolves.toBeUndefined();
  });
});
