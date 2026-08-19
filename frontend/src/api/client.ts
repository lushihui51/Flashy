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

export function displayError(error: unknown): void {
  // 1. Instantly dump the complete, raw error details to the developer console
  console.error('❌ Debug info for displayError:', error);

  const detail =
    typeof error === 'object' && error !== null && 'detail' in error
      ? (error as { detail?: unknown }).detail
      : undefined;

  const message =
    typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail.map((e) => `${e.loc.join('.')}: ${e.msg}`).join('; ')
        : `An unknown error occurred (${error instanceof Error ? error.message : 'Inspect console for details'})`;

  throw new Error(message);
}
