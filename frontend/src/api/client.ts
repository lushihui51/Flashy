import createClient from 'openapi-fetch';
import type { paths } from 'src/api/types.ts';

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
    return request;
  },
});
