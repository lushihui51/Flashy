// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import PracticeDetailsPage from 'src/pages/PracticeDetailsPage';

const BASE = 'http://localhost:8000';

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

function mockSession(data: Record<string, unknown> | null = session()) {
  server.use(
    http.get(`${BASE}/api/practice_sessions/:id`, () =>
      data ? HttpResponse.json(data) : HttpResponse.json({ detail: 'not found' }, { status: 404 }),
    ),
  );
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderDetails(id = 'ps1') {
  return renderWithProviders(
    <Routes>
      <Route path="/practice/:practiceSessionId" element={<PracticeDetailsPage />} />
      <Route path="/practice/:practiceSessionId/run" element={<LocationProbe />} />
      <Route path="/practice" element={<LocationProbe />} />
    </Routes>,
    [`/practice/${id}`],
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

describe('PracticeDetailsPage', () => {
  it('shows a breadcrumb to Practice, and it navigates there', async () => {
    mockSession();
    const user = userEvent.setup();
    renderDetails();

    const crumb = await screen.findByRole('link', { name: 'Practice' });
    await user.click(crumb);

    expect(screen.getByTestId('location')).toHaveTextContent('/practice');
  });

  it('renders the name, status, created date and deck chips', async () => {
    mockSession();
    renderDetails();

    expect(await screen.findByRole('heading', { name: 'Alpha run' })).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    // Date only, not the clock time — formatDateTime renders in whatever zone the
    // machine running this test happens to sit in (ADR 019), so a fixed instant can
    // land on a different hour, though never a different calendar day for this one.
    expect(screen.getByText(/Aug 24, 2026/)).toBeInTheDocument();
    expect(screen.getByText('Alpha · Shared Deck Name')).toBeInTheDocument();
  });

  it('an active session shows Start practice, and it navigates to the run stub', async () => {
    mockSession(session({ status: 'active' }));
    const user = userEvent.setup();
    renderDetails();

    const start = await screen.findByRole('button', { name: 'Start practice' });
    await user.click(start);

    expect(screen.getByTestId('location')).toHaveTextContent('/practice/ps1/run');
  });

  it('a completed session hides Start practice and shows the summary line instead', async () => {
    mockSession(session({ status: 'completed' }));
    renderDetails();

    await screen.findByRole('heading', { name: 'Alpha run' });
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start practice' })).not.toBeInTheDocument();
    expect(screen.getByText('A summary of this practice is coming later.')).toBeInTheDocument();
  });

  it('states deleted decks as a proportion of the session, not a bare count', async () => {
    mockSession(session({ deleted_deck_count: 1 })); // one deck left, one gone
    renderDetails();

    expect(await screen.findByText('1 / 2 decks deleted')).toBeInTheDocument();
  });

  it('says nothing about deleted decks when every deck is intact', async () => {
    mockSession(session());
    renderDetails();

    await screen.findByRole('heading', { name: 'Alpha run' });
    expect(screen.queryByText(/decks deleted/)).not.toBeInTheDocument();
  });

  it('deleting confirms first, calls the API, and navigates to the practice list', async () => {
    let deletedId: string | null = null;
    mockSession();
    server.use(
      http.delete(`${BASE}/api/practice_sessions/:id`, ({ params }) => {
        deletedId = params.id as string;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderDetails();

    await user.click(await screen.findByRole('button', { name: 'Delete Alpha run' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(deletedId).toBe('ps1'));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/practice'));
  });

  it('cancelling the delete confirm leaves the session alone', async () => {
    let deleteCalls = 0;
    mockSession();
    server.use(
      http.delete(`${BASE}/api/practice_sessions/:id`, () => {
        deleteCalls += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderDetails();

    await user.click(await screen.findByRole('button', { name: 'Delete Alpha run' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(deleteCalls).toBe(0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Alpha run' })).toBeInTheDocument();
  });

  it('a failed delete shows the error inside the dialog, which stays open', async () => {
    mockSession();
    server.use(
      http.delete(`${BASE}/api/practice_sessions/:id`, () =>
        HttpResponse.json({ detail: 'Something went wrong' }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    renderDetails();

    await user.click(await screen.findByRole('button', { name: 'Delete Alpha run' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Something went wrong');
    // Still open — nothing navigated away.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
  });

  it('a missing or foreign session renders "not found" instead of crashing, with no breadcrumb', async () => {
    mockSession(null);
    renderDetails('nope');

    expect(await screen.findByText('Practice session not found.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Practice' })).not.toBeInTheDocument();
  });
});
