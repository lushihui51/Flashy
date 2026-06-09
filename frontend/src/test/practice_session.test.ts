import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "src/test/server";
import {
  createPracticeSession,
  readPracticeSession,
  readPracticeCard,
} from "src/api/practice_session";
import type { components } from "src/api/types";

const BASE = "http://localhost:8000";

describe("createPracticeSession", () => {
  it("sends the payload and returns the created practice session", async () => {
    const payload: components["schemas"]["PracticeSessionCreate"] = {
      deck_config_ids: ["00000000-0000-0000-0000-000000000401"],
    };
    let sentBody: unknown;

    server.use(
      http.post(
        `${BASE}/api/practice_sessions/practice_session`,
        async ({ request }) => {
          sentBody = await request.json();
          return HttpResponse.json(
            {
              id: "00000000-0000-0000-0000-000000000402",
              curr: 0,
            },
            { status: 201 },
          );
        },
      ),
    );

    const created = await createPracticeSession(payload);
    expect(sentBody).toEqual(payload);
    expect(created).toEqual({
      id: "00000000-0000-0000-0000-000000000402",
      curr: 0,
    });
  });

  it("throws a formatted message on a 422 validation error", async () => {
    server.use(
      http.post(`${BASE}/api/practice_sessions/practice_session`, () =>
        HttpResponse.json(
          {
            detail: [
              {
                loc: ["body", "deck_config_ids"],
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
      createPracticeSession({
        deck_config_ids: [],
      }),
    ).rejects.toThrow("body.deck_config_ids: Field required");
  });
});

describe("readPracticeSession", () => {
  it("requests the right id and returns the practice session", async () => {
    server.use(
      http.get(
        `${BASE}/api/practice_sessions/practice_session/:practice_session_id`,
        ({ params }) =>
          HttpResponse.json({
            id: params.practice_session_id,
            curr: 2,
          }),
      ),
    );

    await expect(readPracticeSession("ps_42")).resolves.toEqual({
      id: "ps_42",
      curr: 2,
    });
  });

  it("throws the detail string on a 404", async () => {
    server.use(
      http.get(
        `${BASE}/api/practice_sessions/practice_session/:practice_session_id`,
        () =>
          HttpResponse.json(
            { detail: "Practice session not found" },
            { status: 404 },
          ),
      ),
    );

    await expect(readPracticeSession("nope")).rejects.toThrow(
      "Practice session not found",
    );
  });
});

describe("readPracticeCard", () => {
  it("sends the forward query and returns a practice card", async () => {
    let forwardQuery: string | null = null;

    server.use(
      http.get(
        `${BASE}/api/practice_sessions/practice_session/:practice_session_id/practice_card`,
        ({ request, params }) => {
          const url = new URL(request.url);
          forwardQuery = url.searchParams.get("forward");

          return HttpResponse.json({
            id: "pc_1",
            practice_session_id: params.practice_session_id,
          });
        },
      ),
    );

    const card = await readPracticeCard("ps_7", true);

    expect(forwardQuery).toBe("true");
    expect(card).toEqual({
      id: "pc_1",
      practice_session_id: "ps_7",
    });
  });
});
