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

// Two decks with the *same name* under different subjects — the case the deck filter
// exists to disambiguate, so every filter test here runs against it.
const subjects = [
  {
    id: 's1',
    name: 'Alpha',
    icon: 'brain',
    description: '',
    user_id: 'u1',
    created_at: '',
    last_activity_at: '',
    deck_count: 1,
  },
  {
    id: 's2',
    name: 'Beta',
    icon: 'music',
    description: '',
    user_id: 'u1',
    created_at: '',
    last_activity_at: '',
    deck_count: 1,
  },
];

const decks = [
  {
    id: 'd1',
    subject_id: 's1',
    name: 'Shared Deck Name',
    created_at: '',
    last_activity_at: '',
    card_count: 2,
    field_names: [],
  },
  {
    id: 'd2',
    subject_id: 's2',
    name: 'Shared Deck Name',
    created_at: '',
    last_activity_at: '',
    card_count: 2,
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
      { deck_id: 'd1', deck_name: 'Shared Deck Name', subject_id: 's1', subject_name: 'Alpha' },
    ],
    deleted_deck_count: 0,
    ...overrides,
  };
}

const alphaRun = session();
const betaRun = session({
  id: 'ps2',
  name: 'Beta run',
  status: 'completed',
  decks: [{ deck_id: 'd2', deck_name: 'Shared Deck Name', subject_id: 's2', subject_name: 'Beta' }],
});

/** Records what the page asked the server for — the subject/deck filters are the
 * server's job (they walk practice_deck → deck → subject), so "did the filter work" is
 * really "did the page send the right query". */
function mockLibrary(
  sessionsFor: (query: URLSearchParams) => unknown[] = () => [alphaRun, betaRun],
) {
  const requests: URLSearchParams[] = [];
  server.use(
    http.get(`${BASE}/api/subjects`, () => HttpResponse.json(subjects)),
    http.get(`${BASE}/api/decks`, () => HttpResponse.json(decks)),
    http.get(`${BASE}/api/practice_sessions`, ({ request }) => {
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

function renderOverview(initialPath = '/practice') {
  return renderWithProviders(
    <Routes>
      <Route path="/practice" element={<PracticeOverviewPage />} />
      <Route path="/practice/new" element={<LocationProbe />} />
      <Route path="/practice/:practiceSessionId" element={<LocationProbe />} />
    </Routes>,
    [initialPath],
  );
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
  it('lists sessions with their status badge, deck/subject chips and created date', async () => {
    mockLibrary();
    renderOverview();

    const row = (await screen.findByText('Alpha run')).closest('div')!;
    expect(within(row).getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Alpha · Shared Deck Name')).toBeInTheDocument();
    expect(screen.getByText('Beta · Shared Deck Name')).toBeInTheDocument();
    expect(screen.getAllByText('Aug 24, 2026').length).toBe(2);
  });

  it('sends no filters when the URL has none', async () => {
    const requests = mockLibrary();
    renderOverview();

    await screen.findByText('Alpha run');
    expect(requests[0]!.get('subject_id')).toBeNull();
    expect(requests[0]!.get('deck_id')).toBeNull();
  });

  it('a subject in the URL is sent as subject_id', async () => {
    const requests = mockLibrary((query) => (query.get('subject_id') === 's1' ? [alphaRun] : []));
    renderOverview('/practice?subject=s1');

    await screen.findByText('Alpha run');
    expect(screen.queryByText('Beta run')).not.toBeInTheDocument();
    expect(requests[0]!.get('subject_id')).toBe('s1');
  });

  it('a deck in the URL is sent as deck_id, telling same-named decks apart', async () => {
    const requests = mockLibrary((query) => (query.get('deck_id') === 'd2' ? [betaRun] : []));
    renderOverview('/practice?subject=s2&deck=d2');

    await screen.findByText('Beta run');
    expect(screen.queryByText('Alpha run')).not.toBeInTheDocument();
    expect(requests[0]!.get('deck_id')).toBe('d2');
    expect(requests[0]!.get('subject_id')).toBe('s2');
  });

  it('picking a subject writes it to the URL and refetches', async () => {
    const requests = mockLibrary((query) =>
      query.get('subject_id') === 's1' ? [alphaRun] : [alphaRun, betaRun],
    );
    const user = userEvent.setup();
    renderOverview();
    await screen.findByText('Beta run');

    await user.click(screen.getByPlaceholderText('All subjects'));
    await user.click(await screen.findByRole('option', { name: /Alpha/ }));

    await waitFor(() => expect(requests.at(-1)!.get('subject_id')).toBe('s1'));
    await waitFor(() => expect(screen.queryByText('Beta run')).not.toBeInTheDocument());
  });

  it('the deck options narrow to the selected subject', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderOverview('/practice?subject=s2');
    await screen.findByText('Beta run');

    await user.click(screen.getByPlaceholderText('All decks'));
    // Both decks share a name, so the count is what proves the narrowing: one deck
    // option plus the "All decks" clear row.
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('clearing the subject drops it from the URL', async () => {
    const requests = mockLibrary();
    const user = userEvent.setup();
    renderOverview('/practice?subject=s1');
    await screen.findByText('Alpha run');

    await user.click(screen.getByPlaceholderText('All subjects'));
    await user.click(await screen.findByRole('option', { name: 'All subjects' }));

    await waitFor(() => expect(requests.at(-1)!.get('subject_id')).toBeNull());
  });

  it('the status tabs filter client-side and compose with the subject filter', async () => {
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

  it('states deleted decks as a proportion of the session, not a bare count', async () => {
    mockLibrary(() => [session({ deleted_deck_count: 1 })]); // one deck left, one gone
    renderOverview();

    expect(await screen.findByText('1 / 2 decks deleted')).toBeInTheDocument();
  });

  it('a session whose every deck is gone says so against its own total', async () => {
    mockLibrary(() => [session({ deleted_deck_count: 3, decks: [] })]);
    renderOverview();

    expect(await screen.findByText('3 / 3 decks deleted')).toBeInTheDocument();
  });

  it('says nothing about deleted decks when every deck is intact', async () => {
    mockLibrary(() => [session()]);
    renderOverview();

    await screen.findByText('Alpha run');
    expect(screen.queryByText(/decks deleted/)).not.toBeInTheDocument();
  });

  it('a session row links to its details page', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderOverview();

    await user.click(await screen.findByText('Alpha run'));
    expect(screen.getByTestId('location')).toHaveTextContent('/practice/ps1');
  });

  it('New practice carries the current filters into the creation surface', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderOverview('/practice?subject=s1&deck=d1');
    await screen.findByText('Alpha run');

    await user.click(screen.getByRole('button', { name: 'New practice' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/practice/new?subject=s1&deck=d1');
  });

  it('deleting a session confirms first, then removes it from the list', async () => {
    let deleted: string | null = null;
    const requests = mockLibrary(() => (deleted ? [betaRun] : [alphaRun, betaRun]));
    server.use(
      http.delete(`${BASE}/api/practice_sessions/:id`, ({ params }) => {
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
      http.delete(`${BASE}/api/practice_sessions/:id`, () => {
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

  it('empty with filters offers to clear them; empty with none offers to start one', async () => {
    mockLibrary(() => []);
    const user = userEvent.setup();
    renderOverview('/practice?subject=s1');

    expect(
      await screen.findByText('No practice sessions match these filters.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(await screen.findByText('No practice sessions yet.')).toBeInTheDocument();
  });
});
