import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'src/test/server';
import { readSubjects } from 'src/api/subject';
import { ApiError, CONNECTION_FAILED_MESSAGE, SERVER_TROUBLE_MESSAGE } from 'src/api/unwrap';

const BASE = 'http://localhost:8000';

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
    server.use(http.get(`${BASE}/api/subjects`, () => HttpResponse.error()));

    const thrown = await rejectionOf(readSubjects());

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).not.toBeInstanceOf(ApiError);
    expect((thrown as Error).message).toBe(CONNECTION_FAILED_MESSAGE);
  });

  it('rejects an empty-body 502 with a status-carrying ApiError (ADR 065)', async () => {
    // Before ADR 065 this resolved to `undefined`, as though the call had succeeded.
    server.use(http.get(`${BASE}/api/subjects`, () => new HttpResponse(null, { status: 502 })));

    const thrown = await rejectionOf(readSubjects());

    expect(thrown).toBeInstanceOf(ApiError);
    expect((thrown as ApiError).status).toBe(502);
    expect((thrown as ApiError).message).toBe(SERVER_TROUBLE_MESSAGE);
  });
});
