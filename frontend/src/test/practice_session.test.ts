import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "src/test/server";
import {
  createPracticeSession,
  readPracticeSession,
  readCurrentPracticeCard,
  ratePracticeCard,
} from "src/api/practice_session";
import type { components } from "src/api/types";

const BASE = "http://localhost:8000";

describe("createPracticeSession", () => {
  it("sends the payload and returns the created practice session", async () => {
    const payload: components["schemas"]["PracticeSessionCreate"] = {
      deck_practice_config_ids: ["00000000-0000-0000-0000-000000000401"],
    };
    let sentBody: unknown;

    server.use(
      http.post(`${BASE}/api/practice_sessions`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json(
          {
            id: "00000000-0000-0000-0000-000000000402",
            user_id: "00000000-0000-0000-0000-000000000001",
            status: "active",
            created_at: "2026-01-01T00:00:00Z",
          },
          { status: 201 },
        );
      }),
    );

    const created = await createPracticeSession(payload);
    expect(sentBody).toEqual(payload);
    expect(created).toEqual({
      id: "00000000-0000-0000-0000-000000000402",
      user_id: "00000000-0000-0000-0000-000000000001",
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
    });
  });

  it("throws a formatted message on a 422 validation error", async () => {
    server.use(
      http.post(`${BASE}/api/practice_sessions`, () =>
        HttpResponse.json(
          {
            detail: [
              {
                loc: ["body", "deck_practice_config_ids"],
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
        deck_practice_config_ids: [],
      }),
    ).rejects.toThrow("body.deck_practice_config_ids: Field required");
  });
});

describe("readPracticeSession", () => {
  it("requests the right id and returns the practice session", async () => {
    server.use(
      http.get(
        `${BASE}/api/practice_sessions/:practice_session_id`,
        ({ params }) =>
          HttpResponse.json({
            id: params.practice_session_id,
            user_id: "00000000-0000-0000-0000-000000000001",
            status: "active",
            created_at: "2026-01-01T00:00:00Z",
          }),
      ),
    );

    await expect(readPracticeSession("ps_42")).resolves.toEqual({
      id: "ps_42",
      user_id: "00000000-0000-0000-0000-000000000001",
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
    });
  });

  it("throws the detail string on a 404", async () => {
    server.use(
      http.get(
        `${BASE}/api/practice_sessions/:practice_session_id`,
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

describe("readCurrentPracticeCard", () => {
  it("requests the right session and returns the current practice card", async () => {
    server.use(
      http.get(
        `${BASE}/api/practice_sessions/:practice_session_id/current_card`,
        ({ params }) =>
          HttpResponse.json({
            id: "pc_1",
            practice_session_id: params.practice_session_id,
            card_id: "card_1",
            position: 1,
            prompts: ["front"],
            answers: ["back"],
            status: "pending",
            created_at: "2026-01-01T00:00:00Z",
          }),
      ),
    );

    const card = await readCurrentPracticeCard("ps_7");

    expect(card).toEqual({
      id: "pc_1",
      practice_session_id: "ps_7",
      card_id: "card_1",
      position: 1,
      prompts: ["front"],
      answers: ["back"],
      status: "pending",
      created_at: "2026-01-01T00:00:00Z",
    });
  });

  it("throws the detail string when there is no pending card", async () => {
    server.use(
      http.get(
        `${BASE}/api/practice_sessions/:practice_session_id/current_card`,
        () =>
          HttpResponse.json(
            { detail: "No pending practice card" },
            { status: 404 },
          ),
      ),
    );

    await expect(readCurrentPracticeCard("ps_7")).rejects.toThrow(
      "No pending practice card",
    );
  });
});

describe("ratePracticeCard", () => {
  it("sends the ratings and returns the result", async () => {
    const payload: components["schemas"]["RatingSubmission"] = {
      ratings: { back: 3 },
    };
    let sentBody: unknown;

    server.use(
      http.post(
        `${BASE}/api/practice_cards/:practice_card_id/rate`,
        async ({ request, params }) => {
          sentBody = await request.json();
          return HttpResponse.json({
            rated_practice_card: {
              id: params.practice_card_id,
              practice_session_id: "ps_7",
              card_id: "card_1",
              position: 1,
              prompts: ["front"],
              answers: ["back"],
              status: "passed",
              created_at: "2026-01-01T00:00:00Z",
            },
            requeued_practice_card: null,
          });
        },
      ),
    );

    const result = await ratePracticeCard("pc_1", payload);
    expect(sentBody).toEqual(payload);
    expect(result?.rated_practice_card.id).toBe("pc_1");
    expect(result?.requeued_practice_card).toBeNull();
  });
});
