// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import HomePage from 'src/pages/HomePage';
import type { components } from 'src/api/types';

type HomeRead = components['schemas']['HomeRead'];
type HomeActivePractice = components['schemas']['HomeActivePractice'];
type DeckSummary = components['schemas']['DeckSummary'];

const BASE = 'http://localhost:8000';
const MAIN_ACTION_CLASS = 'bg-(--color-main-action)';

const practice = (id: string, name: string): HomeActivePractice => ({
  id,
  user_id: 'u1',
  name,
  status: 'active',
  created_at: '2026-11-01T00:00:00Z',
  decks: [
    {
      deck_id: `deck-of-${id}`,
      deck_name: `Deck of ${name}`,
      subject_id: 's1',
      subject_name: 'Networking',
      configuration_name: `Configuration of ${name}`,
    },
  ],
  progress: { total_cards: 4, passed: 1, still_failed: 0, retry_pending: 0, unseen: 3 },
});

const deck = (id: string, name: string, readiness: number | null): DeckSummary => ({
  id,
  subject_id: `subject-of-${id}`,
  subject_name: 'Networking',
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
      HttpResponse.json({ steps: null, active_practices: [], recent_decks: [], ...home }),
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
    it('counts the two done, strikes them and makes the next the one main action', async () => {
      renderHome({
        steps: { has_subject: true, has_deck: true, has_card: false, has_configuration: false },
      });

      const list = await screen.findByRole('list', { name: 'Your first practice' });
      expect(
        screen.getByRole('heading', { level: 2, name: 'Your first practice' }),
      ).toBeInTheDocument();
      expect(screen.getByText('2 of 5')).toBeInTheDocument();
      expect(within(list).getAllByRole('listitem')).toHaveLength(5);

      expect(within(list).getByText('New subject')).toHaveClass('line-through');
      expect(within(list).getByText('New deck')).toHaveClass('line-through');

      // The next step is the only link, so nothing else on the list can be followed or yellow.
      const link = within(list).getByRole('link');
      expect(link).toHaveTextContent('New card');
      expect(link).toHaveAttribute('href', '/cards/new');
      expect(link).toHaveClass(MAIN_ACTION_CLASS);

      for (const label of ['New configuration', 'New practice']) {
        expect(within(list).getByText(label)).not.toHaveClass('line-through');
      }
      expect(screen.getAllByRole('link')).toHaveLength(1);
    });

    it.each([
      { done: 0, label: 'New subject', href: '/subjects/new' },
      { done: 1, label: 'New deck', href: '/decks/new' },
      { done: 3, label: 'New configuration', href: '/deck-configurations/new' },
      { done: 4, label: 'New practice', href: '/practice/new' },
    ])('with $done done links $label to $href', async ({ done, label, href }) => {
      renderHome({
        steps: {
          has_subject: done >= 1,
          has_deck: done >= 2,
          has_card: done >= 3,
          has_configuration: done >= 4,
        },
      });

      const link = await screen.findByRole('link', { name: label });
      expect(link).toHaveAttribute('href', href);
      expect(screen.getByText(`${done} of 5`)).toBeInTheDocument();
    });
  });

  describe('once a practice has been made', () => {
    it('renders each active practice with its chips and bar, and Start practice on the first', async () => {
      renderHome({
        active_practices: [
          practice('p1', 'First practice'),
          practice('p2', 'Second practice'),
          practice('p3', 'Third practice'),
        ],
      });

      const first = await screen.findByRole('link', { name: /First practice/ });
      expect(first).toHaveAttribute('href', '/practice/p1');
      expect(screen.getByRole('link', { name: /Second practice/ })).toHaveAttribute(
        'href',
        '/practice/p2',
      );
      expect(screen.getByRole('link', { name: /Third practice/ })).toHaveAttribute(
        'href',
        '/practice/p3',
      );
      expect(screen.getAllByText('Active')).toHaveLength(3);
      expect(
        screen.getByText('Deck of First practice · Configuration of First practice'),
      ).toBeInTheDocument();
      expect(
        screen.getAllByRole('img', { name: '1 passed, 0 failed, 0 retrying, 3 unseen' }),
      ).toHaveLength(3);

      const starts = screen.getAllByRole('link', { name: 'Start practice' });
      expect(starts).toHaveLength(1);
      expect(starts[0]).toHaveAttribute('href', '/practice/p1/run');
      expect(starts[0]).toHaveClass(MAIN_ACTION_CLASS);
    });

    it('renders no steps', async () => {
      renderHome({ active_practices: [practice('p1', 'First practice')] });

      await screen.findByRole('link', { name: 'Start practice' });
      expect(screen.queryByText('Your first practice')).not.toBeInTheDocument();
    });

    it('renders the recent decks, the first yellow when no practice is active', async () => {
      renderHome({ recent_decks: [deck('d1', 'Ports', 0.5), deck('d2', 'Commands', null)] });

      expect(
        await screen.findByRole('heading', { level: 2, name: 'Recently practiced' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Ports/ })).toHaveAttribute('href', '/decks/d1');
      expect(screen.getByRole('link', { name: /Commands/ })).toHaveAttribute('href', '/decks/d2');
      expect(screen.getAllByText('Networking · 21 cards · 4 fields')).toHaveLength(2);
      // The second deck has no readiness, so it has no circle.
      expect(screen.getAllByRole('img', { name: /^Mastery/ })).toHaveLength(1);
      expect(screen.getByRole('img', { name: 'Mastery 50%' })).toBeInTheDocument();

      const practiceLinks = screen.getAllByRole('link', { name: 'Practice' });
      expect(practiceLinks[0]).toHaveAttribute('href', '/practice?subject=subject-of-d1&deck=d1');
      expect(practiceLinks[1]).toHaveAttribute('href', '/practice?subject=subject-of-d2&deck=d2');
      expect(practiceLinks[0]).toHaveClass(MAIN_ACTION_CLASS);
      expect(practiceLinks[1]).not.toHaveClass(MAIN_ACTION_CLASS);
    });

    it('leaves every Practice white while a practice is active', async () => {
      renderHome({
        active_practices: [practice('p1', 'First practice')],
        recent_decks: [deck('d1', 'Ports', 0.5)],
      });

      const link = await screen.findByRole('link', { name: 'Practice' });
      expect(link).not.toHaveClass(MAIN_ACTION_CLASS);
    });

    it('renders no heading without a recent deck, and links New practice last', async () => {
      renderHome({});

      const link = await screen.findByRole('link', { name: 'New practice' });
      expect(link).toHaveAttribute('href', '/practice/new');
      expect(link).not.toHaveClass(MAIN_ACTION_CLASS);
      expect(screen.queryByText('Recently practiced')).not.toBeInTheDocument();
    });

    it('says nothing of when anything happened or that anything is waiting', async () => {
      const { container } = renderHome({
        active_practices: [practice('p1', 'First practice')],
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
