import createClient from 'openapi-fetch';
import type { paths } from 'src/api/types.ts';
import { userTimeZone } from 'src/lib/datetime.ts';

// Clerk exposes a global `window.Clerk` once ClerkProvider has mounted — the
// conventional way to pull a session token into a plain (non-hook) fetch client. No
// official types for this ship with @clerk/react's public API, hence `any`.
declare global {
  interface Window {
    Clerk?: {
      session?: { getToken: () => Promise<string | null> } | null;
    };
  }
}

export const client = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/',
  fetch: (request) => globalThis.fetch(request),
});

client.use({
  async onRequest({ request }) {
    const token = typeof window !== 'undefined' ? await window.Clerk?.session?.getToken() : null;
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    // ADR 019: the client is the sole source of the user's IANA zone. Sending it on
    // every request (rather than once at sign-in) means a user who travels or changes
    // their machine's zone starts rendering in the new one with no manual step, and no
    // call site can forget to supply it. The server stores it on app_user and uses it
    // only to render dates back — never to decide what instant to store.
    request.headers.set('X-Timezone', userTimeZone());
    return request;
  },
});
