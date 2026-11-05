// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import SubjectForm from 'src/components/library/SubjectForm';

const BASE = 'http://localhost:8000';

const subject = {
  id: 's1',
  name: 'Math',
  icon: 'brain',
  description: 'Numbers and shapes',
  user_id: 'u1',
  created_at: '',
};

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderForm(initialPath: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/subjects/new" element={<SubjectForm mode="create" />} />
      <Route path="/subjects/:subjectId/edit" element={<SubjectForm mode="edit" />} />
      <Route path="/subjects/:subjectId" element={<LocationProbe />} />
      <Route path="/library" element={<LocationProbe />} />
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

// Each address is asked for alone or not at all, so a landing on the default shows the
// other address did not stand in for it.
describe.each([
  {
    mode: 'create',
    path: '/subjects/new',
    leaveLabel: 'Create',
    cancelDefault: '/library',
    saveDefault: '/subjects/s2',
  },
  {
    mode: 'edit',
    path: '/subjects/s1/edit',
    leaveLabel: 'Save',
    cancelDefault: '/subjects/s1',
    saveDefault: '/subjects/s1',
  },
])(
  'SubjectForm — return addresses, $mode',
  ({ mode, path, leaveLabel, cancelDefault, saveDefault }) => {
    beforeEach(() => {
      server.use(
        http.get(`${BASE}/api/subjects/s1`, () => HttpResponse.json(subject)),
        http.post(`${BASE}/api/subjects`, () =>
          HttpResponse.json({ ...subject, id: 's2', name: 'Chemistry' }, { status: 201 }),
        ),
      );
    });

    const open = async (search: string) => {
      renderForm(`${path}${search}`);
      await screen.findByRole('button', { name: leaveLabel });
    };

    const leaveBySaving = async (user: ReturnType<typeof userEvent.setup>) => {
      if (mode === 'create')
        await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Chemistry');
      await user.click(screen.getByRole('button', { name: leaveLabel }));
    };

    it.each([
      { given: 'cancelTo alone', search: '?cancelTo=%2Fopener', cancel: '/opener' },
      { given: 'returnTo alone', search: '?returnTo=%2Fopener', cancel: cancelDefault },
      { given: 'neither', search: '', cancel: cancelDefault },
    ])('with $given, Cancel lands on $cancel', async ({ search, cancel }) => {
      const user = userEvent.setup();
      await open(search);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      await waitFor(() => expect(screen.getByTestId('location').textContent).toBe(cancel));
    });

    it.each([
      { given: 'cancelTo alone', search: '?cancelTo=%2Fopener', save: saveDefault },
      { given: 'returnTo alone', search: '?returnTo=%2Fopener', save: '/opener' },
      { given: 'neither', search: '', save: saveDefault },
    ])(`with $given, ${leaveLabel} lands on $save`, async ({ search, save }) => {
      const user = userEvent.setup();
      await open(search);

      await leaveBySaving(user);

      await waitFor(() => expect(screen.getByTestId('location').textContent).toBe(save));
    });

    it('a confirmed Cancel lands on cancelTo', async () => {
      const user = userEvent.setup();
      await open('?cancelTo=%2Fopener&returnTo=%2Fother');

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'x');
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      await user.click(await screen.findByRole('button', { name: 'Discard' }));

      await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/opener'));
    });
  },
);

describe('SubjectForm — create mode', () => {
  it('blocks submit with an empty name and does not call the API', async () => {
    let createCalled = false;
    server.use(
      http.post(`${BASE}/api/subjects`, () => {
        createCalled = true;
        return HttpResponse.json(subject, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderForm('/subjects/new');

    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    expect(createCalled).toBe(false);
  });

  it('creates a subject with only a name and navigates to its page', async () => {
    server.use(
      http.post(`${BASE}/api/subjects`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        expect(body).toEqual({ name: 'Chemistry' });
        return HttpResponse.json({ ...subject, id: 's2', name: 'Chemistry' }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderForm('/subjects/new');

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Chemistry');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/subjects/s2'));
  });

  it('has no text box for the icon', () => {
    renderForm('/subjects/new');

    expect(screen.queryByRole('textbox', { name: /Icon/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('textbox').map((box) => box.getAttribute('type'))).toEqual([
      'text',
      null,
    ]);
    expect(screen.getByRole('button', { name: 'Icon: Open book' })).toBeInTheDocument();
  });

  it('choosing a picture sends it with the create', async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/api/subjects`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          { ...subject, id: 's2', name: 'Chemistry', icon: 'atom' },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderForm('/subjects/new');

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Chemistry');
    await user.click(screen.getByRole('button', { name: 'Icon: Open book' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Icon' })).getByRole('button', { name: 'Atom' }),
    );

    expect(screen.queryByRole('dialog', { name: 'Icon' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Icon: Atom' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/subjects/s2'));
    expect(body).toEqual({ name: 'Chemistry', icon: 'atom' });
  });

  it('shows the API error and does not navigate on a failed create', async () => {
    server.use(
      http.post(`${BASE}/api/subjects`, () =>
        HttpResponse.json(
          {
            detail: {
              code: 'subject_name_taken',
              message: 'subject (user_id, name) already exists',
            },
          },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderForm('/subjects/new');

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Math');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('A subject with this name already exists.')).toBeInTheDocument();
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
  });

  it('prompts before discarding when the form is dirty, does nothing without changes', async () => {
    const user = userEvent.setup();
    renderForm('/subjects/new');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/library'));
  });

  it('cancel with a typed name asks to discard, and discarding navigates away', async () => {
    const user = userEvent.setup();
    renderForm('/subjects/new');

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Chemistry');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByText('Discard changes?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/library'));
  });
});

describe('SubjectForm — edit mode', () => {
  function mockEdit() {
    server.use(http.get(`${BASE}/api/subjects/:id`, () => HttpResponse.json(subject)));
  }

  it('prefills from the existing subject', async () => {
    mockEdit();
    renderForm('/subjects/s1/edit');

    expect(await screen.findByRole('textbox', { name: 'Name' })).toHaveValue('Math');
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue('Numbers and shapes');
    expect(screen.getByRole('button', { name: 'Icon: Brain' })).toBeInTheDocument();
  });

  it('changing the picture sends only the icon on save', async () => {
    mockEdit();
    let body: unknown;
    server.use(
      http.patch(`${BASE}/api/subjects/:id`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...subject, icon: 'atom' });
      }),
    );
    const user = userEvent.setup();
    renderForm('/subjects/s1/edit');

    await user.click(await screen.findByRole('button', { name: 'Icon: Brain' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Icon' })).getByRole('button', { name: 'Atom' }),
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/subjects/s1'));
    expect(body).toEqual({ icon: 'atom' });
  });

  it('sends only the changed field on submit and stays on the subject page', async () => {
    mockEdit();
    server.use(
      http.patch(`${BASE}/api/subjects/:id`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        expect(body).toEqual({ description: 'Updated description' });
        return HttpResponse.json({ ...subject, description: 'Updated description' });
      }),
    );
    const user = userEvent.setup();
    renderForm('/subjects/s1/edit');

    const descriptionInput = await screen.findByRole('textbox', { name: 'Description' });
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Updated description');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/subjects/s1'));
  });

  it('blocks submit with an empty name', async () => {
    mockEdit();
    const user = userEvent.setup();
    renderForm('/subjects/s1/edit');

    const nameInput = await screen.findByRole('textbox', { name: 'Name' });
    await user.clear(nameInput);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
  });

  it('delete confirm counts the closure from the impact query, and confirming navigates to /library', async () => {
    mockEdit();
    server.use(
      http.get(`${BASE}/api/deletion-impact`, () =>
        HttpResponse.json({
          subjects_deleted: 0,
          decks_deleted: 3,
          cards_deleted: 120,
          fields_deleted: 8,
          cards_affected: 0,
          configurations_deleted: 5,
          runs_deleted: 4,
        }),
      ),
    );
    let deleteCalled = false;
    server.use(
      http.delete(`${BASE}/api/subjects/:id`, () => {
        deleteCalled = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderForm('/subjects/s1/edit');

    await user.click(await screen.findByRole('button', { name: 'Delete subject' }));

    // The whole sentence, verbatim: its clause order and wording are fixed copy.
    expect(
      await screen.findByText(
        "This also deletes 3 decks, 120 cards, 8 fields, 5 deck configurations and 4 practices. This can't be undone.",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(deleteCalled).toBe(true));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/library'));
  });

  it('cancelling the delete confirm keeps the form and does not call the API', async () => {
    mockEdit();
    server.use(
      http.get(`${BASE}/api/deletion-impact`, () =>
        HttpResponse.json({
          subjects_deleted: 0,
          decks_deleted: 1,
          cards_deleted: 0,
          fields_deleted: 0,
          cards_affected: 0,
          configurations_deleted: 0,
          runs_deleted: 0,
        }),
      ),
    );
    let deleteCalled = false;
    server.use(
      http.delete(`${BASE}/api/subjects/:id`, () => {
        deleteCalled = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderForm('/subjects/s1/edit');

    await user.click(await screen.findByRole('button', { name: 'Delete subject' }));
    await screen.findByText('Delete subject?');
    const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
    await user.click(cancelButtons[cancelButtons.length - 1]!);

    expect(screen.queryByText('Delete subject?')).not.toBeInTheDocument();
    expect(deleteCalled).toBe(false);
  });

  it('a failed impact request renders the error inline and never opens the confirm', async () => {
    mockEdit();
    server.use(
      http.get(`${BASE}/api/deletion-impact`, () =>
        HttpResponse.json({ detail: 'subject 1 not found' }, { status: 404 }),
      ),
    );
    const user = userEvent.setup();
    renderForm('/subjects/s1/edit');

    await user.click(await screen.findByRole('button', { name: 'Delete subject' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Subject not found.');
    expect(screen.queryByText('Delete subject?')).not.toBeInTheDocument();
  });

  it('shows a not-found message for a missing subject', async () => {
    server.use(
      http.get(`${BASE}/api/subjects/:id`, () =>
        HttpResponse.json({ detail: 'Subject not found' }, { status: 404 }),
      ),
    );
    renderForm('/subjects/nope/edit');

    expect(await screen.findByText('Subject not found.')).toBeInTheDocument();
  });

  it('a load failure other than 404 says it could not load, not that it was not found', async () => {
    server.use(
      http.get(`${BASE}/api/subjects/:id`, () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    );
    renderForm('/subjects/s1/edit');

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this subject.');
    expect(screen.queryByText('Subject not found.')).not.toBeInTheDocument();
  });
});
