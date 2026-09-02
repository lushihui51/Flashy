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

function breakdown(overrides: Record<string, unknown> = {}) {
  return {
    total_cards: 1,
    passed_first_try: 1,
    passed_after_one_fail: 0,
    passed_after_many_fails: 0,
    still_failed: 0,
    cards: [
      {
        card_id: 'card1',
        bucket: 'passed_first_try',
        attempt_count: 1,
        primary_field: { field_def_id: 'front', name: 'Front', type: 'text', value: 'Bonjour' },
        attempts: [
          {
            practice_card_id: 'pc1',
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
    ...overrides,
  };
}

function mockBreakdown(data: Record<string, unknown> = breakdown()) {
  server.use(
    http.get(`${BASE}/api/practice_sessions/:id/breakdown`, () => HttpResponse.json(data)),
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

  it('a completed session hides Start practice and shows its breakdown instead', async () => {
    mockSession(session({ status: 'completed' }));
    mockBreakdown();
    renderDetails();

    await screen.findByRole('heading', { name: 'Alpha run' });
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start practice' })).not.toBeInTheDocument();
    expect(
      screen.queryByText('A summary of this practice is coming later.'),
    ).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Front: Bonjour' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'First try (1)' })).toBeInTheDocument();
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

describe('PracticeDetailsPage re-run (T9)', () => {
  it('hides the Re-run button on an active session', async () => {
    mockSession(session({ status: 'active' }));
    renderDetails();

    await screen.findByRole('heading', { name: 'Alpha run' });
    expect(screen.queryByRole('button', { name: 'Re-run Alpha run' })).not.toBeInTheDocument();
  });

  it('shows the Re-run button on a completed session', async () => {
    mockSession(session({ status: 'completed' }));
    mockBreakdown();
    renderDetails();

    expect(await screen.findByRole('button', { name: 'Re-run Alpha run' })).toBeInTheDocument();
  });

  it('confirming re-run posts to the old session and navigates to the new one', async () => {
    let rerunRequestedId: string | null = null;
    mockSession(session({ status: 'completed' }));
    mockBreakdown();
    server.use(
      http.post(`${BASE}/api/practice_sessions/:id/rerun`, ({ params }) => {
        rerunRequestedId = params.id as string;
        return HttpResponse.json(
          {
            id: 'ps2',
            user_id: 'u1',
            name: 'Alpha run',
            status: 'active',
            created_at: '2026-08-28T00:00:00Z',
          },
          { status: 201 },
        );
      }),
      http.get(`${BASE}/api/practice_sessions/ps2`, () =>
        HttpResponse.json(session({ id: 'ps2', name: 'Alpha run (new)', status: 'active' })),
      ),
    );
    const user = userEvent.setup();
    renderDetails();

    await user.click(await screen.findByRole('button', { name: 'Re-run Alpha run' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Re-run this practice?');
    await user.click(within(dialog).getByRole('button', { name: 'Re-run' }));

    await waitFor(() => expect(rerunRequestedId).toBe('ps1'));
    // Navigated to the new session's own detail route — its distinct name proves it.
    expect(await screen.findByRole('heading', { name: 'Alpha run (new)' })).toBeInTheDocument();
  });

  it('cancelling the re-run confirm leaves the session alone', async () => {
    let rerunCalls = 0;
    mockSession(session({ status: 'completed' }));
    mockBreakdown();
    server.use(
      http.post(`${BASE}/api/practice_sessions/:id/rerun`, () => {
        rerunCalls += 1;
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderDetails();

    await user.click(await screen.findByRole('button', { name: 'Re-run Alpha run' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(rerunCalls).toBe(0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Alpha run' })).toBeInTheDocument();
  });

  it('a nothing_to_rerun failure closes the dialog, shows the message, and leaves the old session on screen', async () => {
    mockSession(session({ status: 'completed' }));
    mockBreakdown();
    server.use(
      http.post(`${BASE}/api/practice_sessions/:id/rerun`, () =>
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
    const user = userEvent.setup();
    renderDetails();

    await user.click(await screen.findByRole('button', { name: 'Re-run Alpha run' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Re-run' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'no deck from this session still has a live, valid snapshot to rerun',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Still on ps1 — nothing navigated away, the old session is unchanged.
    expect(screen.getByRole('heading', { name: 'Alpha run' })).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });
});
