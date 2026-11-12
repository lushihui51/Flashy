// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import DeckBoardPage from 'src/pages/DeckBoardPage';
import type { components } from 'src/api/types';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';

// Every call the form makes to leave, passed on to the real leave.
const leaveCalls = vi.hoisted(() => vi.fn());
vi.mock('src/lib/leaveForm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('src/lib/leaveForm')>();
  return {
    useLeaveForm: () => {
      const leave = actual.useLeaveForm();
      return (...args: Parameters<typeof leave>) => {
        leaveCalls(...args);
        return leave(...args);
      };
    },
  };
});

const BASE = 'http://localhost:8000';

const DECK: components['schemas']['DeckDetail'] = {
  id: 'd1',
  name: 'Ports',
  created_at: '2026-11-01T00:00:00Z',
  last_activity_at: '2026-11-01T00:00:00Z',
  readiness: null,
  field_defs: [
    { id: 'f1', name: 'Port Number', type: 'text', position: 0 },
    { id: 'f2', name: 'Protocol Name', type: 'text', position: 1 },
    { id: 'f3', name: 'TCP or UDP', type: 'text', position: 2 },
  ],
  cards: [],
};

const ARRAYS = {
  prompt_field_ids: ['f1'],
  answer_field_ids: ['f2'],
  prompt_pool_ids: [],
  prompt_pool_counts: [],
  answer_pool_ids: [],
  answer_pool_counts: [],
};

function practice(
  overrides: Partial<components['schemas']['PracticeDetail']> = {},
): components['schemas']['PracticeDetail'] {
  return {
    id: 'p1',
    name: 'Commands + Ports',
    created_at: '2026-11-01T00:00:00Z',
    decks: [{ deck_id: 'd1', deck_name: 'Ports' }],
    active_run_id: null,
    readiness: null,
    runs: [],
    configurations: [{ deck_id: 'd1', ...ARRAYS }],
    ...overrides,
  };
}

const RUN: components['schemas']['RunDetail'] = {
  id: 'r1',
  practice_id: 'p1',
  status: 'completed',
  day: '2026-11-03',
  day_index: 0,
  created_at: '2026-11-03T18:00:00Z',
  last_activity_at: '2026-11-03T18:00:00Z',
  practice_name: 'Commands + Ports',
  decks: [{ deck_id: 'd1', deck_name: 'Ports' }],
  // Unlike the practice's: TCP or UDP on the prompt side.
  configurations: [{ deck_id: 'd1', ...ARRAYS, prompt_field_ids: ['f3'] }],
};

const notFound = (detail: string) => HttpResponse.json({ detail }, { status: 404 });

// Every request but a GET the page sent.
let writes: Request[] = [];
const recordWrite = ({ request }: { request: Request }) => {
  if (request.method !== 'GET') writes.push(request);
};

function renderBoard(
  entry = '/practices/p1/decks/d1',
  {
    deck = HttpResponse.json(DECK) as Response,
    practiceRead = HttpResponse.json(practice()) as Response,
    runRead = HttpResponse.json(RUN) as Response,
  } = {},
) {
  server.use(
    http.get(`${BASE}/api/decks/:deck_id`, () => deck.clone()),
    http.get(`${BASE}/api/practices/:practice_id`, () => practiceRead.clone()),
    http.get(`${BASE}/api/runs/:run_id`, () => runRead.clone()),
  );
  return renderWithProviders(
    <Routes>
      <Route path="/practices/:practiceId/decks/:deckId" element={<DeckBoardPage />} />
      <Route path="/runs/:runId/decks/:deckId" element={<DeckBoardPage />} />
      <Route path="*" element={<span>elsewhere</span>} />
    </Routes>,
    [entry],
  );
}

const area = (name: string) => screen.getByRole('region', { name });
const barButtons = () =>
  within(screen.getByTestId('form-bar'))
    .getAllByRole('button')
    .map((button) => button.textContent);

async function moveToNotUsed(user: ReturnType<typeof userEvent.setup>, field: string) {
  await user.click(await screen.findByRole('button', { name: field }));
  await user.click(
    within(await screen.findByRole('dialog')).getByRole('button', { name: 'Not used' }),
  );
}

beforeEach(() => {
  leaveCalls.mockClear();
  writes = [];
  server.events.on('request:start', recordWrite);
});
afterEach(() => {
  server.events.removeListener('request:start', recordWrite);
  server.resetHandlers();
});

describe('DeckBoardPage from a practice with no active run', () => {
  it("is headed by the deck's mark and name over the practice's, with Cancel and Save", async () => {
    renderBoard();

    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Ports');
    expect(within(heading).getByRole('img', { name: 'Deck' })).toBeInTheDocument();
    const practiceLine = heading.nextElementSibling as HTMLElement;
    expect(practiceLine).toHaveTextContent('Commands + Ports');
    expect(within(practiceLine).getByRole('img', { name: 'Practice' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument();
    expect(barButtons()).toEqual(['Cancel', 'Save']);
    expect(document.title).toBe('Ports · Flashy');
  });

  it("draws the practice's configuration of the deck on the board", async () => {
    renderBoard();

    await screen.findByRole('heading', { level: 1 });
    expect(within(area('Prompt · always shown')).getByRole('button')).toHaveTextContent(
      '[Port Number]',
    );
    expect(within(area('Answer · always shown')).getByRole('button')).toHaveTextContent(
      '[Protocol Name]',
    );
    expect(within(area('Not used')).getByRole('button')).toHaveTextContent('[TCP or UDP]');
  });

  it('a move then Cancel sends no request and leaves for the practice’s page', async () => {
    const user = userEvent.setup();
    renderBoard();

    await moveToNotUsed(user, '[Protocol Name]');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(leaveCalls).toHaveBeenCalledWith('/practices/p1'));
    expect(writes).toEqual([]);
  });

  it('Cancel leaves for cancelTo when given', async () => {
    const user = userEvent.setup();
    renderBoard('/practices/p1/decks/d1?cancelTo=%2Fpractices&returnTo=%2F');

    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(leaveCalls).toHaveBeenCalledWith('/practices'));
  });

  it("Save sends one PUT with the board's arrays and leaves for returnTo", async () => {
    let body: unknown;
    let path = '';
    server.use(
      http.put(
        `${BASE}/api/practices/:practice_id/configurations/:deck_id`,
        async ({ request }) => {
          body = await request.json();
          path = new URL(request.url).pathname;
          return HttpResponse.json({ deck_id: 'd1', ...(body as object) });
        },
      ),
    );
    const user = userEvent.setup();
    renderBoard('/practices/p1/decks/d1?cancelTo=%2Fpractices&returnTo=%2F');

    await user.click(await screen.findByRole('button', { name: '[TCP or UDP]' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Answer · always shown',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(leaveCalls).toHaveBeenCalledWith('/'));
    expect(writes).toHaveLength(1);
    expect(path).toBe('/api/practices/p1/configurations/d1');
    expect(body).toEqual({ ...ARRAYS, answer_field_ids: ['f2', 'f3'] });
  });

  it("Save leaves for the practice's page with no returnTo", async () => {
    server.use(
      http.put(`${BASE}/api/practices/:practice_id/configurations/:deck_id`, () =>
        HttpResponse.json({ deck_id: 'd1', ...ARRAYS }),
      ),
    );
    const user = userEvent.setup();
    renderBoard();

    await user.click(await screen.findByRole('button', { name: 'Save' }));

    await waitFor(() => expect(leaveCalls).toHaveBeenCalledWith('/practices/p1'));
  });

  it("a tap on Save while not ready says the board's problem at its part, sends nothing, and a move clears it", async () => {
    const user = userEvent.setup();
    renderBoard();

    await moveToNotUsed(user, '[Port Number]');
    const sentence = 'The prompt side needs at least one field — always shown or random draw.';
    expect(screen.queryByText(sentence)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('aria-disabled', 'true');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(within(area('Prompt side')).getByText(sentence)).toBeInTheDocument();
    expect(writes).toEqual([]);

    await moveToNotUsed(user, '[Protocol Name]');
    expect(screen.queryByText(sentence)).not.toBeInTheDocument();
  });

  it('a failed Save says its sentence in the bar', async () => {
    server.use(
      http.put(`${BASE}/api/practices/:practice_id/configurations/:deck_id`, () =>
        notFound('Deck not found'),
      ),
    );
    const user = userEvent.setup();
    renderBoard();

    await user.click(await screen.findByRole('button', { name: 'Save' }));

    expect(await within(screen.getByTestId('form-bar')).findByRole('alert')).toHaveTextContent(
      'Deck not found.',
    );
    expect(leaveCalls).not.toHaveBeenCalled();
  });
});

describe('DeckBoardPage greyed', () => {
  it('with an active run, a tap on a field opens no move sheet and the bar holds Done alone', async () => {
    const user = userEvent.setup();
    renderBoard('/practices/p1/decks/d1', {
      practiceRead: HttpResponse.json(practice({ active_run_id: 'r9' })),
    });

    expect(await screen.findByText('A run is active.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '[Port Number]' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(barButtons()).toEqual(['Done']);
  });

  it("Done leaves for cancelTo, else the practice's page, sending nothing", async () => {
    const user = userEvent.setup();
    renderBoard('/practices/p1/decks/d1', {
      practiceRead: HttpResponse.json(practice({ active_run_id: 'r9' })),
    });

    await user.click(await screen.findByRole('button', { name: 'Done' }));

    await waitFor(() => expect(leaveCalls).toHaveBeenCalledWith('/practices/p1'));
    expect(writes).toEqual([]);
  });

  it("the run's board reads its run's configuration, greyed, with Done alone leaving for the run's page", async () => {
    const user = userEvent.setup();
    renderBoard('/runs/r1/decks/d1');

    expect(await screen.findByText('How this run asked it.')).toBeInTheDocument();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.nextElementSibling).toHaveTextContent('Commands + Ports');
    expect(within(area('Prompt · always shown')).getByRole('button')).toHaveTextContent(
      '[TCP or UDP]',
    );
    expect(within(area('Not used')).getByRole('button')).toHaveTextContent('[Port Number]');
    expect(barButtons()).toEqual(['Done']);

    await user.click(screen.getByRole('button', { name: 'Done' }));

    await waitFor(() => expect(leaveCalls).toHaveBeenCalledWith('/runs/r1'));
  });
});

describe('DeckBoardPage that cannot be shown', () => {
  it('says Loading fields… alone until every read has answered', async () => {
    let answer: () => void = () => {};
    server.use(
      http.get(`${BASE}/api/decks/:deck_id`, () => HttpResponse.json(DECK)),
      http.get(
        `${BASE}/api/practices/:practice_id`,
        () =>
          new Promise<Response>(
            (resolve) => (answer = () => resolve(HttpResponse.json(practice()))),
          ),
      ),
    );
    renderWithProviders(
      <Routes>
        <Route path="/practices/:practiceId/decks/:deckId" element={<DeckBoardPage />} />
      </Routes>,
      ['/practices/p1/decks/d1'],
    );

    expect(await screen.findByText('Loading fields…')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('form-bar')).not.toBeInTheDocument();

    answer();
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText('Loading fields…')).not.toBeInTheDocument();
  });

  it('says Practice not found. alone for an unknown practice, over a deck not found', async () => {
    renderBoard('/practices/p1/decks/d1', {
      deck: notFound('Deck not found'),
      practiceRead: notFound('Practice not found'),
    });

    expect(await screen.findByText('Practice not found.')).toBeInTheDocument();
    expect(screen.queryByText('Deck not found.')).not.toBeInTheDocument();
    expect(screen.queryByTestId('form-bar')).not.toBeInTheDocument();
  });

  it('says Run not found. for an unknown run', async () => {
    renderBoard('/runs/r1/decks/d1', { runRead: notFound('Run not found') });

    expect(await screen.findByText('Run not found.')).toBeInTheDocument();
  });

  it('says Deck not found. for an unknown deck', async () => {
    renderBoard('/practices/p1/decks/d1', { deck: notFound('Deck not found') });

    expect(await screen.findByText('Deck not found.')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it("says Deck not found. for a deck that is none of the practice's", async () => {
    renderBoard('/practices/p1/decks/d1', {
      practiceRead: HttpResponse.json(
        practice({ decks: [{ deck_id: 'd2', deck_name: 'Commands' }], configurations: [] }),
      ),
    });

    expect(await screen.findByText('Deck not found.')).toBeInTheDocument();
  });

  it('says Could not load this deck. as a refusal when a read fails otherwise', async () => {
    renderBoard('/practices/p1/decks/d1', {
      deck: HttpResponse.json({ detail: 'boom' }, { status: 500 }),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this deck.');
    expect(screen.queryByTestId('form-bar')).not.toBeInTheDocument();
  });
});
