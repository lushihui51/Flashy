import { afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'src/test/server';
import { HEALTH_PROBE_TIMEOUT_MS, readHealth } from 'src/api/health';
import { ApiError, CONNECTION_FAILED_MESSAGE } from 'src/api/unwrap';

const BASE = 'http://localhost:8000';

afterEach(() => {
  vi.useRealTimers();
});

describe('readHealth', () => {
  it('resolves to the body on a 200', async () => {
    server.use(http.get(`${BASE}/api/health`, () => HttpResponse.json({ status: 'ok' })));

    await expect(readHealth()).resolves.toEqual({ status: 'ok' });
  });

  it('rejects with the can\'t-connect text, not an ApiError, when the server never answers', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    server.use(http.get(`${BASE}/api/health`, () => new Promise<never>(() => {})));

    const settled = readHealth().then(
      () => {
        throw new Error('expected readHealth to reject');
      },
      (error: unknown) => error,
    );
    await vi.advanceTimersByTimeAsync(HEALTH_PROBE_TIMEOUT_MS);
    const thrown = await settled;

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).not.toBeInstanceOf(ApiError);
    expect((thrown as Error).message).toBe(CONNECTION_FAILED_MESSAGE);
  });
});
