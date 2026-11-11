// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import DeckConfigurationEditor from 'src/components/library/DeckConfigurationEditor';
import { useViewParams } from 'src/lib/viewParams';

const BASE = 'http://localhost:8000';

const decks = [
  {
    id: 'd1',
    name: 'Alpha Deck',
    created_at: '',
    last_activity_at: '',
    card_count: 2,
    readiness: 0.5,
    field_names: [],
  },
  {
    id: 'd2',
    name: 'Beta Deck',
    created_at: '',
    last_activity_at: '',
    card_count: 2,
    readiness: 0.5,
    field_names: [],
  },
];

// The deck endpoint returns live fields only — a deleted field never reaches the
// client at all, which is why the builder can't show one.
const deckDetail = {
  id: 'd1',
  name: 'Alpha Deck',
  created_at: '',
  last_activity_at: '',
  readiness: null,
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
    http.get(`${BASE}/api/decks`, () => HttpResponse.json(decks)),
    http.get(`${BASE}/api/decks/:deckId`, ({ params }) =>
      params.deckId === deck.id
        ? HttpResponse.json(deck)
        : HttpResponse.json({
            ...deck,
            id: params.deckId as string,
            name: 'Beta Deck',
          }),
    ),
  );
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

/** The landing route's router state: what a Save handed back, if anything. */
function StateProbe() {
  const location = useLocation();
  return (
    <>
      <span data-testid="landed-path">{location.pathname}</span>
      <span data-testid="landed-state">{JSON.stringify(location.state)}</span>
    </>
  );
}

// Both addresses ride the URL, not state — decoded via URLSearchParams.get(), never
// compared as an encoded string literal.
function ReturnToProbe() {
  const { params } = useViewParams();
  return (
    <>
      <span data-testid="cancel-to">{params.get('cancelTo') ?? ''}</span>
      <span data-testid="return-to">{params.get('returnTo') ?? ''}</span>
    </>
  );
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

// The board's one interaction path: tap the chip, then tap a destination row in the
// sheet it opens. Sheet rows only ever offer the field's *other* four slots, so every
// call below must target a slot the field isn't already in.
const DESTINATION_LABELS: Record<string, string> = {
  prompt_fields: 'Prompt · always shown',
  prompt_pool: 'Prompt · random draw',
  answer_fields: 'Answer · always shown',
  answer_pool: 'Answer · random draw',
  unassigned: 'Not used',
};

async function assign(user: ReturnType<typeof userEvent.setup>, fieldName: string, slot: string) {
  await user.click(screen.getByRole('button', { name: `[${fieldName}]` }));
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

function mockConfig(config = savedConfig) {
  server.use(http.get(`${BASE}/api/deck_practice_configs/:id`, () => HttpResponse.json(config)));
}

/** The landing route's path and search, for a landing on a deck's Configurations tab. */
function FullLocationProbe() {
  const location = useLocation();
  return <span data-testid="full-location">{`${location.pathname}${location.search}`}</span>;
}

function renderAddressed(path: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/deck-configurations/new" element={<DeckConfigurationEditor mode="create" />} />
      <Route
        path="/deck-configurations/:configId/edit"
        element={<DeckConfigurationEditor mode="edit" />}
      />
      <Route path="/decks/:deckId" element={<FullLocationProbe />} />
      <Route path="/library" element={<FullLocationProbe />} />
      <Route path="/opener" element={<FullLocationProbe />} />
    </Routes>,
    [path],
  );
}

// Each address is asked for alone or not at all, so a landing on the default shows the
// other address did not stand in for it.
describe('DeckConfigurationEditor — return addresses', () => {
  const TAB = '/decks/d1?tab=configurations';

  it.each([
    { given: 'cancelTo alone', search: '&cancelTo=%2Fopener', cancel: '/opener' },
    { given: 'returnTo alone', search: '&returnTo=%2Fopener', cancel: TAB },
    { given: 'neither', search: '', cancel: TAB },
  ])('create with $given: Cancel lands on $cancel', async ({ search, cancel }) => {
    mockLibrary();
    const user = userEvent.setup();
    renderAddressed(`/deck-configurations/new?deck=d1${search}`);
    await screen.findByRole('region', { name: 'Not used' });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect((await screen.findByTestId('full-location')).textContent).toBe(cancel);
  });

  it.each([
    { given: 'cancelTo alone', search: '&cancelTo=%2Fopener', create: TAB },
    { given: 'returnTo alone', search: '&returnTo=%2Fopener', create: '/opener' },
    { given: 'neither', search: '', create: TAB },
  ])('create with $given: Create lands on $create', async ({ search, create }) => {
    mockLibrary();
    server.use(
      http.post(`${BASE}/api/deck_practice_configs`, () =>
        HttpResponse.json(savedConfig, { status: 201 }),
      ),
    );
    const user = userEvent.setup();
    renderAddressed(`/deck-configurations/new?deck=d1${search}`);
    await screen.findByRole('region', { name: 'Not used' });

    await assign(user, 'Term', 'prompt_fields');
    await assign(user, 'Meaning', 'answer_fields');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect((await screen.findByTestId('full-location')).textContent).toBe(create);
  });

  it.each([
    { given: 'cancelTo alone', full: '?cancelTo=%2Fopener', cancel: '/opener' },
    { given: 'returnTo alone', full: '?returnTo=%2Fopener', cancel: TAB },
    { given: 'neither', full: '', cancel: TAB },
  ])('edit with $given: Cancel lands on $cancel', async ({ full, cancel }) => {
    mockLibrary();
    mockConfig();
    const user = userEvent.setup();
    renderAddressed(`/deck-configurations/c1/edit${full}`);
    await screen.findByRole('region', { name: 'Not used' });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect((await screen.findByTestId('full-location')).textContent).toBe(cancel);
  });

  it.each([
    { given: 'cancelTo alone', full: '?cancelTo=%2Fopener', save: TAB },
    { given: 'returnTo alone', full: '?returnTo=%2Fopener', save: '/opener' },
    { given: 'neither', full: '', save: TAB },
  ])('edit with $given: Save lands on $save', async ({ full, save }) => {
    mockLibrary();
    mockConfig();
    server.use(
      http.patch(`${BASE}/api/deck_practice_configs/:id`, () => HttpResponse.json(savedConfig)),
    );
    const user = userEvent.setup();
    renderAddressed(`/deck-configurations/c1/edit${full}`);
    await screen.findByRole('region', { name: 'Not used' });

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect((await screen.findByTestId('full-location')).textContent).toBe(save);
  });

  it('with returnTo alone and no deck chosen, Cancel lands on /library', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderAddressed('/deck-configurations/new?returnTo=%2Fopener');
    await screen.findByPlaceholderText('Deck');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect((await screen.findByTestId('full-location')).textContent).toBe('/library');
  });
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

  it("each deck's row in the picker reads its name alone", async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate();

    await user.click(await screen.findByPlaceholderText('Deck'));
    const row = (await screen.findByText('Alpha Deck')).closest('[role="option"]') as HTMLElement;
    expect(row).toHaveTextContent(/^Alpha Deck$/);
    expect(screen.queryByText(/^Alpha$/)).not.toBeInTheDocument();
  });

  it('starts with every live field unassigned, in deck order', async () => {
    mockLibrary();
    renderCreate('/deck-configurations/new?deck=d1');

    const unused = await screen.findByRole('region', { name: 'Not used' });
    expect(within(unused).getByText('[Term]')).toBeInTheDocument();
    expect(within(unused).getByText('[Meaning]')).toBeInTheDocument();
    expect(within(unused).getByText('[Reading]')).toBeInTheDocument();
  });

  it('a deck in context is preselected, and the options keep the order the decks arrive in', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d2');

    const picker = await screen.findByPlaceholderText('Deck');
    await waitFor(() => expect(picker).toHaveValue('Beta Deck'));
    await user.click(picker);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveAccessibleName('Deck Alpha Deck');
    expect(options[1]).toHaveAccessibleName('Deck Beta Deck');
    expect(options[2]).toHaveAccessibleName('New deck…');
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
      ['/deck-configurations/new?deck=d1'],
    );

    await user.click(await screen.findByPlaceholderText('Deck'));
    await user.click(await screen.findByRole('option', { name: /New deck…/ }));

    expect(screen.getByTestId('cancel-to')).toHaveTextContent(
      '/deck-configurations/new?deck=d1',
    );
    expect(screen.getByTestId('return-to')).toHaveTextContent(
      '/deck-configurations/new?deck=d1',
    );
  });

  it('a returnTo the builder was entered with rides along when it opens "New deck…" (nested round trip)', async () => {
    mockLibrary();
    const user = userEvent.setup();
    // The builder itself was opened with a returnTo (e.g. from New practice) — its own
    // full location, not just the context params, is what must survive the next hop.
    const practiceReturnTo = '/practice/new?deck=d1';
    const builderParams = new URLSearchParams({ deck: 'd1', returnTo: practiceReturnTo });
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

    // Decoded via URLSearchParams.get(): each of the deck editor's addresses is the
    // builder's exact location, nested returnTo and all — nothing was dropped, and
    // nothing had to be hand-encoded or forwarded explicitly to make that true.
    expect(screen.getByTestId('cancel-to')).toHaveTextContent(builderPath);
    expect(screen.getByTestId('return-to')).toHaveTextContent(builderPath);
  });

  it('the name follows the board until it is typed in', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });
    const input = screen.getByLabelText('Name');

    // Empty while either side has no field.
    expect(input).toHaveValue('');
    await assign(user, 'Term', 'prompt_fields');
    expect(input).toHaveValue('');

    await assign(user, 'Meaning', 'answer_fields');
    expect(input).toHaveValue('Term → Meaning');

    await assign(user, 'Reading', 'answer_pool');
    expect(input).toHaveValue('Term → Meaning, Reading');
  });

  it('a typed name stays through further assignments', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });
    const input = screen.getByLabelText('Name');

    await assign(user, 'Term', 'prompt_fields');
    await user.type(input, 'Recall');
    await assign(user, 'Meaning', 'answer_fields');
    expect(input).toHaveValue('Recall');

    // Cleared is still the user's: it does not snap back to the derived name.
    await user.clear(input);
    expect(input).toHaveValue('');
    expect(screen.getByText('Give this configuration a name to create it.')).toBeInTheDocument();
  });

  it('a typed name survives a deck change', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });

    await assign(user, 'Term', 'prompt_fields');
    await user.type(screen.getByLabelText('Name'), 'Recall');

    await user.click(screen.getByPlaceholderText('Deck'));
    await user.click(await screen.findByRole('option', { name: /Beta Deck/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(screen.getByPlaceholderText('Deck')).toHaveValue('Beta Deck'));
    await screen.findByRole('region', { name: 'Not used' });
    expect(screen.getByLabelText('Name')).toHaveValue('Recall');
  });

  it('assigning moves a field rather than copying it', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });

    await assign(user, 'Term', 'prompt_fields');

    const unused = screen.getByRole('region', { name: 'Not used' });
    expect(within(unused).queryByText('[Term]')).not.toBeInTheDocument();
    expect(screen.getAllByText('[Term]')).toHaveLength(1);
  });

  it('tapping a chip opens a sheet offering the other four slots; choosing one moves it there', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });

    await user.click(screen.getByRole('button', { name: '[Term]' }));
    const sheet = await screen.findByRole('dialog', { name: 'Move "[Term]" to…' });
    expect(within(sheet).getAllByRole('button')).toHaveLength(4);

    await user.click(within(sheet).getByRole('button', { name: 'Prompt · always shown' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const promptAlways = screen.getByRole('region', { name: 'Prompt · always shown' });
    expect(within(promptAlways).getByRole('button', { name: '[Term]' })).toBeInTheDocument();
  });

  it('the random draw frequency row appears only once its area has a field, then lists 1…n', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });

    const promptRandom = screen.getByRole('region', { name: 'Prompt · random draw' });
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

  it('Create reads not ready with the reason shown, for each rule the backend enforces', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });
    const create = screen.getByRole('button', { name: 'Create' });

    expect(create).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Give this configuration a name to create it.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Name'), 'Recall');
    expect(screen.getByText(/prompt side needs at least one field/)).toBeInTheDocument();

    await assign(user, 'Term', 'prompt_fields');
    expect(screen.getByText(/answer side needs at least one field/)).toBeInTheDocument();

    await assign(user, 'Meaning', 'answer_pool');
    expect(screen.getByText(/how many random answer fields/)).toBeInTheDocument();
    expect(create).toHaveAttribute('aria-disabled', 'true');

    await user.click(screen.getByRole('checkbox', { name: '1' }));
    expect(create).not.toHaveAttribute('aria-disabled');

    await user.clear(screen.getByLabelText('Name'));
    expect(screen.getByText('Give this configuration a name to create it.')).toBeInTheDocument();
    expect(create).toHaveAttribute('aria-disabled', 'true');

    await user.type(screen.getByLabelText('Name'), 'Recall');
    expect(create).not.toHaveAttribute('aria-disabled');
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
    await user.click(screen.getByRole('button', { name: 'Create' }));

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

  it('a create returns to returnTo handing back the saved configuration', async () => {
    mockLibrary();
    server.use(
      http.post(`${BASE}/api/deck_practice_configs`, () =>
        HttpResponse.json({ ...savedConfig, id: 'c7' }, { status: 201 }),
      ),
    );
    const user = userEvent.setup();
    const params = new URLSearchParams({ deck: 'd1', returnTo: '/practice/new' });
    renderWithProviders(
      <Routes>
        <Route
          path="/deck-configurations/new"
          element={<DeckConfigurationEditor mode="create" />}
        />
        <Route path="/practice/new" element={<StateProbe />} />
      </Routes>,
      [`/deck-configurations/new?${params.toString()}`],
    );
    await screen.findByRole('region', { name: 'Not used' });

    await assign(user, 'Term', 'prompt_fields');
    await assign(user, 'Meaning', 'answer_fields');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByTestId('landed-path')).toHaveTextContent('/practice/new');
    expect(JSON.parse(screen.getByTestId('landed-state').textContent ?? 'null')).toEqual({
      configurationId: 'c7',
    });
  });

  it('renders a duplicate-name rejection on the name input, keeping the board', async () => {
    mockLibrary();
    server.use(
      http.post(`${BASE}/api/deck_practice_configs`, () =>
        HttpResponse.json(
          {
            detail: {
              code: 'configuration_name_taken',
              message: 'deck_practice_config (deck_id, name) already exists',
            },
          },
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
    await user.click(screen.getByRole('button', { name: 'Create' }));

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('A configuration with this name already exists.');
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(error.closest('[data-testid="form-bar"]')).toBeNull();
    // Still on the form, board intact.
    expect(screen.getByRole('region', { name: 'Not used' })).toBeInTheDocument();
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
  });

  it('renders a failed save in the bar, keeping the board', async () => {
    mockLibrary();
    server.use(
      http.post(`${BASE}/api/deck_practice_configs`, () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });

    await assign(user, 'Term', 'prompt_fields');
    await assign(user, 'Meaning', 'answer_fields');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    const bar = within(screen.getByTestId('form-bar'));
    expect(await bar.findByRole('alert')).toHaveTextContent(
      'Flashy is having trouble right now. Try again in a moment.',
    );
    expect(screen.getByRole('region', { name: 'Not used' })).toBeInTheDocument();
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
  });

  it('holds its heading outside the bar, and Cancel and Create in it', async () => {
    mockLibrary();
    renderCreate('/deck-configurations/new?deck=d1');

    const heading = await screen.findByRole('heading', { name: 'New configuration' });
    expect(heading.closest('[data-reveal-clear]')).toBeNull();
    const buttons = within(screen.getByTestId('form-bar')).getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual(['Cancel', 'Create']);
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
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      const unused = screen.getByRole('region', { name: 'Not used' });
      expect(within(unused).getByText('[Term]')).toBeInTheDocument();
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
    expect(within(unused).queryByText('[Term]')).not.toBeInTheDocument();
  });
});

describe('DeckConfigurationEditor — edit', () => {
  it('pre-populates the name and every row from the saved config', async () => {
    mockLibrary();
    mockConfig();
    const user = userEvent.setup();
    renderEdit();

    await screen.findByRole('region', { name: 'Not used' });
    expect(screen.getByLabelText('Name')).toHaveValue('Recall');
    expect(
      within(screen.getByRole('region', { name: 'Prompt · always shown' })).getByText('[Term]'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Answer · always shown' })).getByText('[Meaning]'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Not used' })).getByText('[Reading]'),
    ).toBeInTheDocument();

    // Edit mode keeps the stored name; the board never re-derives it.
    await assign(user, 'Reading', 'answer_fields');
    expect(screen.getByLabelText('Name')).toHaveValue('Recall');
  });

  it('a cleared name keeps Save not ready with the reason shown', async () => {
    mockLibrary();
    mockConfig();
    const user = userEvent.setup();
    renderEdit();
    await screen.findByRole('region', { name: 'Not used' });

    await user.clear(screen.getByLabelText('Name'));

    expect(screen.getByText('Give this configuration a name to save it.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('never shows a field the config references but the deck has since deleted', async () => {
    mockLibrary();
    mockConfig({ ...savedConfig, prompt_pool_ids: ['deleted-field'], prompt_pool_counts: [1] });
    renderEdit();

    await screen.findByRole('region', { name: 'Not used' });
    expect(screen.queryByText('deleted-field')).not.toBeInTheDocument();
    // The pool area is empty, so its frequency row has nothing to offer either.
    const promptRandom = screen.getByRole('region', { name: 'Prompt · random draw' });
    expect(within(promptRandom).getByText('None yet.')).toBeInTheDocument();
    expect(within(promptRandom).queryByText('Each card shows')).not.toBeInTheDocument();
  });

  it('pins the deck — a config cannot move between decks', async () => {
    mockLibrary();
    mockConfig();
    renderEdit();

    await screen.findByRole('region', { name: 'Not used' });
    expect(screen.queryByPlaceholderText('Deck')).not.toBeInTheDocument();
    expect(screen.getByText(/^Alpha Deck$/)).toBeInTheDocument();
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

  it('an edit’s Save returns to returnTo with no configuration handed back', async () => {
    mockLibrary();
    mockConfig();
    server.use(
      http.patch(`${BASE}/api/deck_practice_configs/:id`, () => HttpResponse.json(savedConfig)),
    );
    const user = userEvent.setup();
    const params = new URLSearchParams({ returnTo: '/practice/new' });
    renderWithProviders(
      <Routes>
        <Route
          path="/deck-configurations/:configId/edit"
          element={<DeckConfigurationEditor mode="edit" />}
        />
        <Route path="/practice/new" element={<StateProbe />} />
      </Routes>,
      [`/deck-configurations/c1/edit?${params.toString()}`],
    );
    await screen.findByRole('region', { name: 'Not used' });

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByTestId('landed-path')).toHaveTextContent('/practice/new');
    expect(screen.getByTestId('landed-state')).toHaveTextContent('null');
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

  it('a load failure other than 404 says it could not load, not that it was not found', async () => {
    mockLibrary();
    server.use(
      http.get(`${BASE}/api/deck_practice_configs/:id`, () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    );
    renderEdit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load this deck configuration.',
    );
    expect(screen.queryByText('Deck configuration not found.')).not.toBeInTheDocument();
  });
});

describe('DeckConfigurationEditor — bringing a part of the form and its sentence on screen', () => {
  let scrollBy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    scrollBy = vi.spyOn(window, 'scrollBy');
  });
  afterEach(() => scrollBy.mockRestore());

  const posted = () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(`${BASE}/api/deck_practice_configs`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ detail: 'boom' }, { status: 500 });
      }),
    );
    return bodies;
  };

  it('a tap of Create with a blank name on a chosen deck posts nothing and moves the page once', async () => {
    mockLibrary();
    const bodies = posted();
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });
    await assign(user, 'Term', 'prompt_fields');
    await assign(user, 'Meaning', 'answer_fields');
    await user.clear(screen.getByLabelText('Name'));

    const create = screen.getByRole('button', { name: 'Create' });
    expect(create).toHaveAttribute('aria-disabled', 'true');
    expect(create).not.toBeDisabled();
    await user.click(create);

    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(bodies).toEqual([]);
  });

  it('a tap of Create with a board not yet valid posts nothing and moves the page once', async () => {
    mockLibrary();
    const bodies = posted();
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });

    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(bodies).toEqual([]);
  });

  it("a blank name's sentence renders under the Name input, and says nothing on the board", async () => {
    mockLibrary();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });

    const sentence = screen.getByText('Give this configuration a name to create it.');
    expect(sentence.closest('[data-reveal-part]')).toContainElement(screen.getByLabelText('Name'));
    expect(screen.queryByText(/side needs at least one field/)).not.toBeInTheDocument();
  });

  it("a side's sentence renders in its side card, the card being the part", async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });
    await user.type(screen.getByLabelText('Name'), 'Recall');

    const side = screen.getByRole('region', { name: 'Prompt side' });
    const sentence = within(side).getByText(/prompt side needs at least one field/);
    const part = sentence.closest('[data-reveal-part]');
    expect(part).toContainElement(within(side).getByRole('heading', { name: 'Prompt side' }));
    expect(part).toContainElement(within(side).getByRole('heading', { name: 'Always shown' }));
    expect(part).toContainElement(within(side).getByRole('heading', { name: 'Random draw' }));
    expect(screen.queryByText(/answer side needs at least one field/)).not.toBeInTheDocument();
  });

  it('with the name and a side both wrong, a tap reveals the name, and once a name is typed the side', async () => {
    mockLibrary();
    const measured = vi.spyOn(Element.prototype, 'getBoundingClientRect');
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });
    const create = screen.getByRole('button', { name: 'Create' });

    await user.click(create);

    const nameSentence = screen.getByText('Give this configuration a name to create it.');
    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(measured.mock.contexts).toContain(nameSentence);
    expect(measured.mock.contexts).toContain(nameSentence.closest('[data-reveal-part]'));

    await user.type(screen.getByLabelText('Name'), 'Recall');
    measured.mockClear();
    await user.click(create);

    const sideSentence = screen.getByText(/prompt side needs at least one field/);
    expect(scrollBy).toHaveBeenCalledTimes(2);
    expect(measured.mock.contexts).toContain(sideSentence);
    expect(measured.mock.contexts).toContain(sideSentence.closest('[data-reveal-part]'));
    measured.mockRestore();
  });

  it('a "Check how many…" sentence renders inside its "Each card shows" row, and a tap reveals it', async () => {
    mockLibrary();
    const measured = vi.spyOn(Element.prototype, 'getBoundingClientRect');
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });
    await user.type(screen.getByLabelText('Name'), 'Recall');
    await assign(user, 'Term', 'prompt_fields');
    await assign(user, 'Meaning', 'answer_pool');

    const draw = screen.getByRole('region', { name: 'Answer · random draw' });
    const sentence = within(draw).getByText('Check how many random answer fields each card shows.');
    const part = sentence.closest('[data-reveal-part]');
    expect(part).toContainElement(within(draw).getByRole('checkbox', { name: '1' }));
    expect(part).toHaveTextContent('Each card shows');
    expect(part).not.toContainElement(within(draw).getByRole('heading', { name: 'Random draw' }));

    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(measured.mock.contexts).toContain(part);
    measured.mockRestore();
  });

  it('a tap of Create with no deck chosen says nothing and moves nothing', async () => {
    mockLibrary();
    const bodies = posted();
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new');
    const create = await screen.findByRole('button', { name: 'Create' });

    expect(create).toHaveAttribute('aria-disabled', 'true');
    await user.click(create);

    expect(scrollBy).not.toHaveBeenCalled();
    expect(bodies).toEqual([]);
  });

  it('a configuration_name_taken refusal moves the page once', async () => {
    mockLibrary();
    server.use(
      http.post(`${BASE}/api/deck_practice_configs`, () =>
        HttpResponse.json(
          {
            detail: {
              code: 'configuration_name_taken',
              message: 'deck_practice_config (deck_id, name) already exists',
            },
          },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });
    await assign(user, 'Term', 'prompt_fields');
    await assign(user, 'Meaning', 'answer_fields');

    await user.click(screen.getByRole('button', { name: 'Create' }));

    await screen.findByText('A configuration with this name already exists.');
    expect(scrollBy).toHaveBeenCalledTimes(1);
  });

  it('a failed save stays in the bar and moves nothing', async () => {
    mockLibrary();
    posted();
    const user = userEvent.setup();
    renderCreate('/deck-configurations/new?deck=d1');
    await screen.findByRole('region', { name: 'Not used' });
    await assign(user, 'Term', 'prompt_fields');
    await assign(user, 'Meaning', 'answer_fields');

    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await within(screen.getByTestId('form-bar')).findByRole('alert')).toBeInTheDocument();
    expect(scrollBy).not.toHaveBeenCalled();
  });
});
