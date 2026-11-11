import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'src/test/server';
import {
  rateRunCard,
  readRun,
  readRunBreakdown,
  readRunState,
  rerunRun,
  startChosenCards,
} from 'src/api/run';
import { ApiDetailError } from 'src/api/unwrap';
import type { components } from 'src/api/types';

const BASE = 'http://localhost:8000';

const RUN: components['schemas']['RunRead'] = {
  id: 'run_8',
  practice_id: 'practice_1',
  status: 'active',
  day: '2026-11-03',
  day_index: 1,
  created_at: '2026-11-03T18:00:00Z',
  last_activity_at: '2026-11-03T18:05:00Z',
};

const RUN_DETAIL: components['schemas']['RunDetail'] = {
  ...RUN,
  practice_name: 'Commands + Ports',
  decks: [
    { deck_id: 'deck_2', deck_name: 'Ports' },
    { deck_id: 'deck_1', deck_name: 'Commands' },
  ],
  configurations: [
    {
      deck_id: 'deck_2',
      prompt_field_ids: ['field_port'],
      answer_field_ids: ['field_protocol'],
      prompt_pool_ids: [],
      prompt_pool_counts: [],
      answer_pool_ids: [],
      answer_pool_counts: [],
    },
    {
      deck_id: 'deck_1',
      prompt_field_ids: [],
      answer_field_ids: ['field_flag'],
      prompt_pool_ids: ['field_command', 'field_summary'],
      prompt_pool_counts: [1],
      answer_pool_ids: [],
      answer_pool_counts: [],
    },
  ],
};

const STATE: components['schemas']['RunState'] = {
  practice_id: 'practice_1',
  practice_name: 'Commands + Ports',
  day: '2026-11-03',
  day_index: 0,
  status: 'active',
  progress: { total_cards: 3, unseen: 2, retry_pending: 0, passed: 1, still_failed: 0 },
  current_card: {
    run_card_id: 'rc_1',
    card_id: 'card_1',
    attempt: 1,
    prompts: [{ field_def_id: 'front', name: 'Front', type: 'text', value: 'Bonjour' }],
    answers: [{ field_def_id: 'back', name: 'Back', type: 'text', value: 'Hello' }],
  },
};

describe('readRun', () => {
  it('requests the run and returns it with its decks and how it asked each', async () => {
    let requested: unknown;
    server.use(
      http.get(`${BASE}/api/runs/:run_id`, ({ params }) => {
        requested = params.run_id;
        return HttpResponse.json(RUN_DETAIL);
      }),
    );

    await expect(readRun('run_8')).resolves.toEqual(RUN_DETAIL);
    expect(requested).toBe('run_8');
  });

  it('throws for an unknown or foreign run', async () => {
    server.use(
      http.get(`${BASE}/api/runs/:run_id`, () =>
        HttpResponse.json({ detail: 'Run not found' }, { status: 404 }),
      ),
    );

    await expect(readRun('run_8')).rejects.toThrow('Run not found');
  });
});

describe('readRunState', () => {
  it('requests the run and returns its resolved state', async () => {
    let requested: unknown;
    server.use(
      http.get(`${BASE}/api/runs/:run_id/state`, ({ params }) => {
        requested = params.run_id;
        return HttpResponse.json(STATE);
      }),
    );

    await expect(readRunState('run_7')).resolves.toEqual(STATE);
    expect(requested).toBe('run_7');
  });
});

describe('readRunBreakdown', () => {
  it('requests the run and returns its breakdown', async () => {
    const breakdown: components['schemas']['RunBreakdownRead'] = { total_cards: 0, cards: [] };
    let requested: unknown;
    server.use(
      http.get(`${BASE}/api/runs/:run_id/breakdown`, ({ params }) => {
        requested = params.run_id;
        return HttpResponse.json(breakdown);
      }),
    );

    await expect(readRunBreakdown('run_7')).resolves.toEqual(breakdown);
    expect(requested).toBe('run_7');
  });

  it('throws an ApiDetailError carrying run_active for a run still going', async () => {
    server.use(
      http.get(`${BASE}/api/runs/:run_id/breakdown`, () =>
        HttpResponse.json(
          { detail: { code: 'run_active', message: 'run run_7 is still active' } },
          { status: 409 },
        ),
      ),
    );

    const error = await readRunBreakdown('run_7').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiDetailError);
    expect((error as ApiDetailError).detail.code).toBe('run_active');
  });
});

describe('rerunRun', () => {
  it('posts with no body and returns the new run', async () => {
    let requested: unknown;
    let body: string | undefined;
    server.use(
      http.post(`${BASE}/api/runs/:run_id/rerun`, async ({ params, request }) => {
        requested = params.run_id;
        body = await request.text();
        return HttpResponse.json(RUN, { status: 201 });
      }),
    );

    await expect(rerunRun('run_7')).resolves.toEqual(RUN);
    expect(requested).toBe('run_7');
    expect(body).toBe('');
  });

  it('throws an ApiDetailError carrying practice_has_active_run', async () => {
    server.use(
      http.post(`${BASE}/api/runs/:run_id/rerun`, () =>
        HttpResponse.json(
          { detail: { code: 'practice_has_active_run', message: 'x' } },
          { status: 400 },
        ),
      ),
    );

    const error = await rerunRun('run_7').catch((e: unknown) => e);
    expect((error as ApiDetailError).detail.code).toBe('practice_has_active_run');
  });
});

describe('startChosenCards', () => {
  it('posts the chosen card ids and returns the new run', async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/api/runs/:run_id/chosen_cards`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(RUN, { status: 201 });
      }),
    );

    await expect(startChosenCards('run_7', ['card_1', 'card_2'])).resolves.toEqual(RUN);
    expect(body).toEqual({ card_ids: ['card_1', 'card_2'] });
  });
});

describe('rateRunCard', () => {
  it('posts the ratings to the run card and returns both cards', async () => {
    const result: components['schemas']['RatingSubmissionResult'] = {
      rated_run_card: {
        id: 'rc_1',
        run_id: 'run_7',
        card_id: 'card_1',
        position: 0,
        prompts: ['front'],
        answers: ['back'],
        status: 'passed',
        created_at: '2026-01-01T00:00:00Z',
      },
      requeued_run_card: null,
    };
    let requested: unknown;
    let body: unknown;
    server.use(
      http.post(`${BASE}/api/run_cards/:run_card_id/rate`, async ({ params, request }) => {
        requested = params.run_card_id;
        body = await request.json();
        return HttpResponse.json(result);
      }),
    );

    await expect(rateRunCard('rc_1', { back: 4 })).resolves.toEqual(result);
    expect(requested).toBe('rc_1');
    expect(body).toEqual({ ratings: { back: 4 } });
  });
});
