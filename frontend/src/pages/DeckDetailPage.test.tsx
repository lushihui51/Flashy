// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import DeckDetailPage from 'src/pages/DeckDetailPage';

// DeckDetailPage reads its id via useParams, which only resolves inside a matched
// <Route> — a bare MemoryRouter with no route config leaves params empty.
function renderAtDeckRoute(extra: ReactNode = null, path = '/decks/d1') {
  return renderWithProviders(
    <>
      <Routes>
        <Route path="/decks/:deckId" element={<DeckDetailPage />} />
        <Route path="*" element={null} />
      </Routes>
      {extra}
    </>,
    [path],
  );
}

const BASE = 'http://localhost:8000';

const twoFields = [
  { id: 'f1', name: 'Front', type: 'text', position: 0 },
  { id: 'f2', name: 'Back', type: 'text', position: 1 },
];
const deck = {
  id: 'd1',
  name: 'Vocab Deck',
  subject_id: 's1',
  created_at: '',
  field_defs: twoFields,
  cards: [
    {
      id: 'c1',
      deck_id: 'd1',
      created_at: '',
      values: { f1: 'Bonjour', f2: 'Hello' } as Record<string, string>,
    },
  ],
};
const subject = {
  id: 's1',
  name: 'French',
  icon: 'languages',
  description: '',
  user_id: 'u1',
  created_at: '',
};

function mockDeck({
  deckData = deck,
  deckStatus = 200,
  subjectData = subject,
}: {
  deckData?: typeof deck;
  deckStatus?: number;
  subjectData?: typeof subject;
} = {}) {
  server.use(
    http.get(`${BASE}/api/decks/:id`, () =>
      deckStatus === 200
        ? HttpResponse.json(deckData)
        : HttpResponse.json({ detail: 'Deck not found' }, { status: deckStatus }),
    ),
    http.get(`${BASE}/api/subjects/:id`, () => HttpResponse.json(subjectData)),
  );
}

function LocationProbe() {
  const location = useLocation();
  return (
    <span data-testid="location" data-state={JSON.stringify(location.state)}>
      {location.pathname}
    </span>
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

describe('DeckDetailPage', () => {
  it('renders name, breadcrumb, table, and card values with no console errors', async () => {
    mockDeck();
    renderAtDeckRoute();

    expect(await screen.findByRole('heading', { name: 'Vocab Deck' })).toBeInTheDocument();
    expect(await screen.findByText(/French/)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Front' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByText('Bonjour')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('the breadcrumb renders the subject icon as a real icon (not raw text) and links to the subject page', async () => {
    mockDeck();
    renderAtDeckRoute();

    const crumb = await screen.findByRole('link', { name: /French/ });
    expect(crumb).toHaveAttribute('href', '/subjects/s1');
    expect(crumb.querySelector('svg')).toBeInTheDocument();
    expect(crumb).not.toHaveTextContent('languages');
  });

  it('still renders an icon without crashing when the subject has no icon set', async () => {
    mockDeck({ subjectData: { ...subject, icon: '' } });
    renderAtDeckRoute();

    const crumb = await screen.findByRole('link', { name: /French/ });
    expect(crumb.querySelector('svg')).toBeInTheDocument();
  });

  describe('meta line pluralization', () => {
    it('reads "1 card · 1 field" for singular counts', async () => {
      mockDeck({
        deckData: {
          ...deck,
          field_defs: [twoFields[0]!],
          cards: [{ id: 'c1', deck_id: 'd1', created_at: '', values: { f1: 'Bonjour' } }],
        },
      });
      renderAtDeckRoute();

      expect(await screen.findByText('1 card · 1 field')).toBeInTheDocument();
    });

    it('reads plural counts for many', async () => {
      mockDeck();
      renderAtDeckRoute();

      expect(await screen.findByText('1 card · 2 fields')).toBeInTheDocument();
    });

    it('reads "0 cards" for an empty deck', async () => {
      mockDeck({ deckData: { ...deck, cards: [] } });
      renderAtDeckRoute();

      expect(await screen.findByText('0 cards · 2 fields')).toBeInTheDocument();
    });
  });

  it('shows an empty state with a create button when the deck has no cards, and still renders the field header', async () => {
    mockDeck({ deckData: { ...deck, cards: [] } });
    renderAtDeckRoute();

    expect(await screen.findByText('No cards in this deck yet.')).toBeInTheDocument();
    // two "New card" controls now: the header's icon-only button and this empty
    // state's own button — both real, both should be present.
    expect(screen.getAllByRole('button', { name: 'New card' })).toHaveLength(2);
    // the table (and its field header) is not replaced by the empty state.
    expect(screen.getByRole('columnheader', { name: 'Front' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Back' })).toBeInTheDocument();
    expect(screen.queryAllByRole('row')).toHaveLength(1); // header row only, no card rows
  });

  it('a zero-card deck with 8+ fields renders a scrollable header with the empty state beneath', async () => {
    const manyFields = Array.from({ length: 8 }, (_, i) => ({
      id: `f${i}`,
      name: `Field ${i}`,
      type: 'text',
      position: i,
    }));
    mockDeck({ deckData: { ...deck, field_defs: manyFields, cards: [] } });
    renderAtDeckRoute();

    expect(await screen.findByText('No cards in this deck yet.')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(8);
  });

  it('icon-only action buttons expose accessible names', async () => {
    mockDeck();
    renderAtDeckRoute();

    await screen.findByRole('heading', { name: 'Vocab Deck' });
    expect(screen.getByRole('button', { name: 'New card' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit deck' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Practice' })).toBeInTheDocument();
  });

  it('New card navigates to the card creation form with this deck locked', async () => {
    mockDeck();
    const user = userEvent.setup();
    renderAtDeckRoute(<LocationProbe />);

    await screen.findByRole('heading', { name: 'Vocab Deck' });
    await user.click(screen.getByRole('button', { name: 'New card' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/cards/new');
    expect(screen.getByTestId('location')).toHaveAttribute('data-state', JSON.stringify({ deckId: 'd1' }));
  });

  it('Edit navigates to the deck-edit placeholder route', async () => {
    mockDeck();
    const user = userEvent.setup();
    renderAtDeckRoute(<LocationProbe />);

    await screen.findByRole('heading', { name: 'Vocab Deck' });
    await user.click(screen.getByRole('button', { name: 'Edit deck' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/decks/d1/edit');
  });

  it('renders with no console errors for a deck with zero fields', async () => {
    mockDeck({ deckData: { ...deck, field_defs: [], cards: [] } });
    renderAtDeckRoute();

    await screen.findByRole('heading', { name: 'Vocab Deck' });
    expect(await screen.findByText('0 cards · 0 fields')).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('renders with no console errors for a deck with 8+ fields', async () => {
    const manyFields = Array.from({ length: 8 }, (_, i) => ({
      id: `f${i}`,
      name: `Field ${i}`,
      type: 'text',
      position: i,
    }));
    mockDeck({
      deckData: {
        ...deck,
        field_defs: manyFields,
        cards: [
          {
            id: 'c1',
            deck_id: 'd1',
            created_at: '',
            values: Object.fromEntries(manyFields.map((f) => [f.id, `v-${f.id}`])),
          },
        ],
      },
    });
    renderAtDeckRoute();

    await screen.findByRole('heading', { name: 'Vocab Deck' });
    expect(screen.getAllByRole('columnheader')).toHaveLength(8);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows a not-found message instead of crashing for a missing deck', async () => {
    mockDeck({ deckStatus: 404 });
    renderAtDeckRoute(null, '/decks/nope');

    expect(await screen.findByText('Deck not found.')).toBeInTheDocument();
  });
});
