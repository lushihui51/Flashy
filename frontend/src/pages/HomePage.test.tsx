// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import HomePage from 'src/pages/HomePage';
import type { components } from 'src/api/types';

type HomeRead = components['schemas']['HomeRead'];
type HomeRun = components['schemas']['HomeRun'];

const BASE = 'http://localhost:8000';
const MAIN_ACTION_CLASS = 'bg-(--color-main-action)';

const homeRun = (id: string, practiceName: string, status: HomeRun['status']): HomeRun => ({
  id,
  practice_id: `practice-of-${id}`,
  practice_name: practiceName,
  status,
  day: '2026-11-01',
  day_index: 0,
  created_at: '2026-11-01T00:00:00Z',
  last_activity_at: '2026-11-01T00:00:00Z',
  reached_cards: 1,
  counted_cards: 4,
  decks: [{ deck_id: `deck-of-${id}`, deck_name: `Deck of ${practiceName}` }],
  progress:
    status === 'active'
      ? { total_cards: 4, passed: 1, still_failed: 0, retry_pending: 0, unseen: 3 }
      : null,
});
const activeRun = (id: string, practiceName: string) => homeRun(id, practiceName, 'active');
const completedRun = (id: string, practiceName: string) => homeRun(id, practiceName, 'completed');

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

function renderHome(home: Partial<HomeRead>) {
  server.use(
    http.get(`${BASE}/api/home`, () =>
      HttpResponse.json({ steps: null, active_runs: [], recent_runs: [], ...home }),
    ),
  );
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="*" element={<LocationProbe />} />
    </Routes>,
  );
}

describe('HomePage', () => {
  it('titles the browser tab and heads the page', async () => {
    renderHome({});
    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();
    expect(document.title).toBe('Home · Flashy');
  });

  describe('the steps', () => {
    const steps = (hasDeck: boolean, hasCard: boolean) => ({
      has_deck: hasDeck,
      has_card: hasCard,
    });

    it('a user with nothing made reads "0 of 3" over New deck, New card and New practice', async () => {
      renderHome({ steps: steps(false, false) });

      const list = await screen.findByRole('list', { name: 'Your first practice' });
      expect(
        screen.getByRole('heading', { level: 2, name: 'Your first practice' }),
      ).toBeInTheDocument();
      expect(screen.getByText('0 of 3')).toBeInTheDocument();
      expect(
        within(list)
          .getAllByRole('listitem')
          .map((item) => item.textContent),
      ).toEqual(['1New deck', '2New card', '3New practice']);
    });

    it('counts the one done, strikes it and makes the next the one main action', async () => {
      renderHome({ steps: steps(true, false) });

      const list = await screen.findByRole('list', { name: 'Your first practice' });
      expect(screen.getByText('1 of 3')).toBeInTheDocument();
      expect(within(list).getAllByRole('listitem')).toHaveLength(3);

      expect(within(list).getByText('New deck')).toHaveClass('line-through');

      // The next step is the only link, so nothing else on the list can be followed or yellow.
      const link = within(list).getByRole('link');
      expect(link).toHaveTextContent('New card');
      expect(link).toHaveAttribute('href', '/cards/new?cancelTo=%2F');
      expect(link).toHaveClass(MAIN_ACTION_CLASS);

      expect(within(list).getByText('New practice')).not.toHaveClass('line-through');
      expect(screen.getAllByRole('link')).toHaveLength(1);
    });

    it.each([
      { done: 0, label: 'New deck', href: '/decks/new' },
      { done: 1, label: 'New card', href: '/cards/new' },
      { done: 2, label: 'New practice', href: '/practices/new' },
    ])(
      'with $done done links $label to $href, Cancel returning to Home',
      async ({ done, label, href }) => {
        renderHome({ steps: steps(done >= 1, done >= 2) });

        const link = await screen.findByRole('link', { name: label });
        expect(link).toHaveAttribute('href', `${href}?cancelTo=%2F`);
        expect(screen.getByText(`${done} of 3`)).toBeInTheDocument();
      },
    );
  });

  describe('once a practice has been made', () => {
    it('lists the active runs under "Active" and the completed ones under "Recently completed", each a row', async () => {
      renderHome({
        active_runs: [activeRun('r1', 'First'), activeRun('r2', 'Second')],
        recent_runs: [completedRun('r3', 'Third')],
      });

      const active = await screen.findByRole('list', { name: 'Active' });
      expect(screen.getByRole('heading', { level: 2, name: 'Active' })).toBeInTheDocument();
      expect(
        within(active)
          .getAllByRole('button')
          .map((button) => button.getAttribute('aria-label')),
      ).toEqual(['Practice First', 'Practice Second']);
      expect(
        within(active).getAllByRole('img', { name: '1 passed, 0 failed, 0 retrying, 3 unseen' }),
      ).toHaveLength(2);

      const recent = screen.getByRole('list', { name: 'Recently completed' });
      expect(
        screen.getByRole('heading', { level: 2, name: 'Recently completed' }),
      ).toBeInTheDocument();
      expect(within(recent).getByText('Third')).toBeInTheDocument();
      expect(within(recent).getByText('Deck of Third')).toBeInTheDocument();
      expect(within(recent).queryByRole('img', { name: /passed/ })).not.toBeInTheDocument();
      expect(screen.queryByText('Your first practice')).not.toBeInTheDocument();
    });

    it('leaves out a section with no run', async () => {
      renderHome({ recent_runs: [completedRun('r3', 'Third')] });

      await screen.findByRole('list', { name: 'Recently completed' });
      expect(screen.queryByRole('heading', { name: 'Active' })).not.toBeInTheDocument();
    });

    it("draws the first active run's play button yellow and every other white", async () => {
      renderHome({
        active_runs: [activeRun('r1', 'First'), activeRun('r2', 'Second')],
        recent_runs: [completedRun('r3', 'Third')],
      });

      expect(await screen.findByRole('button', { name: 'Practice First' })).toHaveClass(
        MAIN_ACTION_CLASS,
      );
      expect(screen.getByRole('button', { name: 'Practice Second' })).not.toHaveClass(
        MAIN_ACTION_CLASS,
      );
      expect(screen.getByRole('button', { name: 'Practice Third' })).not.toHaveClass(
        MAIN_ACTION_CLASS,
      );
    });

    it("draws the first completed run's play button yellow when no run is active", async () => {
      renderHome({ recent_runs: [completedRun('r3', 'Third'), completedRun('r4', 'Fourth')] });

      expect(await screen.findByRole('button', { name: 'Practice Third' })).toHaveClass(
        MAIN_ACTION_CLASS,
      );
      expect(screen.getByRole('button', { name: 'Practice Fourth' })).not.toHaveClass(
        MAIN_ACTION_CLASS,
      );
    });

    it("opens an active run's page from its play button, asking the server nothing", async () => {
      let started = false;
      server.use(
        http.post(`${BASE}/api/practices/:practiceId/runs`, () => {
          started = true;
          return HttpResponse.json({});
        }),
      );
      renderHome({ active_runs: [activeRun('r1', 'First'), activeRun('r2', 'Second')] });

      await userEvent.click(await screen.findByRole('button', { name: 'Practice Second' }));

      expect(screen.getByTestId('location')).toHaveTextContent('/runs/r2');
      expect(started).toBe(false);
    });

    it("starts a completed run's practice again from its play button and opens the new run", async () => {
      let startedPractice: unknown = null;
      server.use(
        http.post(`${BASE}/api/practices/:practiceId/runs`, ({ params }) => {
          startedPractice = params.practiceId;
          return HttpResponse.json({ id: 'new-run' });
        }),
      );
      renderHome({ recent_runs: [completedRun('r3', 'Third')] });

      await userEvent.click(await screen.findByRole('button', { name: 'Practice Third' }));

      await waitFor(() =>
        expect(screen.getByTestId('location')).toHaveTextContent('/runs/new-run'),
      );
      expect(startedPractice).toBe('practice-of-r3');
    });

    it.each([
      {
        response: () =>
          HttpResponse.json({ detail: { code: 'no_cards', message: 'x' } }, { status: 400 }),
        sentence:
          "This run would have no cards. Either the practice's decks have no cards, or every card is blank in every field one side shows.",
      },
      {
        response: () => HttpResponse.json({ detail: 'Practice not found' }, { status: 404 }),
        sentence: 'Practice not found.',
      },
    ])('shows a refused start beneath its row alone: $sentence', async ({ response, sentence }) => {
      server.use(http.post(`${BASE}/api/practices/:practiceId/runs`, response));
      renderHome({ recent_runs: [completedRun('r3', 'Third'), completedRun('r4', 'Fourth')] });

      await userEvent.click(await screen.findByRole('button', { name: 'Practice Fourth' }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(sentence);
      const [, fourth] = within(
        screen.getByRole('list', { name: 'Recently completed' }),
      ).getAllByRole('listitem');
      expect(fourth).toContainElement(alert);
      expect(screen.queryByTestId('location')).not.toBeInTheDocument();
    });

    it('ends with "All practices" in the bar at the foot, opening All practices, and no New practice', async () => {
      renderHome({ active_runs: [activeRun('r1', 'First')] });

      const bar = await screen.findByTestId('form-bar');
      const link = within(bar).getByRole('link', { name: 'All practices' });
      expect(link).toHaveAttribute('href', '/practices');
      expect(link).not.toHaveClass(MAIN_ACTION_CLASS);
      expect(screen.queryByText('New practice')).not.toBeInTheDocument();
    });

    it('holds the bar with no run at all', async () => {
      renderHome({});

      expect(await screen.findByRole('link', { name: 'All practices' })).toBeInTheDocument();
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('says nothing of when anything happened or that anything is waiting', async () => {
      const { container } = renderHome({
        active_runs: [activeRun('r1', 'First')],
        recent_runs: [completedRun('r3', 'Third')],
      });

      await screen.findByRole('link', { name: 'All practices' });
      expect(container.textContent).not.toMatch(/\bago\b|\bdue\b|coming soon/i);
    });
  });

  it('holds no bar while the steps show', async () => {
    renderHome({ steps: { has_deck: false, has_card: false } });

    await screen.findByRole('list', { name: 'Your first practice' });
    expect(screen.queryByTestId('form-bar')).not.toBeInTheDocument();
  });

  it('shows the failure sentence when the read fails', async () => {
    server.use(http.get(`${BASE}/api/home`, () => HttpResponse.json({}, { status: 500 })));
    renderWithProviders(<HomePage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load Home.');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
