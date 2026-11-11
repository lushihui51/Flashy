// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
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
  created_at: '',
  readiness: 0.5 as number | null,
  field_defs: twoFields,
  cards: [
    {
      id: 'c1',
      deck_id: 'd1',
      created_at: '',
      values: { f1: 'Bonjour', f2: 'Hello' } as Record<string, string>,
      readiness: 0.5,
    },
  ],
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
    ...overrides,
  };
}

function mockDeck({
  deckData = deck,
  deckStatus = 200,
  configurations = [],
}: {
  deckData?: typeof deck;
  deckStatus?: number;
  configurations?: unknown[];
} = {}) {
  const configRequests: URLSearchParams[] = [];
  server.use(
    http.get(`${BASE}/api/decks/:id`, () =>
      deckStatus === 200
        ? HttpResponse.json(deckData)
        : HttpResponse.json({ detail: 'Deck not found' }, { status: deckStatus }),
    ),
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
  it('renders name, breadcrumb, card list, and card values with no console errors', async () => {
    mockDeck();
    renderAtDeckRoute();

    expect(await screen.findByRole('heading', { name: 'Deck Vocab Deck' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Cards in Vocab Deck' })).toBeInTheDocument();
    expect(screen.getByText('[Front]')).toBeInTheDocument();
    expect(screen.getByText('[Back]')).toBeInTheDocument();
    expect(screen.getByText('Bonjour')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows the mastery circle directly after the name, before Practice', async () => {
    mockDeck({ deckData: { ...deck, readiness: 0.42 } });
    renderAtDeckRoute();

    const heading = await screen.findByRole('heading', { name: 'Deck Vocab Deck' });
    const circle = heading.nextElementSibling!;
    expect(circle).toBe(screen.getByRole('img', { name: 'Mastery 42%' }));
    expect(
      circle.compareDocumentPosition(screen.getByRole('button', { name: 'Practice' })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(heading).toHaveClass('flex-1');
  });

  it('shows no mastery circle for a deck with no card', async () => {
    mockDeck({ deckData: { ...deck, readiness: null, cards: [] } });
    renderAtDeckRoute();

    await screen.findByRole('heading', { name: 'Deck Vocab Deck' });
    expect(screen.queryByRole('img', { name: /Mastery/ })).not.toBeInTheDocument();
  });

  it("the heading shows the deck's mark before the deck's name", async () => {
    mockDeck();
    renderAtDeckRoute();

    const heading = await screen.findByRole('heading', { name: 'Deck Vocab Deck' });
    const mark = within(heading).getByRole('img', { name: 'Deck' });
    expect(heading).toHaveTextContent(/^Vocab Deck$/);
    expect(heading.firstElementChild!.firstElementChild).toBe(mark);
  });

  it('the pencil Edit deck carries no mark', async () => {
    mockDeck();
    renderAtDeckRoute();

    const edit = await screen.findByRole('button', { name: 'Edit deck' });
    expect(within(edit).queryByRole('img', { name: 'Deck' })).not.toBeInTheDocument();
  });

  it("shows each card's mastery on its row", async () => {
    mockDeck({
      deckData: {
        ...deck,
        readiness: 0.2,
        cards: [{ ...deck.cards[0]!, readiness: 0.42 }],
      },
    });
    renderAtDeckRoute();

    const list = await screen.findByRole('list', { name: 'Cards in Vocab Deck' });
    expect(within(list).getByRole('img', { name: 'Mastery 42%' })).toBeInTheDocument();
  });

  it('the breadcrumb holds one place, Your library', async () => {
    mockDeck();
    renderAtDeckRoute();

    await screen.findByRole('heading', { name: 'Deck Vocab Deck' });
    const row = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const links = within(row).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent(/^Your library$/);
    expect(links[0]).toHaveAttribute('href', '/library');
  });

  it('the library crumb link carries no ?tab — a structural link goes to the place, not a remembered view', async () => {
    mockDeck();
    renderAtDeckRoute();

    const libraryLink = await screen.findByRole('link', { name: 'Your library' });
    expect(libraryLink).toHaveAttribute('href', '/library');
  });

  describe('Cards toolbar label pluralization', () => {
    it('reads "1 card · 1 field" for singular counts', async () => {
      mockDeck({
        deckData: {
          ...deck,
          field_defs: [twoFields[0]!],
          cards: [
            { id: 'c1', deck_id: 'd1', created_at: '', values: { f1: 'Bonjour' }, readiness: 0.5 },
          ],
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

  it('shows an empty state and no card list when the deck has no cards', async () => {
    mockDeck({ deckData: { ...deck, cards: [] } });
    renderAtDeckRoute();

    expect(await screen.findByText('No cards in this deck yet.')).toBeInTheDocument();
    // The tab's toolbar button is the only add control; the empty state is its text
    // alone. getByRole throws on a second match.
    expect(screen.getByRole('button', { name: 'Add card' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Cards in Vocab Deck' })).not.toBeInTheDocument();
  });

  it('a zero-card deck with 8+ fields counts its fields over the empty state', async () => {
    const manyFields = Array.from({ length: 8 }, (_, i) => ({
      id: `f${i}`,
      name: `Field ${i}`,
      type: 'text',
      position: i,
    }));
    mockDeck({ deckData: { ...deck, field_defs: manyFields, cards: [] } });
    renderAtDeckRoute();

    expect(await screen.findByText('No cards in this deck yet.')).toBeInTheDocument();
    expect(screen.getByText('0 cards · 8 fields')).toBeInTheDocument();
  });

  it('the header carries deck-level actions only — no bare + whose meaning depends on a tab', async () => {
    mockDeck();
    renderAtDeckRoute();

    await screen.findByRole('heading', { name: 'Deck Vocab Deck' });
    expect(screen.getByRole('button', { name: 'Edit deck' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Practice' })).toBeInTheDocument();
    // The add control lives in the tab it acts on, labeled.
    expect(screen.getByRole('button', { name: 'Add card' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New card' })).not.toBeInTheDocument();
  });

  it('Add card navigates to the card creation form with this deck locked, Cancel returning here', async () => {
    mockDeck();
    const user = userEvent.setup();
    renderAtDeckRoute(<LocationProbe />);

    await screen.findByRole('heading', { name: 'Deck Vocab Deck' });
    await user.click(screen.getByRole('button', { name: 'Add card' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/cards/new');
    expect(screen.getByTestId('location')).toHaveAttribute(
      'data-state',
      JSON.stringify({ deckId: 'd1' }),
    );
    expect(screen.getByTestId('location')).toHaveAttribute(
      'data-search',
      '?cancelTo=%2Fdecks%2Fd1',
    );
  });

  it('a card row opens Edit card, Cancel returning here', async () => {
    mockDeck();
    renderAtDeckRoute();

    const list = await screen.findByRole('list', { name: 'Cards in Vocab Deck' });
    expect(within(list).getByRole('link')).toHaveAttribute(
      'href',
      '/cards/c1/edit?cancelTo=%2Fdecks%2Fd1',
    );
  });

  it('Practice opens the overview pre-filtered to this deck', async () => {
    mockDeck();
    const user = userEvent.setup();
    renderAtDeckRoute(<LocationProbe />);

    await screen.findByRole('heading', { name: 'Deck Vocab Deck' });
    await user.click(screen.getByRole('button', { name: 'Practice' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/practice');
    expect(screen.getByTestId('location')).toHaveAttribute('data-search', '?deck=d1');
  });

  it('Edit deck opens the deck form, Cancel returning here', async () => {
    mockDeck();
    const user = userEvent.setup();
    renderAtDeckRoute(<LocationProbe />);

    await screen.findByRole('heading', { name: 'Deck Vocab Deck' });
    await user.click(screen.getByRole('button', { name: 'Edit deck' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/decks/d1/edit');
    expect(screen.getByTestId('location')).toHaveAttribute(
      'data-search',
      '?cancelTo=%2Fdecks%2Fd1',
    );
  });

  it('renders with no console errors for a deck with zero fields', async () => {
    mockDeck({ deckData: { ...deck, field_defs: [], cards: [] } });
    renderAtDeckRoute();

    await screen.findByRole('heading', { name: 'Deck Vocab Deck' });
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
            readiness: 0.5,
          },
        ],
      },
    });
    renderAtDeckRoute();

    await screen.findByRole('heading', { name: 'Deck Vocab Deck' });
    const card = screen.getByRole('link', { name: /v-f0/ });
    manyFields.forEach((f) => expect(within(card).getByText(`v-${f.id}`)).toBeInTheDocument());
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows a not-found message instead of crashing for a missing deck', async () => {
    mockDeck({ deckStatus: 404 });
    renderAtDeckRoute(null, '/decks/nope');

    expect(await screen.findByText('Deck not found.')).toBeInTheDocument();
  });

  it('a load failure other than 404 says it could not load, not that it was not found', async () => {
    mockDeck();
    server.use(
      http.get(`${BASE}/api/decks/:id`, () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    );
    renderAtDeckRoute();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this deck.');
    expect(screen.queryByText('Deck not found.')).not.toBeInTheDocument();
  });

  describe('Configurations tab', () => {
    it("starts on Cards and switches to this deck's configurations", async () => {
      const configRequests = mockDeck({ configurations: [configuration()] });
      const user = userEvent.setup();
      renderAtDeckRoute();
      await screen.findByRole('heading', { name: 'Deck Vocab Deck' });

      expect(screen.getByRole('tab', { name: 'Cards' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.queryByText('Front to Back')).not.toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: 'Configurations' }));

      expect(await screen.findByText('Front to Back')).toBeInTheDocument();
      expect(screen.queryByText('Bonjour')).not.toBeInTheDocument();
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
      await screen.findByRole('heading', { name: 'Deck Vocab Deck' });

      expect(screen.getByRole('button', { name: 'Add card' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Add configuration' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: 'Configurations' }));
      expect(screen.queryByRole('button', { name: 'Add card' })).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Add configuration' }));

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

    it('says No configurations yet. under a 0 configurations label when the deck has none', async () => {
      mockDeck({ configurations: [] });
      renderAtDeckRoute(null, '/decks/d1?tab=configurations');

      expect(await screen.findByText('No configurations yet.')).toBeInTheDocument();
      expect(screen.getByText('0 configurations')).toBeInTheDocument();
      // The tab's toolbar button is the only add control; the empty state is its text
      // alone. getByRole throws on a second match.
      expect(screen.getByRole('button', { name: 'Add configuration' })).toBeInTheDocument();
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

    it('a delete of a configuration already gone says Deck configuration not found.', async () => {
      mockDeck({ configurations: [configuration()] });
      server.use(
        http.delete(`${BASE}/api/deck_practice_configs/:id`, () =>
          HttpResponse.json({ detail: 'Deck configuration not found' }, { status: 404 }),
        ),
      );
      const user = userEvent.setup();
      renderAtDeckRoute(null, '/decks/d1?tab=configurations');
      await screen.findByText('Front to Back');

      await user.click(screen.getByRole('button', { name: 'Delete Front to Back' }));
      const dialog = await screen.findByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        'Deck configuration not found.',
      );
    });
  });
});
