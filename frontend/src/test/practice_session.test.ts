import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'src/test/server';
import {
  createPracticeSession,
  readPracticeSessions,
  readPracticeSession,
  readPracticeRunState,
  readPracticeSessionBreakdown,
  rerunPracticeSession,
  ratePracticeCard,
} from 'src/api/practice_session';
import type { components } from 'src/api/types';

const BASE = 'http://localhost:8000';

describe('createPracticeSession', () => {
  it('sends the payload and returns the created practice session', async () => {
    const payload: components['schemas']['PracticeSessionCreate'] = {
      name: 'Aug 24, 2026, 2:15 PM',
      deck_practice_config_ids: ['00000000-0000-0000-0000-000000000401'],
    };
    let sentBody: unknown;

    server.use(
      http.post(`${BASE}/api/practice_sessions`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json(
          {
            id: '00000000-0000-0000-0000-000000000402',
            user_id: '00000000-0000-0000-0000-000000000001',
            name: 'Aug 24, 2026, 2:15 PM',
            status: 'active',
            created_at: '2026-01-01T00:00:00Z',
          },
          { status: 201 },
        );
      }),
    );

    const created = await createPracticeSession(payload);
    expect(sentBody).toEqual(payload);
    expect(created).toEqual({
      id: '00000000-0000-0000-0000-000000000402',
      user_id: '00000000-0000-0000-0000-000000000001',
      name: 'Aug 24, 2026, 2:15 PM',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
    });
  });

  it('throws a formatted message on a 422 validation error', async () => {
    server.use(
      http.post(`${BASE}/api/practice_sessions`, () =>
        HttpResponse.json(
          {
            detail: [
              {
                loc: ['body', 'deck_practice_config_ids'],
                msg: 'Field required',
                type: 'missing',
              },
            ],
          },
          { status: 422 },
        ),
      ),
    );

    await expect(
      createPracticeSession({
        name: 'Run',
        deck_practice_config_ids: [],
      }),
    ).rejects.toThrow('body.deck_practice_config_ids: Field required');
  });

  it("throws the message out of a stale-config error's object detail", async () => {
    server.use(
      http.post(`${BASE}/api/practice_sessions`, () =>
        HttpResponse.json(
          {
            detail: {
              code: 'stale_config',
              message: 'field ids not live on this deck: [...]',
              config_id: '00000000-0000-0000-0000-000000000401',
            },
          },
          { status: 400 },
        ),
      ),
    );

    await expect(
      createPracticeSession({
        name: 'Run',
        deck_practice_config_ids: ['00000000-0000-0000-0000-000000000401'],
      }),
    ).rejects.toThrow('field ids not live on this deck: [...]');
  });
});

describe('readPracticeSessions', () => {
  const summary = {
    id: '00000000-0000-0000-0000-000000000402',
    user_id: '00000000-0000-0000-0000-000000000001',
    name: 'Alpha run',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    decks: [
      {
        deck_id: '00000000-0000-0000-0000-000000000301',
        deck_name: 'Shared Deck Name',
        subject_id: '00000000-0000-0000-0000-000000000201',
        subject_name: 'Alpha',
      },
    ],
  };

  it('sends no query params when unfiltered', async () => {
    let search = '';
    server.use(
      http.get(`${BASE}/api/practice_sessions`, ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json([summary]);
      }),
    );

    await expect(readPracticeSessions()).resolves.toEqual([summary]);
    expect(search).toBe('');
  });

  it('sends the subject and deck filters', async () => {
    let search = '';
    server.use(
      http.get(`${BASE}/api/practice_sessions`, ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json([]);
      }),
    );

    await readPracticeSessions({ subjectId: 'subject_1', deckId: 'deck_1' });

    const params = new URLSearchParams(search);
    expect(params.get('subject_id')).toBe('subject_1');
    expect(params.get('deck_id')).toBe('deck_1');
  });
});

describe('readPracticeSession', () => {
  it('requests the right id and returns the practice session', async () => {
    server.use(
      http.get(`${BASE}/api/practice_sessions/:practice_session_id`, ({ params }) =>
        HttpResponse.json({
          id: params.practice_session_id,
          user_id: '00000000-0000-0000-0000-000000000001',
          name: 'Alpha run',
          status: 'active',
          created_at: '2026-01-01T00:00:00Z',
        }),
      ),
    );

    await expect(readPracticeSession('ps_42')).resolves.toEqual({
      id: 'ps_42',
      user_id: '00000000-0000-0000-0000-000000000001',
      name: 'Alpha run',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
    });
  });

  it('throws the detail string on a 404', async () => {
    server.use(
      http.get(`${BASE}/api/practice_sessions/:practice_session_id`, () =>
        HttpResponse.json({ detail: 'Practice session not found' }, { status: 404 }),
      ),
    );

    await expect(readPracticeSession('nope')).rejects.toThrow('Practice session not found');
  });
});

describe('readPracticeRunState', () => {
  it('requests the right session and returns the resolved run state', async () => {
    let requestedSessionId: string | readonly string[] | undefined;
    server.use(
      http.get(`${BASE}/api/practice_sessions/:practice_session_id/run`, ({ params }) => {
        requestedSessionId = params.practice_session_id;
        return HttpResponse.json({
          session_name: 'Evening run',
          session_status: 'active',
          progress: { total_cards: 3, unseen: 2, retry_pending: 0, passed: 1, still_failed: 0 },
          current_card: {
            practice_card_id: 'pc_1',
            card_id: 'card_1',
            attempt: 1,
            prompts: [{ field_def_id: 'front', name: 'Front', type: 'text', value: 'Bonjour' }],
            answers: [{ field_def_id: 'back', name: 'Back', type: 'text', value: 'Hello' }],
          },
        });
      }),
    );

    const state = await readPracticeRunState('ps_7');

    expect(requestedSessionId).toBe('ps_7');
    expect(state).toEqual({
      session_name: 'Evening run',
      session_status: 'active',
      progress: { total_cards: 3, unseen: 2, retry_pending: 0, passed: 1, still_failed: 0 },
      current_card: {
        practice_card_id: 'pc_1',
        card_id: 'card_1',
        attempt: 1,
        prompts: [{ field_def_id: 'front', name: 'Front', type: 'text', value: 'Bonjour' }],
        answers: [{ field_def_id: 'back', name: 'Back', type: 'text', value: 'Hello' }],
      },
    });
  });

  it('returns a null current_card once the session has completed', async () => {
    server.use(
      http.get(`${BASE}/api/practice_sessions/:practice_session_id/run`, () =>
        HttpResponse.json({
          session_name: 'Evening run',
          session_status: 'completed',
          progress: { total_cards: 3, unseen: 0, retry_pending: 0, passed: 3, still_failed: 0 },
          current_card: null,
        }),
      ),
    );

    const state = await readPracticeRunState('ps_7');
    expect(state.session_status).toBe('completed');
    expect(state.current_card).toBeNull();
  });

  it('throws the detail string for an unknown or foreign session', async () => {
    server.use(
      http.get(`${BASE}/api/practice_sessions/:practice_session_id/run`, () =>
        HttpResponse.json({ detail: 'Practice session not found' }, { status: 404 }),
      ),
    );

    await expect(readPracticeRunState('ps_7')).rejects.toThrow('Practice session not found');
  });
});

describe('readPracticeSessionBreakdown', () => {
  it('requests the right session and returns the resolved breakdown', async () => {
    let requestedSessionId: string | readonly string[] | undefined;
    const breakdown = {
      total_cards: 1,
      passed_first_try: 1,
      passed_after_one_fail: 0,
      passed_after_many_fails: 0,
      still_failed: 0,
      cards: [
        {
          card_id: 'card_1',
          bucket: 'passed_first_try',
          attempt_count: 1,
          primary_field: { field_def_id: 'front', name: 'Front', type: 'text', value: 'Bonjour' },
          attempts: [
            {
              practice_card_id: 'pc_1',
              status: 'passed',
              created_at: '2026-01-01T00:00:00Z',
              prompts: [{ field_def_id: 'front', name: 'Front', type: 'text', value: 'Bonjour' }],
              answers: [
                { field_def_id: 'back', name: 'Back', type: 'text', value: 'Hello', rating: 4 },
              ],
            },
          ],
        },
      ],
    };

    server.use(
      http.get(`${BASE}/api/practice_sessions/:practice_session_id/breakdown`, ({ params }) => {
        requestedSessionId = params.practice_session_id;
        return HttpResponse.json(breakdown);
      }),
    );

    const result = await readPracticeSessionBreakdown('ps_7');

    expect(requestedSessionId).toBe('ps_7');
    expect(result).toEqual(breakdown);
  });

  it('throws the structured message and code on a 409 while the session is active', async () => {
    server.use(
      http.get(`${BASE}/api/practice_sessions/:practice_session_id/breakdown`, () =>
        HttpResponse.json(
          { detail: { code: 'session_active', message: 'practice_session ps_7 is still active' } },
          { status: 409 },
        ),
      ),
    );

    await expect(readPracticeSessionBreakdown('ps_7')).rejects.toThrow(
      'practice_session ps_7 is still active',
    );
  });

  it('throws the detail string for an unknown or foreign session', async () => {
    server.use(
      http.get(`${BASE}/api/practice_sessions/:practice_session_id/breakdown`, () =>
        HttpResponse.json({ detail: 'Practice session not found' }, { status: 404 }),
      ),
    );

    await expect(readPracticeSessionBreakdown('ps_7')).rejects.toThrow(
      'Practice session not found',
    );
  });
});

describe('rerunPracticeSession', () => {
  it('posts to the right session and returns the new session', async () => {
    let requestedSessionId: string | readonly string[] | undefined;
    server.use(
      http.post(`${BASE}/api/practice_sessions/:practice_session_id/rerun`, ({ params }) => {
        requestedSessionId = params.practice_session_id;
        return HttpResponse.json(
          {
            id: '00000000-0000-0000-0000-000000000403',
            user_id: '00000000-0000-0000-0000-000000000001',
            name: 'Evening run',
            status: 'active',
            created_at: '2026-01-01T00:00:00Z',
          },
          { status: 201 },
        );
      }),
    );

    const result = await rerunPracticeSession('ps_7');

    expect(requestedSessionId).toBe('ps_7');
    expect(result).toEqual({
      id: '00000000-0000-0000-0000-000000000403',
      user_id: '00000000-0000-0000-0000-000000000001',
      name: 'Evening run',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
    });
  });

  it('throws the message out of a nothing_to_rerun error', async () => {
    server.use(
      http.post(`${BASE}/api/practice_sessions/:practice_session_id/rerun`, () =>
        HttpResponse.json(
          {
            detail: {
              code: 'nothing_to_rerun',
              message: 'no deck from this session still has a live, valid snapshot to rerun',
            },
          },
          { status: 400 },
        ),
      ),
    );

    await expect(rerunPracticeSession('ps_7')).rejects.toThrow(
      'no deck from this session still has a live, valid snapshot to rerun',
    );
  });

  it('throws the detail string for an unknown or foreign session', async () => {
    server.use(
      http.post(`${BASE}/api/practice_sessions/:practice_session_id/rerun`, () =>
        HttpResponse.json({ detail: 'Practice session not found' }, { status: 404 }),
      ),
    );

    await expect(rerunPracticeSession('ps_7')).rejects.toThrow('Practice session not found');
  });
});

describe('ratePracticeCard', () => {
  it('sends the ratings and returns the result', async () => {
    const payload: components['schemas']['RatingSubmission'] = {
      ratings: { back: 3 },
    };
    let sentBody: unknown;

    server.use(
      http.post(
        `${BASE}/api/practice_cards/:practice_card_id/rate`,
        async ({ request, params }) => {
          sentBody = await request.json();
          return HttpResponse.json({
            rated_practice_card: {
              id: params.practice_card_id,
              practice_session_id: 'ps_7',
              card_id: 'card_1',
              position: 1,
              prompts: ['front'],
              answers: ['back'],
              status: 'passed',
              created_at: '2026-01-01T00:00:00Z',
            },
            requeued_practice_card: null,
          });
        },
      ),
    );

    const result = await ratePracticeCard('pc_1', payload);
    expect(sentBody).toEqual(payload);
    expect(result?.rated_practice_card.id).toBe('pc_1');
    expect(result?.requeued_practice_card).toBeNull();
  });
});
