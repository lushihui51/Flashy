import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'src/test/server';
import {
  createPractice,
  deletePractice,
  readPractice,
  readPractices,
  readSuggestedPracticeName,
  renamePractice,
  startRun,
} from 'src/api/practice';
import { ApiDetailError } from 'src/api/unwrap';
import type { components } from 'src/api/types';

const BASE = 'http://localhost:8000';

const SUMMARY: components['schemas']['PracticeSummary'] = {
  id: 'practice_1',
  name: 'Commands + Ports',
  created_at: '2026-11-03T18:00:00Z',
  decks: [
    { deck_id: 'deck_1', deck_name: 'Commands' },
    { deck_id: 'deck_2', deck_name: 'Ports' },
  ],
  active_run_id: null,
  readiness: null,
};

describe('createPractice', () => {
  it('posts the name and the decks in the order picked, and returns the practice', async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/api/practices`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(SUMMARY, { status: 201 });
      }),
    );

    await expect(createPractice({ name: null, deck_ids: ['deck_2', 'deck_1'] })).resolves.toEqual(
      SUMMARY,
    );
    expect(body).toEqual({ name: null, deck_ids: ['deck_2', 'deck_1'] });
  });

  it('throws an ApiDetailError carrying practice_name_taken', async () => {
    server.use(
      http.post(`${BASE}/api/practices`, () =>
        HttpResponse.json(
          { detail: { code: 'practice_name_taken', message: 'x' } },
          { status: 400 },
        ),
      ),
    );

    const error = await createPractice({ name: 'Mine', deck_ids: ['deck_1'] }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ApiDetailError);
    expect((error as ApiDetailError).detail.code).toBe('practice_name_taken');
  });
});

describe('readPractices', () => {
  it('returns every practice in the order received', async () => {
    const second = { ...SUMMARY, id: 'practice_2', name: 'Ports' };
    server.use(http.get(`${BASE}/api/practices`, () => HttpResponse.json([second, SUMMARY])));

    await expect(readPractices()).resolves.toEqual([second, SUMMARY]);
  });
});

describe('readPractice', () => {
  it('requests the practice and returns it with its runs and their counts', async () => {
    const detail: components['schemas']['PracticeDetail'] = {
      ...SUMMARY,
      runs: [
        {
          id: 'run_1',
          practice_id: 'practice_1',
          status: 'completed',
          day: '2026-11-03',
          day_index: 0,
          created_at: '2026-11-03T18:00:00Z',
          last_activity_at: '2026-11-03T18:00:00Z',
          reached_cards: 12,
          counted_cards: 74,
        },
      ],
    };
    let requested: unknown;
    server.use(
      http.get(`${BASE}/api/practices/:practice_id`, ({ params }) => {
        requested = params.practice_id;
        return HttpResponse.json(detail);
      }),
    );

    await expect(readPractice('practice_1')).resolves.toEqual(detail);
    expect(requested).toBe('practice_1');
  });

  it('throws for an unknown or foreign practice', async () => {
    server.use(
      http.get(`${BASE}/api/practices/:practice_id`, () =>
        HttpResponse.json({ detail: 'Practice not found' }, { status: 404 }),
      ),
    );

    await expect(readPractice('practice_1')).rejects.toThrow('Practice not found');
  });
});

describe('readSuggestedPracticeName', () => {
  it('sends one deck_ids param per deck, in order, and returns the name', async () => {
    let deckIds: string[] = [];
    server.use(
      http.get(`${BASE}/api/practices/suggested-name`, ({ request }) => {
        deckIds = new URL(request.url).searchParams.getAll('deck_ids');
        return HttpResponse.json({ name: 'Ports + Commands' });
      }),
    );

    await expect(readSuggestedPracticeName(['deck_2', 'deck_1'])).resolves.toEqual({
      name: 'Ports + Commands',
    });
    expect(deckIds).toEqual(['deck_2', 'deck_1']);
  });
});

describe('startRun', () => {
  it("posts to the practice's runs and returns the run", async () => {
    const run: components['schemas']['RunRead'] = {
      id: 'run_1',
      practice_id: 'practice_1',
      status: 'active',
      day: '2026-11-03',
      day_index: 0,
      created_at: '2026-11-03T18:00:00Z',
      last_activity_at: '2026-11-03T18:00:00Z',
    };
    let requested: unknown;
    server.use(
      http.post(`${BASE}/api/practices/:practice_id/runs`, ({ params }) => {
        requested = params.practice_id;
        return HttpResponse.json(run);
      }),
    );

    await expect(startRun('practice_1')).resolves.toEqual(run);
    expect(requested).toBe('practice_1');
  });

  it('throws an ApiDetailError carrying no_cards', async () => {
    server.use(
      http.post(`${BASE}/api/practices/:practice_id/runs`, () =>
        HttpResponse.json({ detail: { code: 'no_cards', message: 'x' } }, { status: 400 }),
      ),
    );

    const error = await startRun('practice_1').catch((e: unknown) => e);
    expect((error as ApiDetailError).detail.code).toBe('no_cards');
  });
});

describe('renamePractice', () => {
  it('patches the practice with its new name and returns the practice', async () => {
    let requested: unknown;
    let body: unknown;
    server.use(
      http.patch(`${BASE}/api/practices/:practice_id`, async ({ params, request }) => {
        requested = params.practice_id;
        body = await request.json();
        return HttpResponse.json({ ...SUMMARY, name: 'Evening' });
      }),
    );

    await expect(renamePractice('practice_1', 'Evening')).resolves.toEqual({
      ...SUMMARY,
      name: 'Evening',
    });
    expect(requested).toBe('practice_1');
    expect(body).toEqual({ name: 'Evening' });
  });

  it('throws an ApiDetailError carrying practice_name_taken', async () => {
    server.use(
      http.patch(`${BASE}/api/practices/:practice_id`, () =>
        HttpResponse.json(
          { detail: { code: 'practice_name_taken', message: 'x' } },
          { status: 400 },
        ),
      ),
    );

    const error = await renamePractice('practice_1', 'Evening').catch((e: unknown) => e);
    expect((error as ApiDetailError).detail.code).toBe('practice_name_taken');
  });
});

describe('deletePractice', () => {
  it('deletes the practice and resolves with nothing', async () => {
    let requested: unknown;
    server.use(
      http.delete(`${BASE}/api/practices/:practice_id`, ({ params }) => {
        requested = params.practice_id;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(deletePractice('practice_1')).resolves.toBeUndefined();
    expect(requested).toBe('practice_1');
  });

  it('throws for an unknown or foreign practice', async () => {
    server.use(
      http.delete(`${BASE}/api/practices/:practice_id`, () =>
        HttpResponse.json({ detail: 'Practice not found' }, { status: 404 }),
      ),
    );

    await expect(deletePractice('practice_1')).rejects.toThrow('Practice not found');
  });
});
