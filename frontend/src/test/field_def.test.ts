import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "src/test/server";
import {
  createFieldDef,
  readFieldDefs,
  readFieldDef,
  updateFieldDef,
  archiveFieldDef,
} from "src/api/field_def";
import type { components } from "src/api/types";

const BASE = "http://localhost:8000";

describe("createFieldDef", () => {
  it("sends the payload to the right deck and returns the created field", async () => {
    const payload: components["schemas"]["FieldDefCreate"] = {
      name: "Front",
      type: "text",
    };
    let sentBody: unknown;

    server.use(
      http.post(`${BASE}/api/decks/:deck_id/fields`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json(
          { id: "field_1", deck_id: "deck_1", position: 0, ...payload },
          { status: 201 },
        );
      }),
    );

    const created = await createFieldDef("deck_1", payload);
    expect(sentBody).toEqual(payload);
    expect(created).toEqual({
      id: "field_1",
      deck_id: "deck_1",
      position: 0,
      ...payload,
    });
  });
});

describe("readFieldDefs", () => {
  it("sends include_archived and returns the list of fields", async () => {
    let includeArchivedQuery: string | null = null;

    server.use(
      http.get(`${BASE}/api/decks/:deck_id/fields`, ({ request }) => {
        const url = new URL(request.url);
        includeArchivedQuery = url.searchParams.get("include_archived");
        return HttpResponse.json([
          { id: "field_1", deck_id: "deck_1", name: "Front", type: "text", position: 0 },
        ]);
      }),
    );

    const fields = await readFieldDefs("deck_1");
    expect(includeArchivedQuery).toBe("false");
    expect(fields).toHaveLength(1);
  });
});

describe("readFieldDef", () => {
  it("requests the right id and returns the field", async () => {
    server.use(
      http.get(`${BASE}/api/fields/:field_id`, ({ params }) =>
        HttpResponse.json({
          id: params.field_id,
          deck_id: "deck_1",
          name: "Front",
          type: "text",
          position: 0,
        }),
      ),
    );

    await expect(readFieldDef("field_1")).resolves.toEqual({
      id: "field_1",
      deck_id: "deck_1",
      name: "Front",
      type: "text",
      position: 0,
    });
  });
});

describe("updateFieldDef", () => {
  it("sends the patch body to the right id", async () => {
    const payload: components["schemas"]["FieldDefUpdate"] = { name: "Updated" };
    let sentBody: unknown;

    server.use(
      http.patch(`${BASE}/api/fields/:field_id`, async ({ request, params }) => {
        sentBody = await request.json();
        return HttpResponse.json({
          id: params.field_id,
          deck_id: "deck_1",
          name: "Updated",
          type: "text",
          position: 0,
        });
      }),
    );

    const updated = await updateFieldDef("field_1", payload);
    expect(sentBody).toEqual(payload);
    expect(updated?.name).toBe("Updated");
  });
});

describe("archiveFieldDef", () => {
  it("returns the archived field", async () => {
    server.use(
      http.delete(`${BASE}/api/fields/:field_id`, ({ params }) =>
        HttpResponse.json({
          id: params.field_id,
          deck_id: "deck_1",
          name: "Front",
          type: "text",
          position: 0,
          archived_at: "2026-01-01T00:00:00Z",
        }),
      ),
    );

    const archived = await archiveFieldDef("field_1");
    expect(archived?.archived_at).toBe("2026-01-01T00:00:00Z");
  });
});
