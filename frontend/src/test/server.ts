import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

// A healthy probe by default (task 020 T4): `resetHandlers` restores it, so any test
// that mounts AppShell gets `GET /api/health` answered without declaring it.
const server = setupServer(
  http.get("*/api/health", () => HttpResponse.json({ status: "ok" })),
);
export { server };
