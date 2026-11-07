// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import DeckEditor from 'src/components/library/DeckEditor';

const BASE = 'http://localhost:8000';

const subjects = [
  {
    id: 's1',
    name: 'Math',
    icon: 'brain',
    description: '',
    user_id: 'u1',
    created_at: '',
    deck_count: 1,
    readiness: 0.5,
  },
];

function mockSubjects() {
  server.use(http.get(`${BASE}/api/subjects`, () => HttpResponse.json(subjects)));
}

const mathSubject = {
  id: 's1',
  name: 'Math',
  icon: 'brain',
  description: '',
  user_id: 'u1',
  created_at: '',
  last_activity_at: '',
  deck_count: 1,
  readiness: 0.5,
};

const deckDetail = {
  id: 'd1',
  name: 'French Vocab',
  subject_id: 's1',
  created_at: '',
  last_activity_at: '',
  readiness: 0.5,
  field_defs: [
    { id: 'front-id', name: 'Front', type: 'text', position: 0 },
    { id: 'back-id', name: 'Back', type: 'text', position: 1 },
  ],
  cards: [
    {
      id: 'card-1',
      deck_id: 'd1',
      created_at: '',
      values: { 'front-id': 'Bonjour', 'back-id': 'Hello' },
      readiness: 0.5,
    },
  ],
};

function mockEditDeck(data: typeof deckDetail = deckDetail) {
  server.use(
    http.get(`${BASE}/api/subjects`, () => HttpResponse.json(subjects)),
    http.get(`${BASE}/api/subjects/:id`, () => HttpResponse.json(mathSubject)),
    http.get(`${BASE}/api/decks/:id`, () => HttpResponse.json(data)),
  );
}

function renderEditDeck(deckId = 'd1', search = '') {
  return renderWithProviders(
    <Routes>
      <Route path="/decks/:deckId/edit" element={<DeckEditor mode="edit" />} />
      <Route path="/decks/:deckId" element={<LocationProbe />} />
      <Route path="/subjects/:subjectId" element={<LocationProbe />} />
    </Routes>,
    [`/decks/${deckId}/edit${search}`],
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

function renderEditor(initialPath = '/decks/new') {
  return renderWithProviders(
    <Routes>
      <Route path="/decks/new" element={<DeckEditor mode="create" />} />
      <Route path="/decks/:deckId" element={<LocationProbe />} />
      <Route path="/library" element={<LocationProbe />} />
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

describe('DeckEditor — create mode', () => {
  it('starts with Term and Definition fields and a Create that reads not ready', async () => {
    mockSubjects();
    renderEditor();

    expect(await screen.findByDisplayValue('Term')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Definition')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('the field type select offers only Text', async () => {
    mockSubjects();
    renderEditor();

    const selects = await screen.findAllByRole('combobox', { name: 'Field type' });
    for (const select of selects) {
      expect(within(select).getAllByRole('option')).toHaveLength(1);
      expect(select).toHaveValue('text');
    }
  });

  it('remove is disabled on both fields once only two remain (D3)', async () => {
    mockSubjects();
    renderEditor();

    await screen.findByDisplayValue('Term');
    // The default deck already starts at the two-field floor.
    expect(screen.getByRole('button', { name: 'Remove Term' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove Definition' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove Term' })).toHaveAttribute(
      'title',
      'A deck needs at least two fields.',
    );
  });

  it('adding a third field re-enables remove; removing back down to two disables both again', async () => {
    mockSubjects();
    const user = userEvent.setup();
    renderEditor();

    await screen.findByDisplayValue('Term');
    await user.click(screen.getByRole('button', { name: 'Add field' }));
    expect(screen.getByRole('button', { name: 'Remove Term' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Remove Term' }));
    expect(screen.getByRole('button', { name: 'Remove Definition' })).toBeDisabled();
  });

  it("a field's Move up button reorders the fields", async () => {
    mockSubjects();
    const user = userEvent.setup();
    renderEditor();

    await screen.findByDisplayValue('Term');
    await user.click(screen.getByRole('button', { name: 'Move Definition up' }));

    const nameInputs = screen.getAllByRole('textbox', { name: 'Field name' });
    expect(nameInputs.map((i) => (i as HTMLInputElement).value)).toEqual(['Definition', 'Term']);
  });

  it('duplicate field names show an inline error', async () => {
    mockSubjects();
    const user = userEvent.setup();
    renderEditor();

    const [, second] = await screen.findAllByRole('textbox', { name: 'Field name' });
    await user.clear(second!);
    await user.type(second!, 'Term');

    // Both the original "Term" and the renamed field now collide — both flagged.
    expect(await screen.findAllByText('Duplicate name')).toHaveLength(2);
  });

  it('a blank field name shows an inline error', async () => {
    mockSubjects();
    const user = userEvent.setup();
    renderEditor();

    const [first] = await screen.findAllByRole('textbox', { name: 'Field name' });
    await user.clear(first!);

    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
  });

  it('removing a brand-new field (no confirm — create mode never has a saved field to stage)', async () => {
    mockSubjects();
    const user = userEvent.setup();
    renderEditor();

    await screen.findByDisplayValue('Term');
    // A third field so Remove is enabled (it is disabled at two, a deck's minimum).
    await user.click(screen.getByRole('button', { name: 'Add field' }));

    await user.click(screen.getByRole('button', { name: 'Remove Term' }));

    // Gone outright — no confirm, no struck-through row (only a *saved* field stages;
    // create mode never has one).
    expect(screen.queryByText(/Remove "Term"\?/)).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Term')).not.toBeInTheDocument();
  });

  it('subject is preselected but still an editable combobox when opened with a subject in location state', async () => {
    mockSubjects();
    renderWithProviders(
      <Routes>
        <Route path="/decks/new" element={<DeckEditor mode="create" />} />
      </Routes>,
      [{ pathname: '/decks/new', state: { subject: { id: 's1', name: 'Math', icon: 'brain' } } }],
    );

    expect(await screen.findByPlaceholderText('Subject')).toHaveValue('Math');
  });

  it('subject is an editable combobox when opened with no contextual subject', async () => {
    mockSubjects();
    renderEditor();

    expect(await screen.findByPlaceholderText('Subject')).toBeInTheDocument();
  });

  it('"New subject…" opens the create overlay; cancel leaves the selection unchanged', async () => {
    mockSubjects();
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/decks/new" element={<DeckEditor mode="create" />} />
      </Routes>,
      [{ pathname: '/decks/new', state: { subject: { id: 's1', name: 'Math', icon: 'brain' } } }],
    );

    await user.click(await screen.findByPlaceholderText('Subject'));
    await user.click(await screen.findByRole('option', { name: /New subject…/ }));

    const dialog = await screen.findByRole('dialog', { name: 'New subject' });
    // Scoped to the dialog: the editor's own bar has a Cancel button too.
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog', { name: 'New subject' })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Subject')).toHaveValue('Math');
  });

  it('the New subject overlay has a bar of its own, with its heading outside it', async () => {
    mockSubjects();
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/decks/new" element={<DeckEditor mode="create" />} />
      </Routes>,
      ['/decks/new'],
    );

    await user.click(await screen.findByPlaceholderText('Subject'));
    await user.click(await screen.findByRole('option', { name: /New subject…/ }));

    const dialog = await screen.findByRole('dialog', { name: 'New subject' });
    const heading = within(dialog).getByRole('heading', { name: 'New subject' });
    expect(heading.closest('[data-reveal-clear]')).toBeNull();
    const bar = within(within(dialog).getByTestId('form-bar'));
    expect(bar.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(bar.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('creating a subject in the overlay selects it immediately, without waiting for a refetch', async () => {
    mockSubjects();
    server.use(
      http.post(`${BASE}/api/subjects`, () =>
        HttpResponse.json(
          {
            id: 's3',
            name: 'History',
            icon: 'book-open',
            description: '',
            user_id: 'u1',
            created_at: '',
          },
          { status: 201 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderEditor();

    await user.click(await screen.findByPlaceholderText('Subject'));
    await user.click(await screen.findByRole('option', { name: /New subject…/ }));

    const dialog = await screen.findByRole('dialog', { name: 'New subject' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'History');
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(screen.getByPlaceholderText('Subject')).toHaveValue('History'));
    expect(screen.queryByRole('dialog', { name: 'New subject' })).not.toBeInTheDocument();
  });

  it('the Icon control inside the New subject overlay opens the picker', async () => {
    mockSubjects();
    const user = userEvent.setup();
    renderEditor();

    await user.click(await screen.findByPlaceholderText('Subject'));
    await user.click(await screen.findByRole('option', { name: /New subject…/ }));

    const overlay = await screen.findByRole('dialog', { name: 'New subject' });
    await user.click(within(overlay).getByRole('button', { name: 'Icon: Open book' }));

    // From screen: the overlay is aria-hidden while the picker is open over it.
    const picker = await screen.findByRole('dialog', { name: 'Icon' });
    await user.click(within(picker).getByRole('button', { name: 'Atom' }));

    expect(screen.queryByRole('dialog', { name: 'Icon' })).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('dialog', { name: 'New subject' })).getByRole('button', {
        name: 'Icon: Atom',
      }),
    ).toBeInTheDocument();
  });

  it('opened via a "New deck…" round-trip: Create navigates to returnTo with the new deck id', async () => {
    mockSubjects();
    server.use(
      http.post(`${BASE}/api/decks`, async () => HttpResponse.json({ id: 'd9' }, { status: 201 })),
    );
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/decks/new" element={<DeckEditor mode="create" />} />
        <Route path="/cards/new" element={<LocationProbe />} />
      </Routes>,
      // Both addresses ride the URL, not state; a different cancelTo shows Create ignores it.
      ['/decks/new?cancelTo=%2Flibrary&returnTo=%2Fcards%2Fnew'],
    );

    await user.type(screen.getByRole('textbox', { name: 'Deck name' }), 'Spanish Basics');
    await user.click(screen.getByPlaceholderText('Subject'));
    await user.click(await screen.findByRole('option', { name: 'Math' }));
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/cards/new'));
    expect(screen.getByTestId('location')).toHaveAttribute(
      'data-state',
      JSON.stringify({ deckId: 'd9' }),
    );
  });

  it('opened via a "New deck…" round-trip: Cancel with no changes navigates to cancelTo with no state', async () => {
    mockSubjects();
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/decks/new" element={<DeckEditor mode="create" />} />
        <Route path="/cards/new" element={<LocationProbe />} />
      </Routes>,
      // A different returnTo shows Cancel ignores it.
      ['/decks/new?cancelTo=%2Fcards%2Fnew&returnTo=%2Flibrary'],
    );

    await screen.findByDisplayValue('Term');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/cards/new'));
    expect(screen.getByTestId('location')).toHaveAttribute('data-state', 'null');
  });

  it('a confirmed Cancel navigates to cancelTo', async () => {
    mockSubjects();
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/decks/new" element={<DeckEditor mode="create" />} />
        <Route path="/cards/new" element={<LocationProbe />} />
      </Routes>,
      ['/decks/new?cancelTo=%2Fcards%2Fnew'],
    );

    await user.type(screen.getByRole('textbox', { name: 'Deck name' }), 'Spanish Basics');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(await screen.findByRole('button', { name: 'Discard' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/cards/new'));
  });

  it('with returnTo alone, Cancel lands on /library — returnTo never stands in for cancelTo', async () => {
    mockSubjects();
    const user = userEvent.setup();
    renderEditor('/decks/new?returnTo=%2Fcards%2Fnew');

    await screen.findByDisplayValue('Term');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/library'));
  });

  it('with cancelTo alone, Create lands on the new deck — cancelTo never stands in for returnTo', async () => {
    mockSubjects();
    server.use(
      http.post(`${BASE}/api/decks`, async () => HttpResponse.json({ id: 'd9' }, { status: 201 })),
    );
    const user = userEvent.setup();
    renderEditor('/decks/new?cancelTo=%2Fsubjects%2Fs1');

    await user.type(screen.getByRole('textbox', { name: 'Deck name' }), 'Spanish Basics');
    await user.click(screen.getByPlaceholderText('Subject'));
    await user.click(await screen.findByRole('option', { name: 'Math' }));
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/decks/d9'));
    expect(screen.getByTestId('location')).toHaveAttribute('data-state', 'null');
  });

  it('a non-internal cancelTo is treated as absent — Cancel falls back to /library', async () => {
    mockSubjects();
    const user = userEvent.setup();
    renderEditor('/decks/new?cancelTo=https%3A%2F%2Fevil.com');

    await screen.findByDisplayValue('Term');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/library'));
  });

  it('a non-internal returnTo is treated as absent — Create falls back to the new deck', async () => {
    mockSubjects();
    server.use(
      http.post(`${BASE}/api/decks`, async () => HttpResponse.json({ id: 'd9' }, { status: 201 })),
    );
    const user = userEvent.setup();
    renderEditor('/decks/new?returnTo=https%3A%2F%2Fevil.com');

    await user.type(screen.getByRole('textbox', { name: 'Deck name' }), 'Spanish Basics');
    await user.click(screen.getByPlaceholderText('Subject'));
    await user.click(await screen.findByRole('option', { name: 'Math' }));
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/decks/d9'));
  });

  it('saves name, subject and fields — no cards field at all — and lands on the new deck', async () => {
    mockSubjects();
    server.use(
      http.post(`${BASE}/api/decks`, async ({ request }) => {
        const body = (await request.json()) as {
          name: string;
          subject_id: string;
          field_defs: { name: string; type: string }[];
        };
        expect(body.name).toBe('Spanish Basics');
        expect(body.subject_id).toBe('s1');
        expect(body.field_defs).toEqual([
          { name: 'Word', type: 'text' },
          { name: 'Definition', type: 'text' },
        ]);
        // A deck is born with a schema and no content — the first card is added from
        // the new deck's own card list. The create contract has no `cards` field at all.
        expect(body).not.toHaveProperty('cards');
        return HttpResponse.json({ id: 'd1' }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderEditor();

    await user.type(screen.getByRole('textbox', { name: 'Deck name' }), 'Spanish Basics');
    await user.click(screen.getByPlaceholderText('Subject'));
    await user.click(await screen.findByRole('option', { name: 'Math' }));

    const [termInput] = await screen.findAllByRole('textbox', { name: 'Field name' });
    await user.clear(termInput!);
    await user.type(termInput!, 'Word');

    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/decks/d1'));
  });

  it('Cancel with no changes navigates to /library immediately', async () => {
    mockSubjects();
    const user = userEvent.setup();
    renderEditor();

    await screen.findByDisplayValue('Term');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/library'));
  });

  it('Cancel after typing prompts a discard confirm', async () => {
    mockSubjects();
    const user = userEvent.setup();
    renderEditor();

    await user.type(screen.getByRole('textbox', { name: 'Deck name' }), 'x');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByText('Discard this deck?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/library'));
  });

  it('has no Delete deck button — create mode has nothing saved to delete', async () => {
    mockSubjects();
    renderEditor();

    await screen.findByDisplayValue('Term');
    expect(screen.queryByRole('button', { name: 'Delete deck' })).not.toBeInTheDocument();
  });
});

describe('DeckEditor — edit mode', () => {
  it('prefills name, subject and fields — and shows no cards, which live on the deck page', async () => {
    mockEditDeck();
    renderEditDeck();

    expect(await screen.findByDisplayValue('French Vocab')).toBeInTheDocument();
    expect(await screen.findByPlaceholderText('Subject')).toHaveValue('Math');
    expect(screen.getByDisplayValue('Front')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Back')).toBeInTheDocument();
    expect(screen.queryByText('Bonjour')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /card/i })).not.toBeInTheDocument();
  });

  it('shows a not-found message instead of crashing for a missing deck', async () => {
    server.use(
      http.get(`${BASE}/api/decks/:id`, () =>
        HttpResponse.json({ detail: 'Deck not found' }, { status: 404 }),
      ),
    );
    renderEditDeck();

    expect(await screen.findByText('Deck not found.')).toBeInTheDocument();
  });

  it('a load failure other than 404 says it could not load, not that it was not found', async () => {
    mockEditDeck();
    server.use(
      http.get(`${BASE}/api/decks/:id`, () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    );
    renderEditDeck();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this deck.');
    expect(screen.queryByText('Deck not found.')).not.toBeInTheDocument();
  });

  it('remove is disabled once only two fields remain, same as create mode (D3)', async () => {
    mockEditDeck();
    renderEditDeck();

    await screen.findByDisplayValue('French Vocab');
    expect(screen.getByRole('button', { name: 'Remove Front' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove Back' })).toBeDisabled();
  });

  it('change nothing: Save reads not ready and Undo starts disabled (nothing to save/undo)', async () => {
    mockEditDeck();
    renderEditDeck();

    await screen.findByDisplayValue('French Vocab');
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });

  it('the bar reads Done, Undo, Save when clean, and Cancel, Undo, Save once a field is renamed', async () => {
    mockEditDeck();
    const user = userEvent.setup();
    renderEditDeck();

    await screen.findByDisplayValue('French Vocab');
    const barButtons = () =>
      within(screen.getByTestId('form-bar'))
        .getAllByRole('button')
        .map((button) => button.textContent);
    expect(barButtons()).toEqual(['Done', 'Undo', 'Save']);

    const [firstField] = screen.getAllByRole('textbox', { name: 'Field name' });
    await user.type(firstField!, 'x');

    expect(barButtons()).toEqual(['Cancel', 'Undo', 'Save']);
  });

  it('New deck has only Cancel and Create in the bar', async () => {
    mockSubjects();
    renderWithProviders(
      <Routes>
        <Route path="/decks/new" element={<DeckEditor mode="create" />} />
      </Routes>,
      ['/decks/new'],
    );

    const buttons = within(await screen.findByTestId('form-bar')).getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual(['Cancel', 'Create']);
  });

  it('the bar reads Done (not Cancel) when the editor is clean; Done exits with no prompt', async () => {
    mockEditDeck();
    const user = userEvent.setup();
    renderEditDeck();

    await screen.findByDisplayValue('French Vocab');
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Done' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/decks/d1'));
    expect(screen.queryByText('Discard this deck?')).not.toBeInTheDocument();
  });

  it('the bar switches to Cancel once dirty, and Cancel still prompts to discard', async () => {
    mockEditDeck();
    const user = userEvent.setup();
    renderEditDeck();

    const nameInput = await screen.findByDisplayValue('French Vocab');
    await user.type(nameInput, ' II');
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText('Discard this deck?')).toBeInTheDocument();
  });

  it('a confirmed Cancel goes to cancelTo, ignoring returnTo', async () => {
    mockEditDeck();
    const user = userEvent.setup();
    renderEditDeck('d1', '?cancelTo=%2Fsubjects%2Fs1&returnTo=%2Fdecks%2Fother');

    await user.type(await screen.findByDisplayValue('French Vocab'), ' II');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(await screen.findByRole('button', { name: 'Discard' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/subjects/s1'));
  });

  it('with returnTo alone, a confirmed Cancel lands on the deck’s page', async () => {
    mockEditDeck();
    const user = userEvent.setup();
    renderEditDeck('d1', '?returnTo=%2Fsubjects%2Fs1');

    await user.type(await screen.findByDisplayValue('French Vocab'), ' II');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(await screen.findByRole('button', { name: 'Discard' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/decks/d1'));
  });

  it('Done goes to returnTo, ignoring cancelTo', async () => {
    mockEditDeck();
    const user = userEvent.setup();
    renderEditDeck('d1', '?cancelTo=%2Fdecks%2Fother&returnTo=%2Fsubjects%2Fs1');

    await screen.findByDisplayValue('French Vocab');
    await user.click(screen.getByRole('button', { name: 'Done' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/subjects/s1'));
  });

  it('with cancelTo alone, Done lands on the deck’s page', async () => {
    mockEditDeck();
    const user = userEvent.setup();
    renderEditDeck('d1', '?cancelTo=%2Fsubjects%2Fs1');

    await screen.findByDisplayValue('French Vocab');
    await user.click(screen.getByRole('button', { name: 'Done' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/decks/d1'));
  });

  it('Undo reverts a mix of edits (rename + added field + field removal) in one click', async () => {
    mockEditDeck();
    const user = userEvent.setup();
    renderEditDeck();

    const nameInput = await screen.findByDisplayValue('French Vocab');
    await user.type(nameInput, ' II');
    await user.click(screen.getByRole('button', { name: 'Add field' })); // 3 fields, so Remove is enabled
    await user.click(screen.getByRole('button', { name: 'Remove Back' }));

    expect(screen.getByDisplayValue('French Vocab II')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Back')).toBeDisabled(); // staged, struck through

    await user.click(screen.getByRole('button', { name: 'Undo' }));

    expect(screen.getByDisplayValue('French Vocab')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Back')).toBeEnabled();
    expect(screen.queryAllByDisplayValue('')).toHaveLength(0); // the added blank field is gone too
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });

  it('a staged row has no interactive control of its own (only the global Undo reverses it)', async () => {
    mockEditDeck();
    const user = userEvent.setup();
    renderEditDeck();

    await screen.findByDisplayValue('French Vocab');
    await user.click(screen.getByRole('button', { name: 'Add field' })); // 3 fields, so Remove is enabled
    await user.click(screen.getByRole('button', { name: 'Remove Back' }));

    expect(screen.queryByRole('button', { name: 'Remove Back' })).not.toBeInTheDocument();
    expect(screen.queryByText(/will be removed on save/i)).not.toBeInTheDocument();
    // exactly one Undo in the whole page — the global one, not a per-row one
    expect(screen.getAllByRole('button', { name: 'Undo' })).toHaveLength(1);
  });

  it('rename, add a field, stage a field removal, reorder — Save sends the exact diff and stays on the page', async () => {
    mockEditDeck();
    server.use(
      http.get(`${BASE}/api/deletion-impact`, () =>
        HttpResponse.json({
          subjects_deleted: 0,
          decks_deleted: 0,
          fields_deleted: 1,
          cards_deleted: 0,
          cards_affected: 1,
          configurations_deleted: 2,
          runs_deleted: 1,
        }),
      ),
    );
    let patchCallCount = 0;
    server.use(
      http.patch(`${BASE}/api/decks/:id`, async ({ request }) => {
        patchCallCount += 1;
        const body = (await request.json()) as {
          name?: string;
          field_defs?: {
            create: { client_key: string; name: string; type: string }[];
            update: { id: string; name?: string; type?: string }[];
            delete: string[];
            order: string[];
          };
          cards?: unknown;
        };
        expect(body.name).toBe('Vocab Renamed');
        expect(body.field_defs?.create).toEqual([
          { client_key: expect.any(String), name: 'Notes', type: 'text' },
        ]);
        expect(body.field_defs?.update).toEqual([]);
        expect(body.field_defs?.delete).toEqual(['back-id']);
        const notesKey = body.field_defs!.create[0]!.client_key;
        expect(body.field_defs?.order).toEqual(['front-id', notesKey]);
        // Card entry left this form entirely — a deck edit never carries card ops.
        expect(body.cards).toBeUndefined();
        return HttpResponse.json({
          ...deckDetail,
          name: body.name,
          field_defs: [
            { id: 'front-id', name: 'Front', type: 'text', position: 0 },
            { id: 'notes-id', name: 'Notes', type: 'text', position: 1 },
          ],
        });
      }),
    );
    const user = userEvent.setup();
    renderEditDeck();

    const nameInput = await screen.findByDisplayValue('French Vocab');
    await user.clear(nameInput);
    await user.type(nameInput, 'Vocab Renamed');

    // Add a field, so the two-field floor allows staging one for removal.
    await user.click(screen.getByRole('button', { name: 'Add field' }));
    const [, , newFieldInput] = screen.getAllByRole('textbox', { name: 'Field name' });
    await user.type(newFieldInput!, 'Notes');

    // Reorder: move Front down below Back, then stage Back for removal — the staged
    // field drops out of `order` while staying visible, struck through.
    await user.click(screen.getByRole('button', { name: 'Move Front down' }));
    await user.click(screen.getByRole('button', { name: 'Remove Back' }));

    await user.click(screen.getByRole('button', { name: 'Save' }));

    // Destructive (a staged field) — the aggregate confirm shows before anything is
    // sent, worded from the changeset (1 field) plus the deletion-impact query (the
    // 2 configurations and 1 practice the mock above reports for it).
    expect(await screen.findByText('Save changes?')).toBeInTheDocument();
    expect(
      screen.getByText(
        "This removes 1 field from 1 card, deletes 2 deck configurations and deletes 1 active practice. This can't be undone.",
      ),
    ).toBeInTheDocument();
    expect(patchCallCount).toBe(0);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(patchCallCount).toBe(1));
    // Stays on the editor — no navigation.
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
    expect(await screen.findByText('Saved ✓')).toBeInTheDocument();
    // Rebuilt from the response: the removed field is really gone.
    expect(screen.queryByDisplayValue('Back')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Notes')).toBeInTheDocument();
    expect(screen.getByText('Saved ✓').closest('button')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('save confirm does not appear for a rename/add/reorder-only changeset (no deletions)', async () => {
    mockEditDeck();
    let patchCallCount = 0;
    server.use(
      http.patch(`${BASE}/api/decks/:id`, () => {
        patchCallCount += 1;
        return HttpResponse.json(deckDetail);
      }),
    );
    const user = userEvent.setup();
    renderEditDeck();

    const nameInput = await screen.findByDisplayValue('French Vocab');
    await user.type(nameInput, ' II');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(patchCallCount).toBe(1));
    expect(screen.queryByText('Save changes?')).not.toBeInTheDocument();
  });

  it('save confirm states what the staged field removal costs', async () => {
    mockEditDeck();
    server.use(
      http.get(`${BASE}/api/deletion-impact`, () =>
        HttpResponse.json({
          subjects_deleted: 0,
          decks_deleted: 0,
          fields_deleted: 1,
          cards_deleted: 0,
          cards_affected: 1,
          configurations_deleted: 1,
          runs_deleted: 0,
        }),
      ),
    );
    const user = userEvent.setup();
    renderEditDeck();

    await screen.findByDisplayValue('French Vocab');
    await user.click(screen.getByRole('button', { name: 'Add field' })); // 3 fields, so Remove is enabled
    const [, , newFieldInput] = screen.getAllByRole('textbox', { name: 'Field name' });
    await user.type(newFieldInput!, 'Extra');
    await user.click(screen.getByRole('button', { name: 'Remove Back' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Save changes?')).toBeInTheDocument();
    // No active practices in this mock (runs_deleted: 0) — that clause is
    // omitted entirely, not rendered as "0 practices".
    expect(
      screen.getByText(
        "This removes 1 field from 1 card and deletes 1 deck configuration. This can't be undone.",
      ),
    ).toBeInTheDocument();
  });

  it('a failed impact request for the save confirm renders inline and opens nothing', async () => {
    mockEditDeck();
    server.use(
      http.get(`${BASE}/api/deletion-impact`, () =>
        HttpResponse.json({ detail: 'at least one id is required' }, { status: 422 }),
      ),
    );
    let patchCallCount = 0;
    server.use(
      http.patch(`${BASE}/api/decks/:id`, () => {
        patchCallCount += 1;
        return HttpResponse.json(deckDetail);
      }),
    );
    const user = userEvent.setup();
    renderEditDeck();

    await screen.findByDisplayValue('French Vocab');
    await user.click(screen.getByRole('button', { name: 'Add field' })); // 3 fields, so Remove is enabled
    const [, , newFieldInput] = screen.getAllByRole('textbox', { name: 'Field name' });
    await user.type(newFieldInput!, 'Extra');
    await user.click(screen.getByRole('button', { name: 'Remove Back' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const bar = within(screen.getByTestId('form-bar'));
    expect(await bar.findByRole('alert')).toHaveTextContent('Something went wrong.');
    expect(screen.queryByText('Save changes?')).not.toBeInTheDocument();
    expect(patchCallCount).toBe(0);
  });

  it('with three fields, marking one pending then trying to mark another is blocked by the floor', async () => {
    mockEditDeck();
    const user = userEvent.setup();
    renderEditDeck();

    await screen.findByDisplayValue('French Vocab');
    await user.click(screen.getByRole('button', { name: 'Add field' })); // Front, Back, <new> = 3 active
    await user.click(screen.getByRole('button', { name: 'Remove Front' })); // 2 active left

    expect(screen.getByRole('button', { name: 'Remove Back' })).toBeDisabled();
  });

  it('Delete deck: confirm counts the closure from the impact query, deletes, lands on the subject', async () => {
    mockEditDeck();
    server.use(
      http.get(`${BASE}/api/deletion-impact`, () =>
        HttpResponse.json({
          subjects_deleted: 0,
          decks_deleted: 1,
          fields_deleted: 2,
          cards_deleted: 1,
          cards_affected: 0,
          configurations_deleted: 3,
          runs_deleted: 1,
        }),
      ),
    );
    let deleteCalled = false;
    let deleted = false;
    server.use(
      http.delete(`${BASE}/api/decks/:id`, () => {
        deleteCalled = true;
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
      // Mirrors the real backend: once deleted, a GET 404s — this is what an
      // invalidation of the deck's own (still-mounted, pre-navigation) detail
      // query would hit if that query were invalidated on delete, which it must
      // not be (see the comment on handleDeleteDeck).
      http.get(`${BASE}/api/decks/:id`, () =>
        deleted
          ? HttpResponse.json({ detail: 'Deck not found' }, { status: 404 })
          : HttpResponse.json(deckDetail),
      ),
    );
    const user = userEvent.setup();
    renderEditDeck();

    await screen.findByDisplayValue('French Vocab');
    await user.click(screen.getByRole('button', { name: 'Delete deck' }));

    expect(await screen.findByText('Delete deck?')).toBeInTheDocument();
    // Everything the closure counts cascades with the deck, review history included —
    // the sentence names each type the impact query reported.
    expect(
      screen.getByText(
        "This also deletes 1 deck, 1 card, 2 fields, 3 deck configurations and 1 practice. This can't be undone.",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(deleteCalled).toBe(true));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/subjects/s1'));
  });

  it("Delete deck with nothing else to lose: the confirm says only that it can't be undone", async () => {
    mockEditDeck({ ...deckDetail, cards: [] });
    server.use(
      http.get(`${BASE}/api/deletion-impact`, () =>
        HttpResponse.json({
          subjects_deleted: 0,
          decks_deleted: 0,
          fields_deleted: 0,
          cards_deleted: 0,
          cards_affected: 0,
          configurations_deleted: 0,
          runs_deleted: 0,
        }),
      ),
    );
    const user = userEvent.setup();
    renderEditDeck();

    await screen.findByDisplayValue('French Vocab');
    await user.click(screen.getByRole('button', { name: 'Delete deck' }));

    expect(await screen.findByText('Delete deck?')).toBeInTheDocument();
    expect(screen.getByText("This can't be undone.")).toBeInTheDocument();
  });

  it('a failed impact request renders the error inline and never opens the confirm', async () => {
    mockEditDeck();
    server.use(
      http.get(`${BASE}/api/deletion-impact`, () =>
        HttpResponse.json({ detail: 'deck 1 not found' }, { status: 404 }),
      ),
    );
    const user = userEvent.setup();
    renderEditDeck();

    await screen.findByDisplayValue('French Vocab');
    await user.click(screen.getByRole('button', { name: 'Delete deck' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Deck not found.');
    expect(screen.queryByText('Delete deck?')).not.toBeInTheDocument();
  });

  it('Delete deck ignores unsaved edits — a typed rename never gets sent', async () => {
    mockEditDeck();
    server.use(
      http.get(`${BASE}/api/deletion-impact`, () =>
        HttpResponse.json({
          subjects_deleted: 0,
          decks_deleted: 0,
          fields_deleted: 0,
          cards_deleted: 0,
          cards_affected: 0,
          configurations_deleted: 0,
          runs_deleted: 0,
        }),
      ),
    );
    let deleteCalled = false;
    let deleted = false;
    server.use(
      http.delete(`${BASE}/api/decks/:id`, () => {
        deleteCalled = true;
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
      http.get(`${BASE}/api/decks/:id`, () =>
        deleted
          ? HttpResponse.json({ detail: 'Deck not found' }, { status: 404 })
          : HttpResponse.json(deckDetail),
      ),
    );
    const user = userEvent.setup();
    renderEditDeck();

    const nameInput = await screen.findByDisplayValue('French Vocab');
    await user.type(nameInput, ' unsaved rename');
    await user.click(screen.getByRole('button', { name: 'Delete deck' }));
    await user.click(await screen.findByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(deleteCalled).toBe(true));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/subjects/s1'));
  });
});

describe('DeckEditor — bringing a part of the form and its sentence on screen', () => {
  let scrollBy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    scrollBy = vi.spyOn(window, 'scrollBy');
  });
  afterEach(() => scrollBy.mockRestore());

  it('Save with a blank field name is pressable, reads not ready, and a tap moves the page once', async () => {
    mockEditDeck();
    const user = userEvent.setup();
    renderEditDeck();

    await user.clear(await screen.findByDisplayValue('Back'));
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toHaveAttribute('aria-disabled', 'true');
    expect(save).toBeEnabled();

    await user.click(save);

    expect(scrollBy).toHaveBeenCalledTimes(1);
  });

  it("a blank-name Create in the New subject overlay scrolls the dialog's content once and the window not at all", async () => {
    mockSubjects();
    const dialogScrollBy = vi.spyOn(Element.prototype, 'scrollBy');
    const user = userEvent.setup();
    renderEditor();

    await user.click(await screen.findByPlaceholderText('Subject'));
    await user.click(await screen.findByRole('option', { name: /New subject/ }));
    const dialogElement = await screen.findByRole('dialog');
    const dialog = within(dialogElement);
    await user.click(dialog.getByRole('button', { name: 'Create' }));

    expect(await dialog.findByText('Name is required.')).toBeInTheDocument();
    expect(dialogScrollBy).toHaveBeenCalledTimes(1);
    expect(dialogScrollBy.mock.contexts[0]).toBe(dialogElement);
    expect(scrollBy).not.toHaveBeenCalled();
    dialogScrollBy.mockRestore();
  });

  it('Create with a blank Deck name and no subject says both, and moves the page once', async () => {
    mockSubjects();
    const user = userEvent.setup();
    renderEditor();

    const name = await screen.findByRole('textbox', { name: 'Deck name' });
    const picker = screen.getByPlaceholderText('Subject');
    const create = screen.getByRole('button', { name: 'Create' });
    expect(create).toHaveAttribute('aria-disabled', 'true');
    expect(create).toBeEnabled();

    await user.click(create);

    const nameSentence = await screen.findByText('Name is required.');
    expect(nameSentence).toHaveAttribute('role', 'alert');
    expect(nameSentence.closest('[data-reveal-part]')).toContainElement(name);
    expect(nameSentence.closest('label')).toBeNull();
    const subjectSentence = screen.getByText('Choose a subject to create a deck.');
    expect(subjectSentence).toHaveAttribute('role', 'alert');
    expect(picker.compareDocumentPosition(subjectSentence)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(scrollBy).toHaveBeenCalledTimes(1);
  });

  it('Create with a Deck name and no subject says only the subject, and choosing one clears it', async () => {
    mockSubjects();
    const user = userEvent.setup();
    renderEditor();

    await user.type(await screen.findByRole('textbox', { name: 'Deck name' }), 'Verbs');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await screen.findByText('Choose a subject to create a deck.');
    expect(screen.queryByText('Name is required.')).not.toBeInTheDocument();
    expect(scrollBy).toHaveBeenCalledTimes(1);

    await user.click(screen.getByPlaceholderText('Subject'));
    await user.click(await screen.findByRole('option', { name: 'Math' }));
    expect(screen.queryByText('Choose a subject to create a deck.')).not.toBeInTheDocument();
  });

  it('editing the Deck name clears its sentence, and so does Undo', async () => {
    mockEditDeck();
    const user = userEvent.setup();
    renderEditDeck();

    const input = await screen.findByDisplayValue('French Vocab');
    await user.clear(input);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Name is required.');
    await user.type(input, 'F');
    expect(screen.queryByText('Name is required.')).not.toBeInTheDocument();

    await user.clear(input);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Name is required.');
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.queryByText('Name is required.')).not.toBeInTheDocument();
  });

  it("a field's sentence is its row's part, and a tap brings that part on screen", async () => {
    mockEditDeck();
    const measured = vi.spyOn(Element.prototype, 'getBoundingClientRect');
    const user = userEvent.setup();
    renderEditDeck();

    const field = await screen.findByDisplayValue('Back');
    await user.clear(field);
    const sentence = screen.getByText('Name is required.');
    const part = sentence.closest('[data-reveal-part]');
    expect(part).toContainElement(field);
    expect(part).toContainElement(screen.getByRole('button', { name: 'Remove field' }));

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(measured.mock.contexts).toContain(sentence);
    expect(measured.mock.contexts).toContain(part);
    measured.mockRestore();
  });

  it('Save with nothing changed moves nothing', async () => {
    mockEditDeck();
    const user = userEvent.setup();
    renderEditDeck();

    await screen.findByDisplayValue('French Vocab');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(scrollBy).not.toHaveBeenCalled();
  });

  async function refuseSave(detail: unknown, status: number) {
    mockEditDeck();
    server.use(http.patch(`${BASE}/api/decks/:id`, () => HttpResponse.json({ detail }, { status })));
    const user = userEvent.setup();
    renderEditDeck();
    const input = await screen.findByDisplayValue('French Vocab');
    await user.type(input, ' II');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    return { user, input };
  }

  it('a deck_name_taken refusal renders under the Deck name input, not in the bar, until the name is edited', async () => {
    const { user, input } = await refuseSave({ code: 'deck_name_taken', message: 'taken' }, 400);

    const sentence = await screen.findByText('A deck with this name already exists.');
    expect(sentence).toHaveAttribute('role', 'alert');
    expect(sentence.closest('[data-reveal-part]')).toContainElement(input);
    expect(sentence.closest('label')).toBeNull();
    expect(screen.getByTestId('form-bar')).not.toContainElement(sentence);
    expect(scrollBy).toHaveBeenCalledTimes(1);

    await user.type(input, '!');
    expect(screen.queryByText('A deck with this name already exists.')).not.toBeInTheDocument();
  });

  it('a 500 renders in the bar and leaves the page where it is', async () => {
    await refuseSave('boom', 500);

    const bar = within(screen.getByTestId('form-bar'));
    expect(await bar.findByRole('alert')).toBeInTheDocument();
    expect(scrollBy).not.toHaveBeenCalled();
  });
});

describe('DeckEditor — primary field marker', () => {
  it('the first field carries the Primary marker, and no other field does', async () => {
    mockSubjects();
    renderEditor();

    await screen.findByDisplayValue('Term');
    const pills = screen.getAllByText('Primary');
    expect(pills).toHaveLength(1);
    expect(within(pills[0]!.closest('li')!).getByDisplayValue('Term')).toBeInTheDocument();
  });

  it('shows an explanatory line about the primary field under the Fields heading', async () => {
    mockSubjects();
    renderEditor();

    await screen.findByDisplayValue('Term');
    expect(
      screen.getByText('The first field identifies this card in lists and summaries.'),
    ).toBeInTheDocument();
  });

  it('reordering a field to the top moves the Primary marker with it', async () => {
    mockSubjects();
    const user = userEvent.setup();
    renderEditor();

    await screen.findByDisplayValue('Term');
    expect(
      within(screen.getByText('Primary').closest('li')!).getByDisplayValue('Term'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Move Definition up' }));

    const pills = screen.getAllByText('Primary');
    expect(pills).toHaveLength(1);
    expect(within(pills[0]!.closest('li')!).getByDisplayValue('Definition')).toBeInTheDocument();
  });

  it('a field staged for removal at the top is skipped — the marker lands on the next active field', async () => {
    mockEditDeck();
    const user = userEvent.setup();
    renderEditDeck();

    await screen.findByDisplayValue('French Vocab');
    await user.click(screen.getByRole('button', { name: 'Add field' })); // Front, Back, <new> = 3 active
    await user.click(screen.getByRole('button', { name: 'Remove Front' })); // stages Front, still at index 0

    const pills = screen.getAllByText('Primary');
    expect(pills).toHaveLength(1);
    expect(within(pills[0]!.closest('li')!).getByDisplayValue('Back')).toBeInTheDocument();
  });
});
