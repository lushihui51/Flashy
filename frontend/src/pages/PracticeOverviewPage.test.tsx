// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import PracticeOverviewPage from 'src/pages/PracticeOverviewPage';

const BASE = 'http://localhost:8000';

const decks = [
  {
    id: 'd1',
    subject_id: 's1',
    subject_name: 'Alpha',
    name: 'Commands',
    created_at: '',
    last_activity_at: '',
    card_count: 2,
    readiness: 0.5,
    field_names: [],
  },
  {
    id: 'd2',
    subject_id: 's2',
    subject_name: 'Beta',
    name: 'Ports',
    created_at: '',
    last_activity_at: '',
    card_count: 2,
    readiness: 0.5,
    field_names: [],
  },
];

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ps1',
    user_id: 'u1',
    name: 'Alpha run',
    status: 'active',
    created_at: '2026-08-24T12:00:00Z',
    decks: [
      {
        deck_id: 'd1',
        deck_name: 'Commands',
        subject_id: 's1',
        subject_name: 'Alpha',
        configuration_name: 'Config A',
      },
    ],
    ...overrides,
  };
}

const alphaRun = session();
const betaRun = session({
  id: 'ps2',
  name: 'Beta run',
  status: 'completed',
  decks: [
    {
      deck_id: 'd2',
      deck_name: 'Ports',
      subject_id: 's2',
      subject_name: 'Beta',
      configuration_name: 'Config B',
    },
  ],
});

/** Records what the page asked the server for — the deck filter is the server's job (it
 * walks practice_deck → deck), so "did the filter work" is really "did the page send the
 * right query". */
function mockLibrary(
  sessionsFor: (query: URLSearchParams) => unknown[] = () => [alphaRun, betaRun],
) {
  const requests: URLSearchParams[] = [];
  server.use(
    http.get(`${BASE}/api/decks`, () => HttpResponse.json(decks)),
    http.get(`${BASE}/api/practice_runs`, ({ request }) => {
      const query = new URL(request.url).searchParams;
      requests.push(query);
      return HttpResponse.json(sessionsFor(query));
    }),
  );
  return requests;
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

/** Rendered outside `<Routes>`, so it reports the page's own URL writes. */
function CurrentLocationProbe() {
  const location = useLocation();
  return <span data-testid="current-location">{location.search}</span>;
}

function renderOverview(initialPath = '/practice') {
  return renderWithProviders(
    <>
      <CurrentLocationProbe />
      <Routes>
        <Route path="/practice" element={<PracticeOverviewPage />} />
        <Route path="/practice/new" element={<LocationProbe />} />
        <Route path="/practice/:practiceSessionId" element={<LocationProbe />} />
      </Routes>
    </>,
    [initialPath],
  );
}

/** Serves Beta run unfiltered, and holds any filtered answer until `release` is called,
 * so a test can look at the page between the filter's write and the new list. */
function holdFilteredSessions(respond: () => Response) {
  mockLibrary();
  let release = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const filteredRequests: URLSearchParams[] = [];
  server.use(
    http.get(`${BASE}/api/practice_runs`, async ({ request }) => {
      const query = new URL(request.url).searchParams;
      if (query.get('deck_id') === null) return HttpResponse.json([betaRun]);
      filteredRequests.push(query);
      await released;
      return respond();
    }),
  );
  return { filteredRequests, release };
}

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  consoleError.mockRestore();
  server.resetHandlers();
});

describe('PracticeOverviewPage', () => {
  it('lists sessions with their status badge, deck · configuration entries and no date', async () => {
    mockLibrary();
    renderOverview();

    const row = (await screen.findByText('Alpha run')).closest('div')!;
    expect(within(row).getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Commands · Config A')).toBeInTheDocument();
    expect(screen.getByText('Ports · Config B')).toBeInTheDocument();
    expect(screen.queryByText('Aug 24, 2026')).not.toBeInTheDocument();
  });

  it('a practice over three decks shows two entries and +1', async () => {
    const threeDecks = session({
      decks: [
        ...alphaRun.decks,
        ...betaRun.decks,
        {
          deck_id: 'd3',
          deck_name: 'Third Deck',
          subject_id: 's2',
          subject_name: 'Beta',
          configuration_name: 'Config C',
        },
      ],
    });
    mockLibrary(() => [threeDecks]);
    renderOverview();

    const row = (await screen.findByText('Alpha run')).closest('div')!;
    expect(within(row).getByText('Commands · Config A')).toBeInTheDocument();
    expect(within(row).getByText('Ports · Config B')).toBeInTheDocument();
    expect(within(row).getByText('+1')).toBeInTheDocument();
    expect(within(row).queryByText(/Third Deck/)).not.toBeInTheDocument();
  });

  it('a deck whose snapshot has no configuration name shows the deck alone', async () => {
    const unnamed = session({
      decks: [{ ...alphaRun.decks[0], configuration_name: null }],
    });
    mockLibrary(() => [unnamed]);
    renderOverview();

    const row = (await screen.findByText('Alpha run')).closest('div')!;
    expect(within(row).getByText('Commands')).toBeInTheDocument();
  });

  it('sends no filters when the URL has none', async () => {
    const requests = mockLibrary();
    renderOverview();

    await screen.findByText('Alpha run');
    expect(requests[0]!.get('subject_id')).toBeNull();
    expect(requests[0]!.get('deck_id')).toBeNull();
  });

  it('a deck in the URL is sent as deck_id alone', async () => {
    const requests = mockLibrary((query) => (query.get('deck_id') === 'd2' ? [betaRun] : []));
    renderOverview('/practice?deck=d2');

    await screen.findByText('Beta run');
    expect(screen.queryByText('Alpha run')).not.toBeInTheDocument();
    expect(requests[0]!.get('deck_id')).toBe('d2');
    expect(requests[0]!.get('subject_id')).toBeNull();
  });

  it('a subject in the URL narrows nothing', async () => {
    const requests = mockLibrary();
    renderOverview('/practice?subject=s1');

    await screen.findByText('Alpha run');
    expect(screen.getByText('Beta run')).toBeInTheDocument();
    expect(requests[0]!.get('subject_id')).toBeNull();
    expect(screen.queryByText('No practices match these filters.')).not.toBeInTheDocument();
  });

  it('holds the deck filter alone', async () => {
    mockLibrary();
    renderOverview();
    await screen.findByText('Alpha run');

    const filters = screen.getByTestId('practice-filters');
    expect(within(filters).getAllByRole('combobox')).toHaveLength(1);
    expect(screen.getByPlaceholderText('All decks')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('All subjects')).not.toBeInTheDocument();
  });

  it('picking a deck writes it to the URL and refetches', async () => {
    const requests = mockLibrary((query) =>
      query.get('deck_id') === 'd1' ? [alphaRun] : [alphaRun, betaRun],
    );
    const user = userEvent.setup();
    renderOverview();
    await screen.findByText('Beta run');

    await user.click(screen.getByPlaceholderText('All decks'));
    await user.click(await screen.findByRole('option', { name: 'Commands' }));

    await waitFor(() => expect(requests.at(-1)!.get('deck_id')).toBe('d1'));
    expect(screen.getByTestId('current-location')).toHaveTextContent(/^\?deck=d1$/);
    await waitFor(() => expect(screen.queryByText('Beta run')).not.toBeInTheDocument());
  });

  it("each deck's row in the deck filter reads its name alone", async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderOverview('/practice');
    await screen.findByText('Beta run');

    await user.click(screen.getByPlaceholderText('All decks'));
    const rows = screen.getAllByRole('option');
    // The first row is "All decks".
    expect(rows.map((row) => row.textContent)).toEqual(['All decks', 'Commands', 'Ports']);
  });

  it('clearing the deck drops it from the URL', async () => {
    const requests = mockLibrary();
    const user = userEvent.setup();
    renderOverview('/practice?deck=d1');
    await screen.findByText('Alpha run');

    await user.click(screen.getByPlaceholderText('All decks'));
    await user.click(await screen.findByRole('option', { name: 'All decks' }));

    await waitFor(() => expect(requests.at(-1)!.get('deck_id')).toBeNull());
    expect(screen.getByTestId('current-location')).toBeEmptyDOMElement();
  });

  it('the status tabs filter client-side', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderOverview();
    await screen.findByText('Alpha run');

    await user.click(screen.getByRole('tab', { name: 'Completed' }));
    expect(screen.queryByText('Alpha run')).not.toBeInTheDocument();
    expect(screen.getByText('Beta run')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Active' }));
    expect(screen.getByText('Alpha run')).toBeInTheDocument();
    expect(screen.queryByText('Beta run')).not.toBeInTheDocument();
  });

  it('a session row links to its details page', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderOverview();

    await user.click(await screen.findByText('Alpha run'));
    expect(screen.getByTestId('location')).toHaveTextContent('/practice/ps1');
  });

  it('Add practice carries the current filters into the creation surface', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderOverview('/practice?deck=d1');
    await screen.findByText('Alpha run');

    await user.click(screen.getByRole('button', { name: 'Add practice' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/practice/new?deck=d1');
  });

  it('deleting a session confirms first, then removes it from the list', async () => {
    let deleted: string | null = null;
    const requests = mockLibrary(() => (deleted ? [betaRun] : [alphaRun, betaRun]));
    server.use(
      http.delete(`${BASE}/api/practice_runs/:id`, ({ params }) => {
        deleted = params.id as string;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderOverview();
    await screen.findByText('Alpha run');

    await user.click(screen.getByRole('button', { name: 'Delete Alpha run' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(deleted).toBe('ps1'));
    await waitFor(() => expect(screen.queryByText('Alpha run')).not.toBeInTheDocument());
    expect(screen.getByText('Beta run')).toBeInTheDocument();
    expect(requests.length).toBeGreaterThan(1); // the list refetched after the delete
  });

  it('cancelling the delete confirm leaves the session alone', async () => {
    let deleteCalls = 0;
    mockLibrary();
    server.use(
      http.delete(`${BASE}/api/practice_runs/:id`, () => {
        deleteCalls += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderOverview();
    await screen.findByText('Alpha run');

    await user.click(screen.getByRole('button', { name: 'Delete Alpha run' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(deleteCalls).toBe(0);
    expect(screen.getByText('Alpha run')).toBeInTheDocument();
  });

  it('a delete of a practice already gone says Practice not found. inside the dialog', async () => {
    mockLibrary();
    server.use(
      http.delete(`${BASE}/api/practice_runs/:id`, () =>
        HttpResponse.json({ detail: 'practice_run not found' }, { status: 404 }),
      ),
    );
    const user = userEvent.setup();
    renderOverview();
    await screen.findByText('Alpha run');

    await user.click(screen.getByRole('button', { name: 'Delete Alpha run' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Practice not found.');
  });

  it('empty with filters offers to clear them; empty with none offers to start one', async () => {
    mockLibrary(() => []);
    const user = userEvent.setup();
    renderOverview('/practice?deck=d1');

    expect(await screen.findByText('No practices match these filters.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(await screen.findByText('No practices yet.')).toBeInTheDocument();
  });

  it('a filter whose list is loading keeps the old row until the new list arrives', async () => {
    const newRun = session({ id: 'ps3', name: 'Gamma run' });
    const { filteredRequests, release } = holdFilteredSessions(() =>
      HttpResponse.json([newRun]),
    );
    const user = userEvent.setup();
    renderOverview();
    await screen.findByText('Beta run');

    await user.click(screen.getByPlaceholderText('All decks'));
    await user.click(await screen.findByRole('option', { name: 'Commands' }));

    await waitFor(() => expect(filteredRequests).toHaveLength(1));
    expect(screen.getByTestId('current-location')).toHaveTextContent('?deck=d1');
    expect(screen.getByText('Beta run')).toBeInTheDocument();
    expect(screen.queryByText('Gamma run')).not.toBeInTheDocument();

    release();

    expect(await screen.findByText('Gamma run')).toBeInTheDocument();
    expect(screen.queryByText('Beta run')).not.toBeInTheDocument();
  });

  it('a filter whose list fails removes the old row and says so', async () => {
    const { filteredRequests, release } = holdFilteredSessions(() =>
      HttpResponse.json({ detail: 'boom' }, { status: 500 }),
    );
    const user = userEvent.setup();
    renderOverview();
    await screen.findByText('Beta run');

    await user.click(screen.getByPlaceholderText('All decks'));
    await user.click(await screen.findByRole('option', { name: 'Commands' }));

    await waitFor(() => expect(filteredRequests).toHaveLength(1));
    expect(screen.getByText('Beta run')).toBeInTheDocument();

    release();

    expect(await screen.findByText('Could not load practices.')).toBeInTheDocument();
    expect(screen.queryByText('Beta run')).not.toBeInTheDocument();
  });
});
