// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useLocation } from 'react-router-dom';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import LibraryPage from 'src/pages/LibraryPage';

const BASE = 'http://localhost:8000';

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

const decks = [
  {
    id: 'd1',
    name: 'Algebra',
    created_at: '',
    card_count: 3,
    readiness: 0.5 as number | null,
    field_names: ['Term', 'Definition'],
  },
  {
    id: 'd2',
    name: 'Cells',
    created_at: '',
    card_count: 0,
    readiness: null,
    field_names: ['Front'],
  },
];

function mockDecks(decksData: typeof decks = decks) {
  server.use(http.get(`${BASE}/api/decks`, () => HttpResponse.json(decksData)));
}

afterEach(() => {
  server.resetHandlers();
});

describe('LibraryPage', () => {
  it('shows one list of decks with no tabs', async () => {
    mockDecks();
    renderWithProviders(<LibraryPage />, ['/library']);

    await screen.findByRole('link', { name: /Algebra/ });
    const rows = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByRole('link', { name: /Algebra/ })).toBeInTheDocument();
    expect(within(rows[1]!).getByRole('link', { name: /Cells/ })).toBeInTheDocument();
    expect(screen.getByText('2 decks')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('a deck row reads its counts alone beneath its name', async () => {
    mockDecks();
    renderWithProviders(<LibraryPage />);

    expect(await screen.findByText('3 cards · 2 fields')).toBeInTheDocument();
    expect(screen.getByText('0 cards · 1 field')).toBeInTheDocument();
  });

  it('reads "Decks" over the list while it loads', () => {
    server.use(http.get(`${BASE}/api/decks`, () => new Promise(() => {})));
    renderWithProviders(<LibraryPage />);

    expect(screen.getByText('Decks')).toBeInTheDocument();
  });

  it('tapping a deck row links to its detail page', async () => {
    mockDecks();
    renderWithProviders(<LibraryPage />);

    const row = await screen.findByRole('link', { name: /Algebra/ });
    expect(row).toHaveAttribute('href', '/decks/d1');
  });

  it('shows an empty state with a create button when there are no decks', async () => {
    mockDecks([]);
    renderWithProviders(<LibraryPage />);

    expect(await screen.findByText('No decks yet.')).toBeInTheDocument();
    // The count row's create button is the only one; the empty state is its text
    // alone. getByRole throws on a second match.
    expect(screen.getByRole('button', { name: 'Add deck' })).toBeInTheDocument();
  });

  it('the create button is sized for touch and opens New deck', async () => {
    mockDecks();
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <LibraryPage />
        <LocationProbe />
      </>,
    );

    await screen.findByText('Algebra');
    const button = screen.getByRole('button', { name: 'Add deck' });
    expect(button.className).toMatch(/h-10/);
    await user.click(button);

    expect(screen.getByTestId('location')).toHaveTextContent('/decks/new');
  });

  it('a deck row shows its mastery, and a deck with no card shows none', async () => {
    mockDecks([{ ...decks[0]!, readiness: 0.42 }, decks[1]!]);
    renderWithProviders(<LibraryPage />);

    const withCards = await screen.findByRole('link', { name: /Algebra/ });
    expect(within(withCards).getByRole('img', { name: 'Mastery 42%' })).toBeInTheDocument();
    const withoutCards = screen.getByRole('link', { name: /Cells/ });
    expect(within(withoutCards).queryByRole('img', { name: /Mastery/ })).not.toBeInTheDocument();
  });

  it('a failed decks load says so instead of rendering an empty list', async () => {
    server.use(
      http.get(`${BASE}/api/decks`, () => HttpResponse.json({ detail: 'boom' }, { status: 500 })),
    );
    renderWithProviders(<LibraryPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load decks.');
  });
});
