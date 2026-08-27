// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
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

function configuration(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cfg1',
    deck_id: 'd1',
    name: 'Front to Back',
    created_at: '',
    prompt_field_ids: ['f1'],
    answer_field_ids: ['f2'],
    prompt_pool_ids: [] as string[],
    prompt_pool_counts: [] as number[],
    answer_pool_ids: [] as string[],
    answer_pool_counts: [] as number[],
    deck_name: 'Vocab Deck',
    subject_id: 's1',
    subject_name: 'French',
    ...overrides,
  };
}

function mockDeck({
  deckData = deck,
  deckStatus = 200,
  subjectData = subject,
  configurations = [],
}: {
  deckData?: typeof deck;
  deckStatus?: number;
  subjectData?: typeof subject;
  configurations?: unknown[];
} = {}) {
  const configRequests: URLSearchParams[] = [];
  server.use(
    http.get(`${BASE}/api/decks/:id`, () =>
      deckStatus === 200
        ? HttpResponse.json(deckData)
        : HttpResponse.json({ detail: 'Deck not found' }, { status: deckStatus }),
    ),
    http.get(`${BASE}/api/subjects/:id`, () => HttpResponse.json(subjectData)),
    http.get(`${BASE}/api/deck_practice_configs`, ({ request }) => {
      configRequests.push(new URL(request.url).searchParams);
      return HttpResponse.json(configurations);
    }),
  );
  return configRequests;
}

function LocationProbe() {
  const location = useLocation();
  return (
    <span
      data-testid="location"
      data-state={JSON.stringify(location.state)}
      data-search={location.search}
    >
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

  it('renders a two-link breadcrumb chain: library then subject, both in one row', async () => {
    mockDeck();
    renderAtDeckRoute();

    const libraryLink = await screen.findByRole('link', { name: 'Your library' });
    const subjectLink = await screen.findByRole('link', { name: /French/ });
    expect(libraryLink).toHaveAttribute('href', '/library');
    expect(subjectLink).toHaveAttribute('href', '/subjects/s1');
    // Same row: a shared ancestor no further out than the crumb container itself.
    expect(libraryLink.parentElement).toBe(subjectLink.parentElement);
  });

  it('the library crumb link carries no ?tab — a structural link goes to the place, not a remembered view', async () => {
    mockDeck();
    renderAtDeckRoute();

    const libraryLink = await screen.findByRole('link', { name: 'Your library' });
    expect(libraryLink).toHaveAttribute('href', '/library');
  });

  it('the library link is present even before the subject query resolves', async () => {
    server.use(
      http.get(`${BASE}/api/decks/:id`, () => HttpResponse.json(deck)),
      http.get(`${BASE}/api/subjects/:id`, async () => {
        await delay(50);
        return HttpResponse.json(subject);
      }),
      http.get(`${BASE}/api/deck_practice_configs`, () => HttpResponse.json([])),
    );
    renderAtDeckRoute();

    const libraryLink = await screen.findByRole('link', { name: 'Your library' });
    expect(libraryLink).toHaveAttribute('href', '/library');
    expect(screen.queryByRole('link', { name: /French/ })).not.toBeInTheDocument();

    expect(await screen.findByRole('link', { name: /French/ })).toHaveAttribute(
      'href',
      '/subjects/s1',
    );
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

  it('shows an empty state when the deck has no cards, and still renders the field header', async () => {
    mockDeck({ deckData: { ...deck, cards: [] } });
    renderAtDeckRoute();

    expect(await screen.findByText('No cards in this deck yet.')).toBeInTheDocument();
    // The tab's own button, plus the same button in the empty state: both inside the
    // collection they add to, neither in the header.
    expect(screen.getAllByRole('button', { name: 'Add card' })).toHaveLength(2);
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

  it('the header carries deck-level actions only — no bare + whose meaning depends on a tab', async () => {
    mockDeck();
    renderAtDeckRoute();

    await screen.findByRole('heading', { name: 'Vocab Deck' });
    expect(screen.getByRole('button', { name: 'Edit deck' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Practice' })).toBeInTheDocument();
    // The add control lives in the tab it acts on, labeled.
    expect(screen.getByRole('button', { name: 'Add card' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New card' })).not.toBeInTheDocument();
  });

  it('Add card navigates to the card creation form with this deck locked', async () => {
    mockDeck();
    const user = userEvent.setup();
    renderAtDeckRoute(<LocationProbe />);

    await screen.findByRole('heading', { name: 'Vocab Deck' });
    await user.click(screen.getAllByRole('button', { name: 'Add card' })[0]!);

    expect(screen.getByTestId('location')).toHaveTextContent('/cards/new');
    expect(screen.getByTestId('location')).toHaveAttribute(
      'data-state',
      JSON.stringify({ deckId: 'd1' }),
    );
  });

  it('Practice opens the overview pre-filtered to this deck and its subject', async () => {
    mockDeck();
    const user = userEvent.setup();
    renderAtDeckRoute(<LocationProbe />);

    await screen.findByRole('heading', { name: 'Vocab Deck' });
    await user.click(screen.getByRole('button', { name: 'Practice' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/practice');
    // Both params: two decks in different subjects can share a name, so the deck id
    // alone would leave the arriving list ambiguous about which subject it belongs to.
    expect(screen.getByTestId('location')).toHaveAttribute('data-search', '?subject=s1&deck=d1');
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

  describe('Configurations tab', () => {
    it("starts on Cards and switches to this deck's configurations", async () => {
      const configRequests = mockDeck({ configurations: [configuration()] });
      const user = userEvent.setup();
      renderAtDeckRoute();
      await screen.findByRole('heading', { name: 'Vocab Deck' });

      expect(screen.getByRole('tab', { name: 'Cards' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.queryByText('Front to Back')).not.toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: 'Configurations' }));

      expect(await screen.findByText('Front to Back')).toBeInTheDocument();
      expect(screen.queryByRole('columnheader', { name: 'Front' })).not.toBeInTheDocument();
      // Scoped to this deck — a configuration belongs to exactly one.
      expect(configRequests[0]!.get('deck_id')).toBe('d1');
    });

    it('opens straight onto the tab named in the URL, so a save can land back on it', async () => {
      mockDeck({ configurations: [configuration()] });
      renderAtDeckRoute(null, '/decks/d1?tab=configurations');

      expect(await screen.findByText('Front to Back')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Configurations' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });

    it('each tab carries its own labeled add button, inside the tab', async () => {
      mockDeck({ configurations: [] });
      const user = userEvent.setup();
      renderAtDeckRoute(<LocationProbe />);
      await screen.findByRole('heading', { name: 'Vocab Deck' });

      expect(screen.getAllByRole('button', { name: 'Add card' }).length).toBeGreaterThan(0);
      expect(screen.queryByRole('button', { name: 'New configuration' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: 'Configurations' }));
      expect(screen.queryByRole('button', { name: 'Add card' })).not.toBeInTheDocument();
      await user.click(screen.getAllByRole('button', { name: 'New configuration' })[0]!);

      expect(screen.getByTestId('location')).toHaveTextContent('/deck-configurations/new');
      expect(screen.getByTestId('location')).toHaveAttribute(
        'data-state',
        JSON.stringify({ deckId: 'd1' }),
      );
    });

    it('a configuration row opens its builder', async () => {
      mockDeck({ configurations: [configuration()] });
      const user = userEvent.setup();
      renderAtDeckRoute(null, '/decks/d1?tab=configurations');

      const row = await screen.findByRole('link', { name: /Front to Back/ });
      expect(row).toHaveAttribute('href', '/deck-configurations/cfg1/edit');
      await user.click(row);
    });

    it('says what a configuration is when the deck has none', async () => {
      mockDeck({ configurations: [] });
      renderAtDeckRoute(null, '/decks/d1?tab=configurations');

      expect(await screen.findByText(/No configurations yet/)).toBeInTheDocument();
      // The tab's own button, plus the same button in the empty state.
      expect(screen.getAllByRole('button', { name: 'New configuration' })).toHaveLength(2);
    });

    it('deleting confirms, promises practices are unaffected, then drops the row', async () => {
      let deleted: string | null = null;
      mockDeck({ configurations: [configuration()] });
      server.use(
        http.delete(`${BASE}/api/deck_practice_configs/:id`, ({ params }) => {
          deleted = params.id as string;
          return new HttpResponse(null, { status: 204 });
        }),
      );
      const user = userEvent.setup();
      renderAtDeckRoute(null, '/decks/d1?tab=configurations');
      await screen.findByText('Front to Back');

      await user.click(screen.getByRole('button', { name: 'Delete Front to Back' }));
      const dialog = await screen.findByRole('dialog');
      expect(
        within(dialog).getByText(/practices that already used it are unaffected/i),
      ).toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

      await waitFor(() => expect(deleted).toBe('cfg1'));
    });
  });
});
