// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import CardStandaloneForm from 'src/components/library/CardStandaloneForm';

const BASE = 'http://localhost:8000';

const decks = [
  {
    id: 'd1',
    subject_id: 's1',
    name: 'French Vocab',
    created_at: '',
    card_count: 1,
    readiness: 0.5,
    field_names: ['Front', 'Back'],
  },
  {
    id: 'd2',
    subject_id: 's1',
    name: 'Spanish Vocab',
    created_at: '',
    card_count: 0,
    readiness: null,
    field_names: ['Word'],
  },
];

const deckD1 = {
  id: 'd1',
  name: 'French Vocab',
  subject_id: 's1',
  created_at: '',
  readiness: null,
  field_defs: [
    { id: 'f1', name: 'Front', type: 'text', position: 0 },
    { id: 'f2', name: 'Back', type: 'text', position: 1 },
  ],
  cards: [],
};
const deckD2 = {
  id: 'd2',
  name: 'Spanish Vocab',
  subject_id: 's1',
  created_at: '',
  readiness: null,
  field_defs: [{ id: 'g1', name: 'Word', type: 'text', position: 0 }],
  cards: [],
};

const card1 = {
  id: 'c1',
  deck_id: 'd1',
  created_at: '',
  values: { f1: 'Bonjour', f2: 'Hello' },
};

function mockAll() {
  server.use(
    http.get(`${BASE}/api/decks`, () => HttpResponse.json(decks)),
    http.get(`${BASE}/api/decks/:id`, ({ params }) => {
      const data = params.id === 'd2' ? deckD2 : deckD1;
      return HttpResponse.json(data);
    }),
    http.get(`${BASE}/api/cards/:id`, () => HttpResponse.json(card1)),
  );
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

function renderForm(initialPath: string | { pathname: string; search?: string; state?: unknown }) {
  return renderWithProviders(
    <Routes>
      <Route path="/cards/new" element={<CardStandaloneForm mode="create" />} />
      <Route path="/cards/:cardId/edit" element={<CardStandaloneForm mode="edit" />} />
      <Route path="/decks/:deckId" element={<LocationProbe />} />
      <Route path="/library" element={<LocationProbe />} />
      <Route path="/decks/new" element={<LocationProbe />} />
      <Route path="/opener" element={<LocationProbe />} />
    </Routes>,
    [initialPath],
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

// Each address is asked for alone or not at all, so a landing on the deck's page shows the
// other address did not stand in for it.
describe.each([
  { mode: 'create', pathname: '/cards/new', leaveLabel: 'Create' },
  { mode: 'edit', pathname: '/cards/c1/edit', leaveLabel: 'Save' },
])('CardStandaloneForm — return addresses, $mode', ({ pathname, leaveLabel }) => {
  beforeEach(() => {
    mockAll();
    server.use(
      http.post(`${BASE}/api/cards`, () =>
        HttpResponse.json(
          { id: 'new-card', deck_id: 'd1', created_at: '', values: {} },
          { status: 201 },
        ),
      ),
    );
  });

  const open = async (search: string) => {
    renderForm({ pathname, search, state: { deckId: 'd1' } });
    await screen.findByRole('textbox', { name: 'Front' });
  };

  it.each([
    { given: 'cancelTo alone', search: '?cancelTo=%2Fopener', cancel: '/opener' },
    { given: 'returnTo alone', search: '?returnTo=%2Fopener', cancel: '/decks/d1' },
    { given: 'neither', search: '', cancel: '/decks/d1' },
  ])('with $given, Cancel lands on $cancel', async ({ search, cancel }) => {
    const user = userEvent.setup();
    await open(search);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe(cancel));
  });

  it.each([
    { given: 'cancelTo alone', search: '?cancelTo=%2Fopener', save: '/decks/d1' },
    { given: 'returnTo alone', search: '?returnTo=%2Fopener', save: '/opener' },
    { given: 'neither', search: '', save: '/decks/d1' },
  ])(`with $given, ${leaveLabel} lands on $save`, async ({ search, save }) => {
    const user = userEvent.setup();
    await open(search);

    await user.click(screen.getByRole('button', { name: leaveLabel }));

    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe(save));
  });

  it('a confirmed Cancel lands on cancelTo', async () => {
    const user = userEvent.setup();
    await open('?cancelTo=%2Fopener&returnTo=%2Fother');

    await user.type(screen.getByRole('textbox', { name: 'Front' }), 'x');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(await screen.findByRole('button', { name: 'Discard' }));

    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/opener'));
  });
});

describe('CardStandaloneForm — the heading and the bar', () => {
  it.each([
    { path: '/cards/new', heading: 'New card', leaveLabel: 'Create' },
    { path: '/cards/c1/edit', heading: 'Edit card', leaveLabel: 'Save' },
  ])(
    '$heading has its heading outside the bar, and Cancel and $leaveLabel in it',
    async ({ path, heading, leaveLabel }) => {
      mockAll();
      renderForm(path);

      const title = await screen.findByRole('heading', { name: heading });
      expect(title.closest('[data-reveal-clear]')).toBeNull();
      const bar = within(screen.getByTestId('form-bar'));
      expect(bar.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(bar.getByRole('button', { name: leaveLabel })).toBeInTheDocument();
    },
  );

  it('a failed Save puts its sentence in the bar', async () => {
    mockAll();
    server.use(
      http.patch(`${BASE}/api/cards/:id`, () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    renderForm('/cards/c1/edit');

    await user.type(await screen.findByRole('textbox', { name: 'Front' }), '!');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const bar = within(screen.getByTestId('form-bar'));
    expect(await bar.findByRole('alert')).toHaveTextContent(
      'Flashy is having trouble right now. Try again in a moment.',
    );
  });
});

describe('CardStandaloneForm — create mode', () => {
  it('with no decks yet, the picker still offers "New deck…" and leads to deck creation', async () => {
    server.use(http.get(`${BASE}/api/decks`, () => HttpResponse.json([])));
    const user = userEvent.setup();
    renderForm('/cards/new');

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: /New deck…/ }));

    // Both addresses ride the URL, not state — decoded via URLSearchParams, not compared
    // as an encoded string literal.
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/decks/new'));
    expect(screen.getByTestId('location')).toHaveAttribute('data-state', 'null');
    const locationEl = screen.getByTestId('location');
    const params = new URLSearchParams(locationEl.dataset.search);
    expect(params.get('cancelTo')).toBe('/cards/new');
    expect(params.get('returnTo')).toBe('/cards/new');
  });

  it('deck is preselected but still an editable combobox when opened with a deckId in location state', async () => {
    mockAll();
    renderForm({ pathname: '/cards/new', state: { deckId: 'd1' } });

    expect(await screen.findByRole('combobox')).toHaveValue('French Vocab');
    expect(await screen.findByRole('textbox', { name: 'Front' })).toBeInTheDocument();
  });

  it('Create is disabled until a deck is chosen', async () => {
    mockAll();
    renderForm('/cards/new');

    await screen.findByPlaceholderText('Deck');
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('picking a deck loads its fields; typing values and saving creates the card and navigates to the deck', async () => {
    mockAll();
    server.use(
      http.post(`${BASE}/api/cards`, async ({ request }) => {
        const body = (await request.json()) as { deck_id: string; values: Record<string, string> };
        expect(body.deck_id).toBe('d1');
        expect(body.values).toEqual({ f1: 'Bonjour', f2: 'Hello' });
        return HttpResponse.json(
          { id: 'new-card', deck_id: 'd1', created_at: '', values: body.values },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderForm('/cards/new');

    await user.click(screen.getByPlaceholderText('Deck'));
    await user.click(await screen.findByRole('option', { name: 'French Vocab' }));

    await user.type(await screen.findByRole('textbox', { name: 'Front' }), 'Bonjour');
    await user.type(screen.getByRole('textbox', { name: 'Back' }), 'Hello');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/decks/d1'));
  });

  it('changing deck after typing values prompts a confirm; confirming clears the form', async () => {
    mockAll();
    const user = userEvent.setup();
    renderForm('/cards/new');

    await user.click(screen.getByPlaceholderText('Deck'));
    await user.click(await screen.findByRole('option', { name: 'French Vocab' }));
    await user.type(await screen.findByRole('textbox', { name: 'Front' }), 'Bonjour');

    await user.click(screen.getByPlaceholderText('Deck'));
    await user.click(await screen.findByRole('option', { name: 'Spanish Vocab' }));

    expect(await screen.findByText('Change deck?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('textbox', { name: 'Word' })).toHaveValue('');
  });

  it('changing deck after typing values, then cancelling, reverts to the original deck with values intact', async () => {
    mockAll();
    const user = userEvent.setup();
    renderForm('/cards/new');

    await user.click(screen.getByPlaceholderText('Deck'));
    await user.click(await screen.findByRole('option', { name: 'French Vocab' }));
    await user.type(await screen.findByRole('textbox', { name: 'Front' }), 'Bonjour');

    await user.click(screen.getByPlaceholderText('Deck'));
    await user.click(await screen.findByRole('option', { name: 'Spanish Vocab' }));

    expect(await screen.findByText('Change deck?')).toBeInTheDocument();
    const dialogs = screen.getAllByRole('button', { name: 'Cancel' });
    await user.click(dialogs[dialogs.length - 1]!);

    expect(await screen.findByPlaceholderText('Deck')).toHaveValue('French Vocab');
    expect(screen.getByRole('textbox', { name: 'Front' })).toHaveValue('Bonjour');
  });

  it('changing deck with no typed values switches immediately, no confirm', async () => {
    mockAll();
    const user = userEvent.setup();
    renderForm('/cards/new');

    await user.click(screen.getByPlaceholderText('Deck'));
    await user.click(await screen.findByRole('option', { name: 'French Vocab' }));
    await user.click(screen.getByPlaceholderText('Deck'));
    await user.click(await screen.findByRole('option', { name: 'Spanish Vocab' }));

    expect(screen.queryByText('Change deck?')).not.toBeInTheDocument();
    expect(await screen.findByRole('textbox', { name: 'Word' })).toBeInTheDocument();
  });

  it('Cancel with no changes navigates back to /library when no deck is chosen', async () => {
    mockAll();
    const user = userEvent.setup();
    renderForm('/cards/new');

    await screen.findByPlaceholderText('Deck');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/library'));
  });

  it('with returnTo alone and no deck chosen, Cancel lands on /library', async () => {
    mockAll();
    const user = userEvent.setup();
    renderForm('/cards/new?returnTo=%2Fopener');

    await screen.findByPlaceholderText('Deck');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/library'));
  });

  it('an unsupported field type renders read-only and does not crash', async () => {
    server.use(
      http.get(`${BASE}/api/decks`, () => HttpResponse.json(decks)),
      http.get(`${BASE}/api/decks/:id`, () =>
        HttpResponse.json({
          ...deckD1,
          field_defs: [
            { id: 'f1', name: 'Front', type: 'text', position: 0 },
            { id: 'f3', name: 'Diagram', type: 'image', position: 1 },
          ],
        }),
      ),
    );
    renderForm({ pathname: '/cards/new', state: { deckId: 'd1' } });

    const input = await screen.findByRole('textbox', { name: /Diagram/ });
    expect(input).toHaveAttribute('readonly');
    expect(screen.getByText('Unsupported field type')).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('CardStandaloneForm — edit mode', () => {
  it('prefills from the existing card, with the deck locked', async () => {
    mockAll();
    renderForm('/cards/c1/edit');

    expect(await screen.findByText('French Vocab')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Deck')).not.toBeInTheDocument();
    expect(await screen.findByRole('textbox', { name: 'Front' })).toHaveValue('Bonjour');
    expect(screen.getByRole('textbox', { name: 'Back' })).toHaveValue('Hello');
  });

  it('sends only the changed field on submit and navigates back to the deck', async () => {
    mockAll();
    server.use(
      http.patch(`${BASE}/api/cards/:id`, async ({ request }) => {
        const body = (await request.json()) as { values: Record<string, string> };
        expect(body.values).toEqual({ f2: 'Salut' });
        return HttpResponse.json({ ...card1, values: { f1: 'Bonjour', f2: 'Salut' } });
      }),
    );
    const user = userEvent.setup();
    renderForm('/cards/c1/edit');

    const back = await screen.findByRole('textbox', { name: 'Back' });
    await user.clear(back);
    await user.type(back, 'Salut');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/decks/d1'));
  });

  it('Delete card confirms, then deletes and navigates back to the deck', async () => {
    mockAll();
    let deleteCalled = false;
    server.use(
      http.delete(`${BASE}/api/cards/:id`, () => {
        deleteCalled = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderForm('/cards/c1/edit');

    await user.click(await screen.findByRole('button', { name: 'Delete card' }));
    expect(await screen.findByText('Delete card?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(deleteCalled).toBe(true));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/decks/d1'));
  });

  it('shows a not-found message instead of crashing for a missing card', async () => {
    server.use(
      http.get(`${BASE}/api/decks`, () => HttpResponse.json(decks)),
      http.get(`${BASE}/api/cards/:id`, () =>
        HttpResponse.json({ detail: 'Card not found' }, { status: 404 }),
      ),
    );
    renderForm('/cards/nope/edit');

    expect(await screen.findByText('Card not found.')).toBeInTheDocument();
  });

  it('a load failure other than 404 says it could not load, not that it was not found', async () => {
    server.use(http.get(`${BASE}/api/decks`, () => HttpResponse.json(decks)));
    server.use(
      http.get(`${BASE}/api/cards/:id`, () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    );
    renderForm('/cards/c1/edit');

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this card.');
    expect(screen.queryByText('Card not found.')).not.toBeInTheDocument();
  });
});
