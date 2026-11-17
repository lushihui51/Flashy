import createClient from 'openapi-fetch';
import type { paths } from 'src/api/types.ts';
import { CONNECTION_FAILED_MESSAGE } from 'src/api/unwrap';
import { userTimeZone } from 'src/lib/datetime.ts';

// Clerk exposes a global `window.Clerk` once ClerkProvider has mounted — the
// conventional way to pull a session token into a plain (non-hook) fetch client. No
// official types for this ship with @clerk/react's public API, so this declares the
// part the client reads.
declare global {
  interface Window {
    Clerk?: {
      loaded?: boolean;
      session?: { getToken: () => Promise<string | null> } | null;
    };
  }
}

const CLERK_POLL_MS = 50;

// Shared by every request that starts while Clerk is still loading, and dropped once it
// resolves, so a request never waits on a Clerk that has already loaded.
let clerkLoading: Promise<void> | null = null;

function clerkLoaded(): Promise<void> {
  if (window.Clerk?.loaded) return Promise.resolve();
  // Clerk announces nothing when it has loaded, and `window.Clerk` itself appears only
  // once its script has run, so this checks until `loaded` is true.
  clerkLoading ??= new Promise((resolve) => {
    const timer = setInterval(() => {
      if (!window.Clerk?.loaded) return;
      clearInterval(timer);
      clerkLoading = null;
      resolve();
    }, CLERK_POLL_MS);
  });
  return clerkLoading;
}

/** The session's token, or `null` while Clerk holds no session. Throws the lost
 * connection's plain `Error` when a session exists and gives no token. */
async function sessionToken(): Promise<string | null> {
  await clerkLoaded();
  const session = window.Clerk?.session;
  if (!session) return null;
  let token: string | null;
  try {
    token = await session.getToken();
  } catch (error) {
    throw new Error(CONNECTION_FAILED_MESSAGE, { cause: error });
  }
  // A request sent without the token would be answered as the example user.
  if (!token) throw new Error(CONNECTION_FAILED_MESSAGE);
  return token;
}

export const client = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/',
  fetch: (request) => globalThis.fetch(request),
});

client.use({
  async onRequest({ request, schemaPath }) {
    // The health probe takes no auth, and a Clerk failure must never register as a
    // probe failure, so it neither waits for Clerk nor asks it for a token. Every other
    // request waits for Clerk, since one sent with no token reads as the example user's
    // and a user's would be shown the example library as their own (ADR 132).
    if (schemaPath !== '/api/health' && typeof window !== 'undefined') {
      const token = await sessionToken();
      if (token) {
        request.headers.set('Authorization', `Bearer ${token}`);
      }
    }
    // The client is the sole source of the user's IANA zone. Sending it on every
    // request (rather than once at sign-in) means a user who travels or changes their
    // machine's zone starts rendering in the new one with no manual step, and no call
    // site can forget to supply it. The server stores it on app_user and uses it only
    // to render dates back — never to decide what instant to store.
    request.headers.set('X-Timezone', userTimeZone());
    return request;
  },
  // openapi-fetch calls this only when `fetch` itself throws (network failure, CORS
  // rejection, abort), so a request with no response reads plainly and is never an
  // `ApiError` — which is how a caller tells "no response" from "an error response".
  onError({ error }) {
    return new Error(CONNECTION_FAILED_MESSAGE, { cause: error });
  },
});
