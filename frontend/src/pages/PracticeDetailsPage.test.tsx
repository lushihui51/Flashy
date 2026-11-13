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
  reached_cards: status === 'active' ? 3 : 74,
  counted_cards: 74,
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
    readiness: null,
    runs: [],
    ...overrides,
  };
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
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
  it("shows the practice's mark and name, its circle, and All practices above it", async () => {
    renderPractice(detail({ readiness: 0.46 }));

    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Commands + Ports');
    expect(within(heading).getByRole('img', { name: 'Practice' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Mastery 46%' })).toBeInTheDocument();
    const row = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(row).getByRole('link', { name: 'All practices' })).toHaveAttribute(
      'href',
      '/practices',
    );
  });

  it('shows no circle while its decks hold no card', async () => {
    renderPractice();

    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('img', { name: /^Mastery/ })).not.toBeInTheDocument();
  });

  it('writes each deck on a line of its own, its mark and name', async () => {
    renderPractice();

    const commands = (await screen.findByRole('link', { name: 'Deck Commands' })).closest('li')!;
    const ports = screen.getByRole('link', { name: 'Deck Ports' }).closest('li')!;
    expect(commands.parentElement).toBe(ports.parentElement);
    expect(within(commands).getByRole('img', { name: 'Deck' })).toBeInTheDocument();
    expect(within(ports).getByRole('img', { name: 'Deck' })).toBeInTheDocument();
  });

  it("opens each deck's board from its line, coming back here either way", async () => {
    renderPractice();

    const here = encodeURIComponent('/practices/p1');
    const commands = await screen.findByRole('link', { name: 'Deck Commands' });
    const ports = screen.getByRole('link', { name: 'Deck Ports' });
    expect(commands).toHaveAttribute(
      'href',
      `/practices/p1/decks/d1?cancelTo=${here}&returnTo=${here}`,
    );
    expect(ports).toHaveAttribute(
      'href',
      `/practices/p1/decks/d2?cancelTo=${here}&returnTo=${here}`,
    );
  });

  it('opens Edit practice from the pencil, coming back here either way', async () => {
    const user = userEvent.setup();
    renderPractice();

    await user.click(await screen.findByRole('button', { name: 'Edit Commands + Ports' }));

    const here = encodeURIComponent('/practices/p1');
    expect(screen.getByTestId('location')).toHaveTextContent(
      `/practices/p1/edit?cancelTo=${here}&returnTo=${here}`,
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

  it('lists each run as its mark and day, its badge and its count, each opening the run', async () => {
    renderPractice(
      detail({
        active_run_id: 'r2',
        runs: [run('r2', 'active', '2026-11-03', 1), run('r1', 'completed', '2026-11-03', 0)],
      }),
    );

    expect(await screen.findByRole('heading', { level: 2, name: 'Runs' })).toBeInTheDocument();
    const links = screen.getAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('/runs/'));
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/runs/r2', '/runs/r1']);
    expect(links[0]).toHaveTextContent('2026-11-03 (1)Active3 of 74 cards');
    expect(links[1]).toHaveTextContent('2026-11-03Completed74 of 74 cards');
    for (const link of links) {
      expect(within(link).getByRole('img', { name: 'Run' })).toBeInTheDocument();
    }
  });

  it('says No runs yet. under Runs with none', async () => {
    renderPractice();

    const runs = await screen.findByRole('heading', { level: 2, name: 'Runs' });
    expect(runs.nextElementSibling).toHaveTextContent('No runs yet.');
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
    expect(button.parentElement!.nextElementSibling).toBe(alert);
  });

  it('says Practice not found. for an unknown or foreign practice', async () => {
    renderPractice(null);

    expect(await screen.findByText('Practice not found.')).toBeInTheDocument();
  });
});
