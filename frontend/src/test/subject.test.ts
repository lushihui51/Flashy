import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "src/test/server";
import {
  createSubject,
  readSubject,
  updateSubject,
  deleteSubject,
} from "src/api/subject";

const BASE = "http://localhost:8000";

describe("createSubject", () => {
  it("sends the payload and returns the created subject", async () => {
    let sentBody: unknown;
    const id = crypto.randomUUID();
    server.use(
      http.post(`${BASE}/api/subjects/subject`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({ id, name: "Biology" }, { status: 201 });
      }),
    );

    const created = await createSubject({ name: "Biology" });

    expect(sentBody).toEqual({ name: "Biology" });
    expect(created).toEqual({ id, name: "Biology" });
  });

  it("throws a formatted message on a 422 validation error", async () => {
    server.use(
      http.post(`${BASE}/api/subjects/subject`, () =>
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

    await expect(createSubject({ name: "" })).rejects.toThrow(
      "body.name: Field required",
    );
  });
});

describe("readSubject", () => {
  it("requests the right id and returns the subject", async () => {
    const id = crypto.randomUUID();
    server.use(
      http.get(`${BASE}/api/subjects/subject/:id`, ({ params }) =>
        HttpResponse.json({ id: params.id, name: "Chemistry" }),
      ),
    );

    await expect(readSubject(id)).resolves.toEqual({
      id,
      name: "Chemistry",
    });
  });

  it("throws the detail string on a 404", async () => {
    const id = crypto.randomUUID();
    server.use(
      http.get(`${BASE}/api/subjects/subject/:id`, () =>
        HttpResponse.json({ detail: "Subject not found" }, { status: 404 }),
      ),
    );

    await expect(readSubject(id)).rejects.toThrow("Subject not found");
  });
});

describe("updateSubject", () => {
  it("sends the patch body to the right id", async () => {
    const id = crypto.randomUUID();
    let sentBody: unknown;
    server.use(
      http.patch(
        `${BASE}/api/subjects/subject/:id`,
        async ({ request, params }) => {
          sentBody = await request.json();
          return HttpResponse.json({ id: params.id, name: "Physics" });
        },
      ),
    );

    const updated = await updateSubject(id, { name: "Physics" });
    expect(sentBody).toEqual({ name: "Physics" });
    expect(updated).toEqual({ id, name: "Physics" });
  });
});

describe("deleteSubject", () => {
  it("resolves with no value on success", async () => {
    const id = crypto.randomUUID();
    server.use(
      http.delete(
        `${BASE}/api/subjects/subject/:id`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    await expect(deleteSubject(id)).resolves.toBeUndefined();
  });
});
