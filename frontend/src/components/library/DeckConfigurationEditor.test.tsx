// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import DeckConfigurationEditor from 'src/components/library/DeckConfigurationEditor';

const BASE = 'http://localhost:8000';

const subjects = [
  {
    id: 's1',
    name: 'Alpha',
    icon: 'brain',
    description: '',
    user_id: 'u1',
    created_at: '',
    last_activity_at: '',
    deck_count: 1,
  },
  {
    id: 's2',
    name: 'Beta',
    icon: 'music',
    description: '',
    user_id: 'u1',
    created_at: '',
    last_activity_at: '',
    deck_count: 1,
  },
];

const decks = [
  {
    id: 'd1',
    subject_id: 's1',
    name: 'Alpha Deck',
    created_at: '',
    last_activity_at: '',
    card_count: 2,
    field_names: [],
  },
  {
    id: 'd2',
    subject_id: 's2',
    name: 'Beta Deck',
    created_at: '',
    last_activity_at: '',
    card_count: 2,
    field_names: [],
  },
];

// The deck endpoint returns live fields only — an archived field never reaches the
// client at all, which is why the builder can't show one.
const deckDetail = {
  id: 'd1',
  name: 'Alpha Deck',
  subject_id: 's1',
  created_at: '',
  last_activity_at: '',
  field_defs: [
    { id: 'f1', name: 'Term', type: 'text', position: 0 },
    { id: 'f2', name: 'Meaning', type: 'text', position: 1 },
    { id: 'f3', name: 'Reading', type: 'text', position: 2 },
  ],
  cards: [],
};

const savedConfig = {
  id: 'c1',
  deck_id: 'd1',
  name: 'Recall',
  created_at: '',
  prompt_field_ids: ['f1'],
  answer_field_ids: ['f2'],
  prompt_pool_ids: [] as string[],
  prompt_pool_counts: [] as number[],
  answer_pool_ids: [] as string[],
  answer_pool_counts: [] as number[],
};

function mockLibrary(deck: typeof deckDetail = deckDetail) {
  server.use(
    http.get(`${BASE}/api/subjects`, () => HttpResponse.json(subjects)),
    http.get(`${BASE}/api/decks`, () => HttpResponse.json(decks)),
    http.get(`${BASE}/api/decks/:deckId`, ({ params }) =>
      params.deckId === deck.id
        ? HttpResponse.json(deck)
        : HttpResponse.json({
            ...deck,
            id: params.deckId as string,
            name: 'Beta Deck',
            subject_id: 's2',
          }),
    ),
  );
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

// ADR 024: returnTo rides the URL, not state — decoded via URLSearchParams.get(),
// never compared as an encoded string literal.
function ReturnToProbe() {
  const [searchParams] = useSearchParams();
  return <span data-testid="return-to">{searchParams.get('returnTo') ?? ''}</span>;
}

function renderCreate(path = '/deck-configurations/new') {
  return renderWithProviders(
    <Routes>
      <Route path="/deck-configurations/new" element={<DeckConfigurationEditor mode="create" />} />
      <Route path="/decks/:deckId" element={<LocationProbe />} />
    </Routes>,
    [path],
  );
}

function renderEdit(configId = 'c1') {
  return renderWithProviders(
    <Routes>
      <Route
        path="/deck-configurations/:configId/edit"
        element={<DeckConfigurationEditor mode="edit" />}
      />
      <Route path="/decks/:deckId" element={<LocationProbe />} />
    </Routes>,
    [`/deck-configurations/${configId}/edit`],
  );
}

// The board's one interaction path (ADR 020): tap the chip, then tap a destination row
// in the sheet it opens. Sheet rows only ever offer the field's *other* four slots, so
// every call below must target a slot the field isn't already in.
const DESTINATION_LABELS: Record<string, string> = {
  prompt_fields: 'Prompt · always shown',
  prompt_pool: 'Prompt · random draw',
  answer_fields: 'Answer · always shown',
  answer_pool: 'Answer · random draw',
  unassigned: 'Not used',
};

async function assign(user: ReturnType<typeof userEvent.setup>, fieldName: string, slot: string) {
  await user.click(screen.getByRole('button', { name: fieldName }));
  const sheet = await screen.findByRole('dialog');
  await user.click(within(sheet).getByRole('button', { name: DESTINATION_LABELS[slot] }));
}

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  consoleError.mockRestore();
  server.resetHandlers();
});

describe('DeckConfigurationEditor — create', () => {
  it('shows nothing below the deck picker until a deck is chosen', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate();

    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Not used' })).not.toBeInTheDocument();

    await user.click(screen.getByPlaceholderText('Deck'));
    await user.click(await screen.findByRole('option', { name: /Alpha Deck/ }));

    expect(await screen.findByRole('region', { name: 'Not used' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('starts with every live field unassigned, in deck order', async () => {
    mockLibrary();
    renderCreate('/deck-configurations/new?deck=d1');

    const unused = await screen.findByRole('region', { name: 'Not used' });
    expect(within(unused).getByText('Term')).toBeInTheDocument();
    expect(within(unused).getByText('Meaning')).toBeInTheDocument();
    expect(within(unused).getByText('Reading')).toBeInTheDocument();
  });

  it("a deck in context is preselected, and its subject's decks sort first", async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?subject=s2');

    await user.click(await screen.findByPlaceholderText('Deck'));
    const options = screen.getAllByRole('option');
    // "New deck…" is last; the first real option belongs to the context subject.
    expect(options[0]).toHaveTextContent('Beta Deck');
  });

  it('starts on a deck handed back by the "New deck…" round-trip', async () => {
    mockLibrary();
    renderWithProviders(
      <Routes>
        <Route
          path="/deck-configurations/new"
          element={<DeckConfigurationEditor mode="create" />}
        />
      </Routes>,
      [{ pathname: '/deck-configurations/new', state: { deckId: 'd1' } }],
    );

    // Straight to the board: the deck came back from the editor, so there is nothing
    // left to pick.
    expect(await screen.findByRole('region', { name: 'Not used' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Deck')).toHaveValue('Alpha Deck');
  });

  it('"New deck…" hands the deck editor a return path that keeps the context params', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route
          path="/deck-configurations/new"
          element={<DeckConfigurationEditor mode="create" />}
        />
        <Route path="/decks/new" element={<ReturnToProbe />} />
      </Routes>,
      ['/deck-configurations/new?subject=s1'],
    );

    await user.click(await screen.findByPlaceholderText('Deck'));
    await user.click(await screen.findByRole('option', { name: /New deck…/ }));

    expect(screen.getByTestId('return-to')).toHaveTextContent(
      '/deck-configurations/new?subject=s1',
    );
  });

  it('a returnTo the builder was entered with rides along when it opens "New deck…" (nested round trip)', async () => {
    mockLibrary();
    const user = userEvent.setup();
    // The builder itself was opened with a returnTo (e.g. from New practice) — its own
    // full location, not just the context params, is what must survive the next hop.
    const practiceReturnTo = '/practice/new?subject=s1';
    const builderParams = new URLSearchParams({ subject: 's1', returnTo: practiceReturnTo });
    const builderPath = `/deck-configurations/new?${builderParams.toString()}`;
    renderWithProviders(
      <Routes>
        <Route
          path="/deck-configurations/new"
          element={<DeckConfigurationEditor mode="create" />}
        />
        <Route path="/decks/new" element={<ReturnToProbe />} />
      </Routes>,
      [builderPath],
    );

    await user.click(await screen.findByPlaceholderText('Deck'));
    await user.click(await screen.findByRole('option', { name: /New deck…/ }));

    // Decoded via URLSearchParams.get() (ADR 024): the deck editor's own returnTo is
    // the builder's exact location, nested returnTo and all — nothing was dropped, and
    // nothing had to be hand-encoded or forwarded explicitly to make that true.
    expect(screen.getByTestId('return-to')).toHaveTextContent(builderPath);
  });

  it('prefills the name with the current local date-time, editable', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });

    const input = screen.getByLabelText('Name');
    // Whatever the browser's zone renders, it is a real timestamp, not a placeholder.
    expect((input as HTMLInputElement).value).toMatch(/\d{4}/);
    expect((input as HTMLInputElement).value).not.toBe('');

    await user.clear(input);
    await user.type(input, 'Recall');
    expect(input).toHaveValue('Recall');
  });

  it('assigning moves a field rather than copying it', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });

    await assign(user, 'Term', 'prompt_fields');

    const unused = screen.getByRole('region', { name: 'Not used' });
    expect(within(unused).queryByText('Term')).not.toBeInTheDocument();
    expect(screen.getAllByText('Term')).toHaveLength(1);
  });

  it('tapping a chip opens a sheet offering the other four slots; choosing one moves it there', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });

    await user.click(screen.getByRole('button', { name: 'Term' }));
    const sheet = await screen.findByRole('dialog', { name: 'Move "Term" to…' });
    expect(within(sheet).getAllByRole('button')).toHaveLength(4);

    await user.click(within(sheet).getByRole('button', { name: 'Prompt · always shown' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const promptAlways = screen.getByRole('region', { name: 'Prompt side · Always shown' });
    expect(within(promptAlways).getByRole('button', { name: 'Term' })).toBeInTheDocument();
  });

  it('the random draw frequency row appears only once its area has a field, then lists 1…n', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });

    const promptRandom = screen.getByRole('region', { name: 'Prompt side · Random draw' });
    expect(within(promptRandom).getByText('None yet.')).toBeInTheDocument();
    expect(within(promptRandom).queryByText('Each card shows')).not.toBeInTheDocument();

    await assign(user, 'Term', 'prompt_pool');
    expect(within(promptRandom).getByText('Each card shows')).toBeInTheDocument();
    expect(within(promptRandom).getByRole('checkbox', { name: '1' })).toBeInTheDocument();

    await assign(user, 'Meaning', 'prompt_pool');
    expect(within(promptRandom).getByRole('checkbox', { name: '2' })).toBeInTheDocument();
  });

  it('prunes a checked count that no longer fits when the pool shrinks', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });

    await assign(user, 'Term', 'prompt_pool');
    await assign(user, 'Meaning', 'prompt_pool');
    await user.click(screen.getByRole('checkbox', { name: '2' }));
    expect(screen.getByRole('checkbox', { name: '2' })).toBeChecked();

    await assign(user, 'Meaning', 'unassigned');

    expect(screen.queryByRole('checkbox', { name: '2' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '1' })).not.toBeChecked();
  });

  it('Save stays disabled with the reason shown, for each rule the backend enforces', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });
    const save = screen.getByRole('button', { name: 'Save' });

    expect(save).toBeDisabled();
    expect(screen.getByText(/prompt side needs at least one field/)).toBeInTheDocument();

    await assign(user, 'Term', 'prompt_fields');
    expect(screen.getByText(/answer side needs at least one field/)).toBeInTheDocument();

    await assign(user, 'Meaning', 'answer_pool');
    expect(screen.getByText(/how many random answer fields/)).toBeInTheDocument();
    expect(save).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: '1' }));
    expect(save).toBeEnabled(); // the name arrives prefilled, so nothing is left to do

    await user.clear(screen.getByLabelText('Name'));
    expect(screen.getByText(/Give this config a name/)).toBeInTheDocument();
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText('Name'), 'Recall');
    expect(save).toBeEnabled();
  });

  it('saves the board as the six arrays, uuids only, and returns to the configs list', async () => {
    mockLibrary();
    let sent: Record<string, unknown> | null = null;
    server.use(
      http.post(`${BASE}/api/deck_practice_configs`, async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...savedConfig, ...sent }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });

    await assign(user, 'Term', 'prompt_fields');
    await assign(user, 'Meaning', 'answer_pool');
    await assign(user, 'Reading', 'answer_pool');
    await user.click(screen.getByRole('checkbox', { name: '2' }));
    await user.click(screen.getByRole('checkbox', { name: '1' }));
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Recall');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(sent).not.toBeNull());
    expect(sent).toEqual({
      deck_id: 'd1',
      name: 'Recall',
      prompt_field_ids: ['f1'],
      answer_field_ids: [],
      prompt_pool_ids: [],
      prompt_pool_counts: [],
      answer_pool_ids: ['f2', 'f3'],
      answer_pool_counts: [1, 2],
    });
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/decks/d1'));
  });

  it('renders a duplicate-name rejection on the name input, keeping the board', async () => {
    mockLibrary();
    server.use(
      http.post(`${BASE}/api/deck_practice_configs`, () =>
        HttpResponse.json(
          { detail: 'A configuration with this name already exists for this deck' },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });

    await assign(user, 'Term', 'prompt_fields');
    await assign(user, 'Meaning', 'answer_fields');
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Recall');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('already exists');
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    // Still on the form, board intact.
    expect(screen.getByRole('region', { name: 'Not used' })).toBeInTheDocument();
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
  });

  it('changing deck after assigning asks first, and clears the board on confirm', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });
    await assign(user, 'Term', 'prompt_fields');

    await user.click(screen.getByPlaceholderText('Deck'));
    await user.click(await screen.findByRole('option', { name: /Beta Deck/ }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Change deck' }));

    await waitFor(() => {
      const unused = screen.getByRole('region', { name: 'Not used' });
      expect(within(unused).getByText('Term')).toBeInTheDocument();
    });
  });

  it('cancelling the deck change keeps the deck and the board', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });
    await assign(user, 'Term', 'prompt_fields');

    await user.click(screen.getByPlaceholderText('Deck'));
    await user.click(await screen.findByRole('option', { name: /Beta Deck/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    const unused = screen.getByRole('region', { name: 'Not used' });
    expect(within(unused).queryByText('Term')).not.toBeInTheDocument();
  });
});

describe('DeckConfigurationEditor — edit', () => {
  function mockConfig(config = savedConfig) {
    server.use(http.get(`${BASE}/api/deck_practice_configs/:id`, () => HttpResponse.json(config)));
  }

  it('pre-populates the name and every row from the saved config', async () => {
    mockLibrary();
    mockConfig();
    renderEdit();

    await screen.findByRole('region', { name: 'Not used' });
    expect(screen.getByLabelText('Name')).toHaveValue('Recall');
    expect(
      within(screen.getByRole('region', { name: 'Prompt side · Always shown' })).getByText('Term'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Answer side · Always shown' })).getByText(
        'Meaning',
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Not used' })).getByText('Reading'),
    ).toBeInTheDocument();
  });

  it('never shows a field the config references but the deck has since archived', async () => {
    mockLibrary();
    mockConfig({ ...savedConfig, prompt_pool_ids: ['archived-field'], prompt_pool_counts: [1] });
    renderEdit();

    await screen.findByRole('region', { name: 'Not used' });
    expect(screen.queryByText('archived-field')).not.toBeInTheDocument();
    // The pool area is empty, so its frequency row has nothing to offer either.
    const promptRandom = screen.getByRole('region', { name: 'Prompt side · Random draw' });
    expect(within(promptRandom).getByText('None yet.')).toBeInTheDocument();
    expect(within(promptRandom).queryByText('Each card shows')).not.toBeInTheDocument();
  });

  it('pins the deck — a config cannot move between decks', async () => {
    mockLibrary();
    mockConfig();
    renderEdit();

    await screen.findByRole('region', { name: 'Not used' });
    expect(screen.queryByPlaceholderText('Deck')).not.toBeInTheDocument();
    expect(screen.getByText('Alpha · Alpha Deck')).toBeInTheDocument();
  });

  it('PATCHes the edited board back', async () => {
    mockLibrary();
    mockConfig();
    let sent: Record<string, unknown> | null = null;
    server.use(
      http.patch(`${BASE}/api/deck_practice_configs/:id`, async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...savedConfig, ...sent });
      }),
    );
    const user = userEvent.setup();
    renderEdit();
    await screen.findByRole('region', { name: 'Not used' });

    await assign(user, 'Reading', 'answer_fields');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(sent).not.toBeNull());
    expect(sent).toMatchObject({
      deck_id: 'd1',
      name: 'Recall',
      prompt_field_ids: ['f1'],
      answer_field_ids: ['f2', 'f3'],
    });
  });

  it('shows a not-found message instead of crashing for a missing config', async () => {
    mockLibrary();
    server.use(
      http.get(`${BASE}/api/deck_practice_configs/:id`, () =>
        HttpResponse.json({ detail: 'Deck configuration not found' }, { status: 404 }),
      ),
    );
    renderEdit('nope');

    expect(await screen.findByText('Deck configuration not found.')).toBeInTheDocument();
  });
});
