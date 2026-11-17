// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'src/test/server';
import { readDecks } from 'src/api/deck';
import { readHealth } from 'src/api/health';
import { ApiError, CONNECTION_FAILED_MESSAGE, SERVER_TROUBLE_MESSAGE } from 'src/api/unwrap';

const BASE = 'http://localhost:8000';

/** Answers `GET /api/decks` with no decks, and keeps each request's `Authorization`
 * header, `null` where it carried none. */
function recordDecksRequests(): (string | null)[] {
  const authorizations: (string | null)[] = [];
  server.use(
    http.get(`${BASE}/api/decks`, ({ request }) => {
      authorizations.push(request.headers.get('Authorization'));
      return HttpResponse.json([]);
    }),
  );
  return authorizations;
}

/** Longer than the client takes to see that Clerk has loaded. */
const waitPastClerkPoll = () => new Promise((resolve) => setTimeout(resolve, 200));

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (e) {
    return e;
  }
  throw new Error('expected the promise to reject');
}

describe('client', () => {
  it('turns a request with no response into a plain Error with readable text', async () => {
    server.use(http.get(`${BASE}/api/decks`, () => HttpResponse.error()));

    const thrown = await rejectionOf(readDecks());

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).not.toBeInstanceOf(ApiError);
    expect((thrown as Error).message).toBe(CONNECTION_FAILED_MESSAGE);
  });

  it('rejects an empty-body 502 with a status-carrying ApiError', async () => {
    // An empty error body must still reject: `unwrap` decides on `response.ok`, not on
    // `error`.
    server.use(http.get(`${BASE}/api/decks`, () => new HttpResponse(null, { status: 502 })));

    const thrown = await rejectionOf(readDecks());

    expect(thrown).toBeInstanceOf(ApiError);
    expect((thrown as ApiError).status).toBe(502);
    expect((thrown as ApiError).message).toBe(SERVER_TROUBLE_MESSAGE);
  });

  it('sends nothing before Clerk has loaded, then sends with no token when Clerk holds no session', async () => {
    const authorizations = recordDecksRequests();
    delete window.Clerk;

    const decks = readDecks();
    await waitPastClerkPoll();
    expect(authorizations).toEqual([]);

    window.Clerk = { loaded: false, session: null };
    await waitPastClerkPoll();
    expect(authorizations).toEqual([]);

    window.Clerk.loaded = true;
    await expect(decks).resolves.toEqual([]);
    expect(authorizations).toEqual([null]);
  });

  it('sends the session\'s token while a session exists', async () => {
    const authorizations = recordDecksRequests();
    window.Clerk = { loaded: true, session: { getToken: () => Promise.resolve('session-token') } };

    await readDecks();

    expect(authorizations).toEqual(['Bearer session-token']);
  });

  it('fails a request whose session gives no token as a lost connection, and sends nothing', async () => {
    const authorizations = recordDecksRequests();

    for (const getToken of [
      () => Promise.resolve(null),
      () => Promise.reject(new Error('Clerk could not refresh the session')),
    ]) {
      window.Clerk = { loaded: true, session: { getToken } };

      const thrown = await rejectionOf(readDecks());

      expect(thrown).toBeInstanceOf(Error);
      expect(thrown).not.toBeInstanceOf(ApiError);
      expect((thrown as Error).message).toBe(CONNECTION_FAILED_MESSAGE);
    }
    expect(authorizations).toEqual([]);
  });

  it('sends the health probe before Clerk has loaded, with no token', async () => {
    const getToken = vi.fn().mockResolvedValue('session-token');
    window.Clerk = { loaded: false, session: { getToken } };
    let authorization: string | null = 'unset';
    server.use(
      http.get(`${BASE}/api/health`, ({ request }) => {
        authorization = request.headers.get('Authorization');
        return HttpResponse.json({ status: 'ok' });
      }),
    );

    await expect(readHealth()).resolves.toEqual({ status: 'ok' });

    expect(authorization).toBeNull();
    expect(getToken).not.toHaveBeenCalled();
  });
});
