import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "src/test/server";
import { createDeck, readDeck, updateDeck, deleteDeck } from "src/api/deck";
import type { components } from "src/api/types";

const BASE = "http://localhost:8000";

describe("createDeck", () => {
  it("sends the payload and returns the created deck", async () => {
    const payload: components["schemas"]["DeckCreate"] = {
      subject_id: "00000000-0000-0000-0000-000000000301",
      name: "Biology Deck",
      field_defs: [{ name: "Term", type: "text" }],
      cards: [{ values: ["Mitochondria"] }],
    };
    let sentBody: unknown;

    server.use(
      http.post(`${BASE}/api/decks`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json(
          { id: "00000000-0000-0000-0000-000000000302", ...payload },
          { status: 201 },
        );
      }),
    );

    const created = await createDeck(payload);
    expect(sentBody).toEqual(payload);
    expect(created).toEqual({
      id: "00000000-0000-0000-0000-000000000302",
      ...payload,
    });
  });

  it("throws a formatted message on a 422 validation error", async () => {
    server.use(
      http.post(`${BASE}/api/decks`, () =>
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
      createDeck({
        subject_id: "",
        name: "",
        field_defs: [],
        cards: [],
      }),
    ).rejects.toThrow("body.name: Field required");
  });
});

describe("readDeck", () => {
  it("requests the right id and returns the deck", async () => {
    server.use(
      http.get(`${BASE}/api/decks/:deck_id`, ({ params }) =>
        HttpResponse.json({
          id: params.deck_id,
          subject_id: "00000000-0000-0000-0000-000000000301",
          name: "Chemistry Deck",
        }),
      ),
    );

    await expect(readDeck("deck_42")).resolves.toEqual({
      id: "deck_42",
      subject_id: "00000000-0000-0000-0000-000000000301",
      name: "Chemistry Deck",
    });
  });

  it("throws the detail string on a 404", async () => {
    server.use(
      http.get(`${BASE}/api/decks/:deck_id`, () =>
        HttpResponse.json({ detail: "Deck not found" }, { status: 404 }),
      ),
    );

    await expect(readDeck("nope")).rejects.toThrow("Deck not found");
  });
});

describe("updateDeck", () => {
  it("sends the update body to the right id", async () => {
    const payload: components["schemas"]["DeckBatchEdit"] = {
      name: "Updated Deck",
    };
    let sentBody: unknown;

    server.use(
      http.patch(
        `${BASE}/api/decks/:deck_id`,
        async ({ request, params }) => {
          sentBody = await request.json();
          return HttpResponse.json({
            id: params.deck_id,
            subject_id: "00000000-0000-0000-0000-000000000301",
            name: "Updated Deck",
          });
        },
      ),
    );

    const updated = await updateDeck("deck_7", payload);
    expect(sentBody).toEqual(payload);
    expect(updated).toEqual({
      id: "deck_7",
      subject_id: "00000000-0000-0000-0000-000000000301",
      name: "Updated Deck",
    });
  });
});

describe("deleteDeck", () => {
  it("resolves with no value on success", async () => {
    server.use(
      http.delete(
        `${BASE}/api/decks/:deck_id`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    await expect(deleteDeck("deck_7")).resolves.toBeUndefined();
  });
});
