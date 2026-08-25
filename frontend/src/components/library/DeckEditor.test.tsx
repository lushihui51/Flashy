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
  { id: 's1', name: 'Math', icon: 'brain', description: '', user_id: 'u1', created_at: '', deck_count: 1 },
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
};

const deckDetail = {
  id: 'd1',
  name: 'French Vocab',
  subject_id: 's1',
  created_at: '',
  last_activity_at: '',
  field_defs: [
    { id: 'front-id', name: 'Front', type: 'text', position: 0 },
    { id: 'back-id', name: 'Back', type: 'text', position: 1 },
  ],
  cards: [
    { id: 'card-1', deck_id: 'd1', created_at: '', values: { 'front-id': 'Bonjour', 'back-id': 'Hello' } },
  ],
};

function mockEditDeck(data: typeof deckDetail = deckDetail) {
  server.use(
    http.get(`${BASE}/api/subjects`, () => HttpResponse.json(subjects)),
    http.get(`${BASE}/api/subjects/:id`, () => HttpResponse.json(mathSubject)),
    http.get(`${BASE}/api/decks/:id`, () => HttpResponse.json(data)),
  );
}

function renderEditDeck(deckId = 'd1') {
  return renderWithProviders(
    <Routes>
      <Route path="/decks/:deckId/edit" element={<DeckEditor mode="edit" />} />
      <Route path="/decks/:deckId" element={<LocationProbe />} />
      <Route path="/subjects/:subjectId" element={<LocationProbe />} />
    </Routes>,
    [`/decks/${deckId}/edit`],
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
  it('starts with Term and Definition fields and a disabled Save', async () => {
    mockSubjects();
    renderEditor();

    expect(await screen.findByDisplayValue('Term')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Definition')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
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

  it('renaming a field via up/down overflow menu reorders the fields', async () => {
    mockSubjects();
    const user = userEvent.setup();
    renderEditor();

    await screen.findByDisplayValue('Term');
    await user.click(screen.getByRole('button', { name: 'Reorder Definition' }));
    await user.click(screen.getByRole('menuitem', { name: 'Move up' }));

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

  it('removing a brand-new field (no confirm — create mode never has a saved field to stage)', async () => {
    mockSubjects();
    const user = userEvent.setup();
    renderEditor();

    await screen.findByDisplayValue('Term');
    // A third field so Remove is enabled (D3: disabled at exactly two).
    await user.click(screen.getByRole('button', { name: 'Add field' }));

    await user.click(screen.getByRole('button', { name: 'Remove Term' }));

    // Gone outright — no confirm, no struck-through row (Phase 7.5 §1: only a
    // *saved* field stages; create mode never has one).
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

  // The subject combobox's create row used to live in a picker wrapper with its own test
  // file; the overlay is wired here now, so its coverage moved here with it.
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
    // Scoped to the dialog: the editor's own header has a Cancel button too.
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog', { name: 'New subject' })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Subject')).toHaveValue('Math');
  });

  it('creating a subject in the overlay selects it immediately, without waiting for a refetch', async () => {
    mockSubjects();
    server.use(
      http.post(`${BASE}/api/subjects`, () =>
        HttpResponse.json(
          { id: 's3', name: 'History', icon: 'book-open', description: '', user_id: 'u1', created_at: '' },
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
    await user.click(within(dialog).getByRole('button', { name: 'Create subject' }));

    await waitFor(() => expect(screen.getByPlaceholderText('Subject')).toHaveValue('History'));
    expect(screen.queryByRole('dialog', { name: 'New subject' })).not.toBeInTheDocument();
  });

  it('opened via a "New deck…" round-trip: Save navigates back to returnTo with the new deck id', async () => {
    mockSubjects();
    server.use(http.post(`${BASE}/api/decks`, async () => HttpResponse.json({ id: 'd9' }, { status: 201 })));
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/decks/new" element={<DeckEditor mode="create" />} />
        <Route path="/cards/new" element={<LocationProbe />} />
      </Routes>,
      [{ pathname: '/decks/new', state: { returnTo: '/cards/new' } }],
    );

    await user.type(screen.getByRole('textbox', { name: 'Deck name' }), 'Spanish Basics');
    await user.click(screen.getByPlaceholderText('Subject'));
    await user.click(await screen.findByRole('option', { name: 'Math' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/cards/new'));
    expect(screen.getByTestId('location')).toHaveAttribute('data-state', JSON.stringify({ deckId: 'd9' }));
  });

  it('opened via a "New deck…" round-trip: Cancel with no changes navigates back to returnTo with no state', async () => {
    mockSubjects();
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/decks/new" element={<DeckEditor mode="create" />} />
        <Route path="/cards/new" element={<LocationProbe />} />
      </Routes>,
      [{ pathname: '/decks/new', state: { returnTo: '/cards/new' } }],
    );

    await screen.findByDisplayValue('Term');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/cards/new'));
    expect(screen.getByTestId('location')).toHaveAttribute('data-state', 'null');
  });

  it('saves name, subject and fields — no cards — and lands on the new deck', async () => {
    mockSubjects();
    server.use(
      http.post(`${BASE}/api/decks`, async ({ request }) => {
        const body = (await request.json()) as {
          name: string;
          subject_id: string;
          field_defs: { name: string; type: string }[];
          cards: { values: (string | null)[] }[];
        };
        expect(body.name).toBe('Spanish Basics');
        expect(body.subject_id).toBe('s1');
        expect(body.field_defs).toEqual([
          { name: 'Word', type: 'text' },
          { name: 'Definition', type: 'text' },
        ]);
        // A deck is born with a schema and no content — the first card is added from
        // the new deck's own card list.
        expect(body.cards).toEqual([]);
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

    await user.click(screen.getByRole('button', { name: 'Save' }));

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
    server.use(http.get(`${BASE}/api/decks/:id`, () => HttpResponse.json({ detail: 'Deck not found' }, { status: 404 })));
    renderEditDeck();

    expect(await screen.findByText('Deck not found.')).toBeInTheDocument();
  });

  it('remove is disabled once only two fields remain, same as create mode (D3)', async () => {
    mockEditDeck();
    renderEditDeck();

    await screen.findByDisplayValue('French Vocab');
    expect(screen.getByRole('button', { name: 'Remove Front' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove Back' })).toBeDisabled();
  });

  it('change nothing: Save and Undo both start disabled (nothing to save/undo)', async () => {
    mockEditDeck();
    renderEditDeck();

    await screen.findByDisplayValue('French Vocab');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });

  it('header reads Done (not Cancel) when the editor is clean; Done exits with no prompt', async () => {
    mockEditDeck();
    const user = userEvent.setup();
    renderEditDeck();

    await screen.findByDisplayValue('French Vocab');
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Done' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/decks/d1'));
    expect(screen.queryByText('Discard this deck?')).not.toBeInTheDocument();
  });

  it('header switches to Cancel once dirty, and Cancel still prompts to discard', async () => {
    mockEditDeck();
    const user = userEvent.setup();
    renderEditDeck();

    const nameInput = await screen.findByDisplayValue('French Vocab');
    await user.type(nameInput, ' II');
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText('Discard this deck?')).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
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

    // Add a field, so the D3 floor allows staging one for removal.
    await user.click(screen.getByRole('button', { name: 'Add field' }));
    const [, , newFieldInput] = screen.getAllByRole('textbox', { name: 'Field name' });
    await user.type(newFieldInput!, 'Notes');

    // Reorder: move Front down below Back, then stage Back for removal — the staged
    // field drops out of `order` while staying visible, struck through.
    await user.click(screen.getByRole('button', { name: 'Reorder Front' }));
    await user.click(screen.getByRole('menuitem', { name: 'Move down' }));
    await user.click(screen.getByRole('button', { name: 'Remove Back' }));

    await user.click(screen.getByRole('button', { name: 'Save' }));

    // Destructive (a staged field) — the aggregate confirm shows before anything is sent.
    expect(await screen.findByText('Save changes?')).toBeInTheDocument();
    expect(
      screen.getByText("This removes 1 field from every card in this deck. This can't be undone."),
    ).toBeInTheDocument();
    expect(patchCallCount).toBe(0);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(patchCallCount).toBe(1));
    // Stays on the editor — no navigation.
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
    expect(await screen.findByText('Saved ✓')).toBeInTheDocument();
    // Rebuilt from the response: the removed field is really gone.
    expect(screen.queryByDisplayValue('Back')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Notes')).toBeInTheDocument();
    expect(screen.getByText('Saved ✓').closest('button')).toBeDisabled();
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
    const user = userEvent.setup();
    renderEditDeck();

    await screen.findByDisplayValue('French Vocab');
    await user.click(screen.getByRole('button', { name: 'Add field' })); // 3 fields, so Remove is enabled
    const [, , newFieldInput] = screen.getAllByRole('textbox', { name: 'Field name' });
    await user.type(newFieldInput!, 'Extra');
    await user.click(screen.getByRole('button', { name: 'Remove Back' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Save changes?')).toBeInTheDocument();
    expect(
      screen.getByText("This removes 1 field from every card in this deck. This can't be undone."),
    ).toBeInTheDocument();
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

  it('Delete deck: confirm names the cascade and what survives, deletes, lands on the subject', async () => {
    mockEditDeck();
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
        deleted ? HttpResponse.json({ detail: 'Deck not found' }, { status: 404 }) : HttpResponse.json(deckDetail),
      ),
    );
    const user = userEvent.setup();
    renderEditDeck();

    await screen.findByDisplayValue('French Vocab');
    await user.click(screen.getByRole('button', { name: 'Delete deck' }));

    expect(await screen.findByText('Delete deck?')).toBeInTheDocument();
    // ADR 015: cards, fields and configurations are deck-owned and cascade; review
    // history is not deck-owned and survives.
    expect(
      screen.getByText(
        "This also deletes 1 card, 2 fields and its practice configurations. Your review history is kept. This can't be undone.",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(deleteCalled).toBe(true));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/subjects/s1'));
  });

  it('Delete deck on a card-less deck: the confirm drops the card clause, keeps the rest', async () => {
    mockEditDeck({ ...deckDetail, cards: [] });
    const user = userEvent.setup();
    renderEditDeck();

    await screen.findByDisplayValue('French Vocab');
    await user.click(screen.getByRole('button', { name: 'Delete deck' }));

    expect(await screen.findByText('Delete deck?')).toBeInTheDocument();
    expect(
      screen.getByText(
        "This also deletes 2 fields and its practice configurations. Your review history is kept. This can't be undone.",
      ),
    ).toBeInTheDocument();
  });

  it('Delete deck ignores unsaved edits — a typed rename never gets sent', async () => {
    mockEditDeck();
    let deleteCalled = false;
    let deleted = false;
    server.use(
      http.delete(`${BASE}/api/decks/:id`, () => {
        deleteCalled = true;
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
      http.get(`${BASE}/api/decks/:id`, () =>
        deleted ? HttpResponse.json({ detail: 'Deck not found' }, { status: 404 }) : HttpResponse.json(deckDetail),
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
