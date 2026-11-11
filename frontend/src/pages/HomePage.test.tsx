// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import HomePage from 'src/pages/HomePage';
import type { components } from 'src/api/types';

type HomeRead = components['schemas']['HomeRead'];
type HomeRun = components['schemas']['HomeRun'];
type DeckSummary = components['schemas']['DeckSummary'];

const BASE = 'http://localhost:8000';
const MAIN_ACTION_CLASS = 'bg-(--color-main-action)';

const activeRun = (id: string, practiceName: string): HomeRun => ({
  id,
  practice_id: `practice-of-${id}`,
  practice_name: practiceName,
  status: 'active',
  day: '2026-11-01',
  day_index: 0,
  created_at: '2026-11-01T00:00:00Z',
  last_activity_at: '2026-11-01T00:00:00Z',
  decks: [{ deck_id: `deck-of-${id}`, deck_name: `Deck of ${practiceName}` }],
  progress: { total_cards: 4, passed: 1, still_failed: 0, retry_pending: 0, unseen: 3 },
});

const deck = (id: string, name: string, readiness: number | null): DeckSummary => ({
  id,
  name,
  created_at: '2026-11-01T00:00:00Z',
  last_activity_at: '2026-11-01T00:00:00Z',
  card_count: 21,
  field_names: ['Port', 'Protocol', 'Use', 'Layer'],
  readiness,
});

function renderHome(home: Partial<HomeRead>) {
  server.use(
    http.get(`${BASE}/api/home`, () =>
      HttpResponse.json({ steps: null, active_runs: [], recent_decks: [], ...home }),
    ),
  );
  return renderWithProviders(<HomePage />);
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
      expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
        '1New deck',
        '2New card',
        '3New practice',
      ]);
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
    ])('with $done done links $label to $href, Cancel returning to Home', async ({ done, label, href }) => {
      renderHome({ steps: steps(done >= 1, done >= 2) });

      const link = await screen.findByRole('link', { name: label });
      expect(link).toHaveAttribute('href', `${href}?cancelTo=%2F`);
      expect(screen.getByText(`${done} of 3`)).toBeInTheDocument();
    });
  });

  describe('once a practice has been made', () => {
    it("renders each active run under its practice's name, with its chips and bar, and Start practice on the first", async () => {
      renderHome({
        active_runs: [
          activeRun('r1', 'First practice'),
          activeRun('r2', 'Second practice'),
          activeRun('r3', 'Third practice'),
        ],
      });

      const first = await screen.findByRole('link', { name: /First practice/ });
      expect(first).toHaveAttribute('href', '/practices/practice-of-r1');
      expect(screen.getByRole('link', { name: /Second practice/ })).toHaveAttribute(
        'href',
        '/practices/practice-of-r2',
      );
      expect(screen.getByRole('link', { name: /Third practice/ })).toHaveAttribute(
        'href',
        '/practices/practice-of-r3',
      );
      expect(screen.getAllByText('Active')).toHaveLength(3);
      expect(screen.getByText('Deck of First practice')).toBeInTheDocument();
      // An active row writes its decks with their marks and names its practice with none.
      expect(screen.getAllByRole('img', { name: 'Deck' }).length).toBeGreaterThan(0);
      expect(screen.queryByRole('img', { name: 'Practice' })).not.toBeInTheDocument();
      expect(
        screen.getAllByRole('img', { name: '1 passed, 0 failed, 0 retrying, 3 unseen' }),
      ).toHaveLength(3);

      const starts = screen.getAllByRole('link', { name: 'Start practice' });
      expect(starts).toHaveLength(1);
      expect(starts[0]).toHaveAttribute('href', '/runs/r1');
      expect(starts[0]).toHaveClass(MAIN_ACTION_CLASS);
    });

    it('renders no steps', async () => {
      renderHome({ active_runs: [activeRun('r1', 'First practice')] });

      await screen.findByRole('link', { name: 'Start practice' });
      expect(screen.queryByText('Your first practice')).not.toBeInTheDocument();
    });

    it('renders the recent decks, the first yellow when no run is active', async () => {
      renderHome({ recent_decks: [deck('d1', 'Ports', 0.5), deck('d2', 'Commands', null)] });

      expect(
        await screen.findByRole('heading', { level: 2, name: 'Recently practiced' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Ports/ })).toHaveAttribute('href', '/decks/d1');
      expect(screen.getByRole('link', { name: /Commands/ })).toHaveAttribute('href', '/decks/d2');
      expect(screen.getAllByText('21 cards · 4 fields')).toHaveLength(2);
      expect(screen.queryByText(/Networking/)).not.toBeInTheDocument();
      // The second deck has no readiness, so it has no circle.
      expect(screen.getAllByRole('img', { name: /^Mastery/ })).toHaveLength(1);
      expect(screen.getByRole('img', { name: 'Mastery 50%' })).toBeInTheDocument();

      const practiceLinks = screen.getAllByRole('link', { name: 'Practice' });
      // Each opens All practices narrowed to its deck.
      expect(practiceLinks[0]).toHaveAttribute('href', '/practices?deck=d1');
      expect(practiceLinks[1]).toHaveAttribute('href', '/practices?deck=d2');
      expect(practiceLinks[0]).toHaveClass(MAIN_ACTION_CLASS);
      expect(practiceLinks[1]).not.toHaveClass(MAIN_ACTION_CLASS);
    });

    it('leaves every Practice white while a run is active', async () => {
      renderHome({
        active_runs: [activeRun('r1', 'First practice')],
        recent_decks: [deck('d1', 'Ports', 0.5)],
      });

      const link = await screen.findByRole('link', { name: 'Practice' });
      expect(link).not.toHaveClass(MAIN_ACTION_CLASS);
    });

    it('renders no heading without a recent deck, and links New practice last, Cancel returning to Home', async () => {
      renderHome({});

      const link = await screen.findByRole('link', { name: 'New practice' });
      expect(link).toHaveAttribute('href', '/practices/new?cancelTo=%2F');
      expect(link).not.toHaveClass(MAIN_ACTION_CLASS);
      expect(screen.queryByText('Recently practiced')).not.toBeInTheDocument();
    });

    it('says nothing of when anything happened or that anything is waiting', async () => {
      const { container } = renderHome({
        active_runs: [activeRun('r1', 'First practice')],
        recent_decks: [deck('d1', 'Ports', 0.5)],
      });

      await screen.findByRole('link', { name: 'New practice' });
      expect(container.textContent).not.toMatch(/\bago\b|\bdue\b|coming soon/i);
    });
  });

  it('shows the failure sentence when the read fails', async () => {
    server.use(http.get(`${BASE}/api/home`, () => HttpResponse.json({}, { status: 500 })));
    renderWithProviders(<HomePage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load Home.');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
