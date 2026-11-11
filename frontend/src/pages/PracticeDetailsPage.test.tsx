// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import PracticeDetailsPage from 'src/pages/PracticeDetailsPage';
import { NO_CARDS_MESSAGE } from 'src/lib/runCopy';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';

const BASE = 'http://localhost:8000';

const run = (id: string, status: 'active' | 'completed', day: string, dayIndex: number) => ({
  id,
  practice_id: 'p1',
  status,
  day,
  day_index: dayIndex,
  created_at: '2026-11-03T18:00:00Z',
  last_activity_at: '2026-11-03T18:00:00Z',
});

function detail(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    name: 'Commands + Ports',
    created_at: '2026-11-01T00:00:00Z',
    decks: [
      { deck_id: 'd1', deck_name: 'Commands' },
      { deck_id: 'd2', deck_name: 'Ports' },
    ],
    active_run_id: null,
    runs: [],
    ...overrides,
  };
}

function LocationProbe() {
  return <span data-testid="location">{useLocation().pathname}</span>;
}

function renderPractice(data: Record<string, unknown> | null = detail()) {
  server.use(
    http.get(`${BASE}/api/practices/:id`, () =>
      data
        ? HttpResponse.json(data)
        : HttpResponse.json({ detail: 'Practice not found' }, { status: 404 }),
    ),
  );
  return renderWithProviders(
    <Routes>
      <Route path="/practices/:practiceId" element={<PracticeDetailsPage />} />
      <Route path="*" element={<LocationProbe />} />
    </Routes>,
    ['/practices/p1'],
  );
}

afterEach(() => server.resetHandlers());

describe('PracticeDetailsPage', () => {
  it("shows the practice's name, its decks and All practices above it", async () => {
    renderPractice();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Commands + Ports' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Commands')).toBeInTheDocument();
    expect(screen.getByText('Ports')).toBeInTheDocument();
    const row = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(row).getByRole('link', { name: 'All practices' })).toHaveAttribute(
      'href',
      '/practices',
    );
  });

  it('reads Start run with no active run, and opens the run it starts', async () => {
    let posted: unknown;
    server.use(
      http.post(`${BASE}/api/practices/:id/runs`, ({ params }) => {
        posted = params.id;
        return HttpResponse.json(run('r1', 'active', '2026-11-03', 0));
      }),
    );
    const user = userEvent.setup();
    renderPractice();

    await user.click(await screen.findByRole('button', { name: 'Start run' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/runs/r1'));
    expect(posted).toBe('p1');
  });

  it('reads Continue run while a run is active', async () => {
    renderPractice(detail({ active_run_id: 'r1', runs: [run('r1', 'active', '2026-11-03', 0)] }));

    expect(await screen.findByRole('button', { name: 'Continue run' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start run' })).not.toBeInTheDocument();
  });

  it('lists each run as its day and its badge, each opening the run', async () => {
    renderPractice(
      detail({
        active_run_id: 'r2',
        runs: [run('r2', 'active', '2026-11-03', 1), run('r1', 'completed', '2026-11-03', 0)],
      }),
    );

    expect(await screen.findByRole('heading', { level: 2, name: 'Runs' })).toBeInTheDocument();
    const links = screen.getAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('/runs/'));
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/runs/r2', '/runs/r1']);
    expect(links[0]).toHaveTextContent('2026-11-03 (1)Active');
    expect(links[1]).toHaveTextContent('2026-11-03Completed');
  });

  it('shows no Runs with none', async () => {
    renderPractice();

    await screen.findByRole('button', { name: 'Start run' });
    expect(screen.queryByRole('heading', { level: 2, name: 'Runs' })).not.toBeInTheDocument();
  });

  it('a refused start reads its sentence beside the button', async () => {
    server.use(
      http.post(`${BASE}/api/practices/:id/runs`, () =>
        HttpResponse.json({ detail: { code: 'no_cards', message: 'x' } }, { status: 400 }),
      ),
    );
    const user = userEvent.setup();
    renderPractice();

    const button = await screen.findByRole('button', { name: 'Start run' });
    await user.click(button);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(NO_CARDS_MESSAGE);
    expect(button.nextElementSibling).toBe(alert);
  });

  it('says Practice not found. for an unknown or foreign practice', async () => {
    renderPractice(null);

    expect(await screen.findByText('Practice not found.')).toBeInTheDocument();
  });
});
