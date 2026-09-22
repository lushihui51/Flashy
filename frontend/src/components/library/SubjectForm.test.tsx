// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
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

    await user.click(screen.getByRole('button', { name: 'Create subject' }));

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
    await user.click(screen.getByRole('button', { name: 'Create subject' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/subjects/s2'));
  });

  it('shows the API error and does not navigate on a failed create', async () => {
    server.use(
      http.post(`${BASE}/api/subjects`, () =>
        HttpResponse.json(
          { detail: 'Subject with this name already exists for this user' },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderForm('/subjects/new');

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Math');
    await user.click(screen.getByRole('button', { name: 'Create subject' }));

    expect(
      await screen.findByText('Subject with this name already exists for this user'),
    ).toBeInTheDocument();
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
    expect(screen.getByRole('textbox', { name: 'Icon' })).toHaveValue('brain');
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
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/subjects/s1'));
  });

  it('blocks submit with an empty name', async () => {
    mockEdit();
    const user = userEvent.setup();
    renderForm('/subjects/s1/edit');

    const nameInput = await screen.findByRole('textbox', { name: 'Name' });
    await user.clear(nameInput);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

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

    // Verbatim against the copy contract's own subject example (task 013).
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

    expect(await screen.findByRole('alert')).toHaveTextContent('subject 1 not found');
    expect(screen.queryByText('Delete subject?')).not.toBeInTheDocument();
  });
});
