// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import PracticeOverviewPage from 'src/pages/PracticeOverviewPage';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';

const BASE = 'http://localhost:8000';

const DECKS = [
  {
    id: 'd1',
    name: 'Commands',
    created_at: '',
    last_activity_at: '',
    card_count: 2,
    readiness: 0.5,
    field_names: [],
  },
  {
    id: 'd2',
    name: 'Ports',
    created_at: '',
    last_activity_at: '',
    card_count: 2,
    readiness: 0.5,
    field_names: [],
  },
  {
    id: 'd3',
    name: 'Acronyms',
    created_at: '',
    last_activity_at: '',
    card_count: 2,
    readiness: 0.5,
    field_names: [],
  },
];

const practice = (
  id: string,
  name: string,
  deckIds: string[],
  readiness: number | null = null,
) => ({
  id,
  name,
  created_at: '2026-11-01T00:00:00Z',
  decks: deckIds.map((deckId) => ({
    deck_id: deckId,
    deck_name: DECKS.find((deck) => deck.id === deckId)!.name,
  })),
  active_run_id: null,
  readiness,
});

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

/** Rendered outside `<Routes>`, so it reports the page's own URL writes. */
function CurrentLocationProbe() {
  const location = useLocation();
  return <span data-testid="current-location">{location.search}</span>;
}

function renderOverview(practices: unknown[] | null, initialPath = '/practices') {
  server.use(
    http.get(`${BASE}/api/decks`, () => HttpResponse.json(DECKS)),
    http.get(`${BASE}/api/practices`, () =>
      practices
        ? HttpResponse.json(practices)
        : HttpResponse.json({ detail: 'boom' }, { status: 500 }),
    ),
  );
  return renderWithProviders(
    <>
      <CurrentLocationProbe />
      <Routes>
        <Route path="/practices" element={<PracticeOverviewPage />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </>,
    [initialPath],
  );
}

afterEach(() => server.resetHandlers());

describe('PracticeOverviewPage', () => {
  it('is headed All practices, as is the browser tab', async () => {
    renderOverview([]);

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('All practices');
    await waitFor(() => expect(document.title).toContain('All practices'));
  });

  it('lists every practice in the order received, each row opening its page', async () => {
    renderOverview([
      practice('p2', 'Commands + Ports', ['d1', 'd2']),
      practice('p1', 'Evening', ['d2']),
    ]);

    const list = await screen.findByRole('list');
    const links = within(list).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/practices/p2',
      '/practices/p1',
    ]);
  });

  it('a row is the practice mark and name over its decks, with its circle', async () => {
    renderOverview([practice('p1', 'Commands + Ports', ['d1', 'd2'], 0.46)]);

    const row = await screen.findByRole('link', { name: /Commands \+ Ports/ });
    const [name, decks] = Array.from(row.firstElementChild!.children);
    expect(name).toHaveTextContent(/^Commands \+ Ports$/);
    expect(name!.firstElementChild).toHaveAttribute('aria-label', 'Practice');
    expect(decks).toHaveTextContent(/^Commands · Ports$/);
    expect(within(decks as HTMLElement).getAllByRole('img', { name: 'Deck' })).toHaveLength(2);
    expect(within(row).getByRole('img', { name: 'Mastery 46%' })).toBeInTheDocument();
  });

  it('a practice whose decks hold no card has no circle', async () => {
    renderOverview([practice('p1', 'Evening', ['d2'])]);

    const row = await screen.findByRole('link', { name: /Evening/ });
    expect(within(row).queryByRole('img', { name: /^Mastery/ })).not.toBeInTheDocument();
  });

  it('holds no tabs, and one filter reading All decks', async () => {
    renderOverview([practice('p1', 'Evening', ['d2'])]);

    await screen.findByRole('link', { name: /Evening/ });
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'All decks');
  });

  it('choosing a deck leaves only the practices holding it, and keeps it in the URL', async () => {
    const user = userEvent.setup();
    renderOverview([
      practice('p1', 'Commands + Ports', ['d1', 'd2']),
      practice('p2', 'Evening', ['d2']),
      practice('p3', 'Morning', ['d1']),
    ]);
    await screen.findByRole('link', { name: /Evening/ });

    await user.click(screen.getByPlaceholderText('All decks'));
    await user.click(await screen.findByRole('option', { name: 'Deck Ports' }));

    expect(screen.getByTestId('current-location')).toHaveTextContent(/^\?deck=d2$/);
    const links = within(screen.getByRole('list')).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/practices/p1',
      '/practices/p2',
    ]);
  });

  it('All decks lifts the filter', async () => {
    const user = userEvent.setup();
    renderOverview(
      [practice('p1', 'Evening', ['d2']), practice('p2', 'Morning', ['d1'])],
      '/practices?deck=d1',
    );
    await screen.findByRole('link', { name: /Morning/ });
    expect(screen.queryByRole('link', { name: /Evening/ })).not.toBeInTheDocument();

    await user.click(screen.getByPlaceholderText('All decks'));
    await user.click(await screen.findByRole('option', { name: 'All decks' }));

    expect(screen.getByTestId('current-location')).toHaveTextContent(/^$/);
    expect(await screen.findByRole('link', { name: /Evening/ })).toBeInTheDocument();
  });

  it('a filter holding no practice says so, and Clear filters lifts it', async () => {
    const user = userEvent.setup();
    renderOverview([practice('p1', 'Evening', ['d2'])], '/practices?deck=d3');

    expect(await screen.findByText('No practices match these filters.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(await screen.findByRole('link', { name: /Evening/ })).toBeInTheDocument();
    expect(screen.queryByText('No practices match these filters.')).not.toBeInTheDocument();
    expect(screen.getByTestId('current-location')).toHaveTextContent(/^$/);
  });

  it('Add practice opens New practice with this page as cancelTo', async () => {
    const user = userEvent.setup();
    renderOverview([]);

    await user.click(await screen.findByRole('button', { name: 'Add practice' }));

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/practices/new?cancelTo=%2Fpractices',
    );
  });

  it('says No practices yet. with none', async () => {
    renderOverview([]);

    expect(await screen.findByText('No practices yet.')).toBeInTheDocument();
  });

  it('says it could not load practices when the read fails', async () => {
    renderOverview(null);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load practices.');
  });
});
