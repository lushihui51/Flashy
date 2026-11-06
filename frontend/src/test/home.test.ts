import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'src/test/server';
import { readHome } from 'src/api/home';
import type { components } from 'src/api/types';

const BASE = 'http://localhost:8000';

describe('readHome', () => {
  it('returns what GET /api/home answers', async () => {
    const home: components['schemas']['HomeRead'] = {
      steps: { has_subject: true, has_deck: false, has_card: false, has_configuration: false },
      active_practices: [],
      recent_decks: [],
    };
    server.use(http.get(`${BASE}/api/home`, () => HttpResponse.json(home)));

    await expect(readHome()).resolves.toEqual(home);
  });

  it('throws on a failure', async () => {
    server.use(
      http.get(`${BASE}/api/home`, () => HttpResponse.json({ detail: 'nope' }, { status: 500 })),
    );

    await expect(readHome()).rejects.toThrow();
  });
});
