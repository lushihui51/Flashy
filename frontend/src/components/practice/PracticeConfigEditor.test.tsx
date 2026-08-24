// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import PracticeConfigEditor from 'src/components/practice/PracticeConfigEditor';

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

function LocationStateProbe() {
  const location = useLocation();
  return (
    <span data-testid="location-state">
      {(location.state as { returnTo?: string } | null)?.returnTo ?? ''}
    </span>
  );
}

function renderCreate(path = '/practice/configs/new') {
  return renderWithProviders(
    <Routes>
      <Route path="/practice/configs/new" element={<PracticeConfigEditor mode="create" />} />
      <Route path="/practice/configs" element={<LocationProbe />} />
    </Routes>,
    [path],
  );
}

function renderEdit(configId = 'c1') {
  return renderWithProviders(
    <Routes>
      <Route
        path="/practice/configs/:configId/edit"
        element={<PracticeConfigEditor mode="edit" />}
      />
      <Route path="/practice/configs" element={<LocationProbe />} />
    </Routes>,
    [`/practice/configs/${configId}/edit`],
  );
}

/** Both assignment paths exist (drag for a mouse, the select for touch/keyboard); the
 * select is the one every device has, so it's what the tests drive. */
async function assign(user: ReturnType<typeof userEvent.setup>, fieldName: string, slot: string) {
  await user.selectOptions(screen.getByLabelText(`Move ${fieldName}`), slot);
}

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  consoleError.mockRestore();
  server.resetHandlers();
});

describe('PracticeConfigEditor — create', () => {
  it('shows nothing below the deck picker until a deck is chosen', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate();

    expect(screen.queryByLabelText('Config name')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await user.click(screen.getByPlaceholderText('Deck'));
    await user.click(await screen.findByRole('option', { name: /Alpha Deck/ }));

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByLabelText('Config name')).toBeInTheDocument();
  });

  it('starts with every live field unassigned, in deck order', async () => {
    mockLibrary();
    renderCreate('/practice/configs/new?deck=d1');

    const unassigned = await screen.findByRole('region', { name: 'Unassigned' });
    expect(within(unassigned).getByText('Term')).toBeInTheDocument();
    expect(within(unassigned).getByText('Meaning')).toBeInTheDocument();
    expect(within(unassigned).getByText('Reading')).toBeInTheDocument();
  });

  it("a deck in context is preselected, and its subject's decks sort first", async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/practice/configs/new?subject=s2');

    await user.click(await screen.findByPlaceholderText('Deck'));
    const options = screen.getAllByRole('option');
    // "New deck…" is last; the first real option belongs to the context subject.
    expect(options[0]).toHaveTextContent('Beta Deck');
  });

  it('starts on a deck handed back by the "New deck…" round-trip', async () => {
    mockLibrary();
    renderWithProviders(
      <Routes>
        <Route path="/practice/configs/new" element={<PracticeConfigEditor mode="create" />} />
      </Routes>,
      [{ pathname: '/practice/configs/new', state: { deckId: 'd1' } }],
    );

    // Straight to the board: the deck came back from the editor, so there is nothing
    // left to pick.
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Deck')).toHaveValue('Alpha Deck');
  });

  it('"New deck…" hands the deck editor a return path that keeps the context params', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/practice/configs/new" element={<PracticeConfigEditor mode="create" />} />
        <Route path="/decks/new" element={<LocationStateProbe />} />
      </Routes>,
      ['/practice/configs/new?subject=s1'],
    );

    await user.click(await screen.findByPlaceholderText('Deck'));
    await user.click(await screen.findByRole('option', { name: /New deck…/ }));

    expect(screen.getByTestId('location-state')).toHaveTextContent(
      '/practice/configs/new?subject=s1',
    );
  });

  it('assigning moves a field rather than copying it', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/practice/configs/new?deck=d1');
    await screen.findByRole('table');

    await assign(user, 'Term', 'prompt_fields');

    const unassigned = screen.getByRole('region', { name: 'Unassigned' });
    expect(within(unassigned).queryByText('Term')).not.toBeInTheDocument();
    expect(screen.getAllByText('Term')).toHaveLength(1);
  });

  it('frequency reads N/A for the fixed rows and for an empty pool, then lists 1…n', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/practice/configs/new?deck=d1');
    await screen.findByRole('table');

    expect(screen.getAllByText('N/A')).toHaveLength(4); // all four rows start empty

    await assign(user, 'Term', 'prompt_pool');
    await assign(user, 'Meaning', 'prompt_pool');

    expect(screen.getByRole('checkbox', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '2' })).toBeInTheDocument();
    expect(screen.getAllByText('N/A')).toHaveLength(3);
  });

  it('prunes a checked count that no longer fits when the pool shrinks', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/practice/configs/new?deck=d1');
    await screen.findByRole('table');

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
    renderCreate('/practice/configs/new?deck=d1');
    await screen.findByRole('table');
    const save = screen.getByRole('button', { name: 'Save' });

    expect(save).toBeDisabled();
    expect(screen.getByText(/at least one prompt field/)).toBeInTheDocument();

    await assign(user, 'Term', 'prompt_fields');
    expect(screen.getByText(/at least one answer field/)).toBeInTheDocument();

    await assign(user, 'Meaning', 'answer_pool');
    expect(screen.getByText(/how many answer pool fields/)).toBeInTheDocument();
    expect(save).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: '1' }));
    expect(screen.getByText(/Give this config a name/)).toBeInTheDocument();
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText('Config name'), 'Recall');
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
    renderCreate('/practice/configs/new?deck=d1');
    await screen.findByRole('table');

    await assign(user, 'Term', 'prompt_fields');
    await assign(user, 'Meaning', 'answer_pool');
    await assign(user, 'Reading', 'answer_pool');
    await user.click(screen.getByRole('checkbox', { name: '2' }));
    await user.click(screen.getByRole('checkbox', { name: '1' }));
    await user.type(screen.getByLabelText('Config name'), 'Recall');
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
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/practice/configs'),
    );
  });

  it('renders a duplicate-name rejection on the name input, keeping the board', async () => {
    mockLibrary();
    server.use(
      http.post(`${BASE}/api/deck_practice_configs`, () =>
        HttpResponse.json(
          { detail: 'A practice config with this name already exists for this deck' },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderCreate('/practice/configs/new?deck=d1');
    await screen.findByRole('table');

    await assign(user, 'Term', 'prompt_fields');
    await assign(user, 'Meaning', 'answer_fields');
    await user.type(screen.getByLabelText('Config name'), 'Recall');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('already exists');
    expect(screen.getByLabelText('Config name')).toHaveAttribute('aria-invalid', 'true');
    // Still on the form, board intact.
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
  });

  it('changing deck after assigning asks first, and clears the board on confirm', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/practice/configs/new?deck=d1');
    await screen.findByRole('table');
    await assign(user, 'Term', 'prompt_fields');

    await user.click(screen.getByPlaceholderText('Deck'));
    await user.click(await screen.findByRole('option', { name: /Beta Deck/ }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Change deck' }));

    await waitFor(() => {
      const unassigned = screen.getByRole('region', { name: 'Unassigned' });
      expect(within(unassigned).getByText('Term')).toBeInTheDocument();
    });
  });

  it('cancelling the deck change keeps the deck and the board', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/practice/configs/new?deck=d1');
    await screen.findByRole('table');
    await assign(user, 'Term', 'prompt_fields');

    await user.click(screen.getByPlaceholderText('Deck'));
    await user.click(await screen.findByRole('option', { name: /Beta Deck/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    const unassigned = screen.getByRole('region', { name: 'Unassigned' });
    expect(within(unassigned).queryByText('Term')).not.toBeInTheDocument();
  });

  it('a dropped field lands in the row it was dropped on', async () => {
    mockLibrary();
    renderCreate('/practice/configs/new?deck=d1');
    await screen.findByRole('table');

    const { fireEvent } = await import('@testing-library/react');
    const data = new Map<string, string>();
    const dataTransfer = {
      setData: (type: string, value: string) => data.set(type, value),
      getData: (type: string) => data.get(type) ?? '',
    };

    fireEvent.dragStart(screen.getByText('Term').closest('span[draggable]')!, { dataTransfer });
    const promptRow = screen.getByRole('row', { name: /Prompt fields/ });
    fireEvent.drop(within(promptRow).getAllByRole('cell')[0]!.firstElementChild!, { dataTransfer });

    expect(within(promptRow).getByText('Term')).toBeInTheDocument();
  });
});

describe('PracticeConfigEditor — edit', () => {
  function mockConfig(config = savedConfig) {
    server.use(http.get(`${BASE}/api/deck_practice_configs/:id`, () => HttpResponse.json(config)));
  }

  it('pre-populates the name and every row from the saved config', async () => {
    mockLibrary();
    mockConfig();
    renderEdit();

    await screen.findByRole('table');
    expect(screen.getByLabelText('Config name')).toHaveValue('Recall');
    expect(
      within(screen.getByRole('row', { name: /Prompt fields/ })).getByText('Term'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('row', { name: /Answer fields/ })).getByText('Meaning'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Unassigned' })).getByText('Reading'),
    ).toBeInTheDocument();
  });

  it('never shows a field the config references but the deck has since archived', async () => {
    mockLibrary();
    mockConfig({ ...savedConfig, prompt_pool_ids: ['archived-field'], prompt_pool_counts: [1] });
    renderEdit();

    await screen.findByRole('table');
    expect(screen.queryByText('archived-field')).not.toBeInTheDocument();
    // The pool row is empty, so its frequency has nothing to offer either.
    const poolRow = screen.getByRole('row', { name: /Prompt pool/ });
    expect(within(poolRow).getByText('N/A')).toBeInTheDocument();
  });

  it('pins the deck — a config cannot move between decks', async () => {
    mockLibrary();
    mockConfig();
    renderEdit();

    await screen.findByRole('table');
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
    await screen.findByRole('table');

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
        HttpResponse.json({ detail: 'Practice config not found' }, { status: 404 }),
      ),
    );
    renderEdit('nope');

    expect(await screen.findByText('Practice config not found.')).toBeInTheDocument();
  });
});
