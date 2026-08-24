// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import SubjectPicker from 'src/components/library/SubjectPicker';

const BASE = 'http://localhost:8000';

const subjects = [
  { id: 's1', name: 'Math', icon: 'brain', description: '', user_id: 'u1', created_at: '', deck_count: 2 },
  { id: 's2', name: 'Music', icon: 'music', description: '', user_id: 'u1', created_at: '', deck_count: 0 },
];

function mockSubjects(data = subjects) {
  server.use(http.get(`${BASE}/api/subjects`, () => HttpResponse.json(data)));
}

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  consoleError.mockRestore();
  server.resetHandlers();
});

describe('SubjectPicker', () => {
  it('the create row is always present, even with an empty query', async () => {
    mockSubjects();
    const user = userEvent.setup();
    renderWithProviders(<SubjectPicker onChange={() => {}} />);

    await user.click(screen.getByRole('combobox'));
    expect(await screen.findByRole('option', { name: /New subject…/ })).toBeInTheDocument();
  });

  it('filters existing subjects as the user types', async () => {
    mockSubjects();
    const user = userEvent.setup();
    renderWithProviders(<SubjectPicker onChange={() => {}} />);

    await user.type(screen.getByRole('combobox'), 'Ma');

    expect(await screen.findByRole('option', { name: 'Math' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Music' })).not.toBeInTheDocument();
  });

  it('selecting an existing option calls onChange with its id', async () => {
    mockSubjects();
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<SubjectPicker onChange={onChange} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Math' }));

    expect(onChange).toHaveBeenCalledWith('s1');
    expect(screen.getByRole('combobox')).toHaveValue('Math');
  });

  it('defaultValue preselects, and the picker is still an editable combobox (not locked)', async () => {
    mockSubjects();
    renderWithProviders(<SubjectPicker defaultValue={{ id: 's1', name: 'Math', icon: 'brain' }} onChange={() => {}} />);

    expect(await screen.findByRole('combobox')).toHaveValue('Math');
  });

  it('locked renders a static chip with no combobox', async () => {
    mockSubjects();
    renderWithProviders(
      <SubjectPicker defaultValue={{ id: 's1', name: 'Math', icon: 'brain' }} locked onChange={() => {}} />,
    );

    expect(await screen.findByText('Math')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('"New subject…" opens the create overlay; cancel leaves the selection unchanged', async () => {
    mockSubjects();
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<SubjectPicker defaultValue={{ id: 's1', name: 'Math', icon: 'brain' }} onChange={onChange} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: /New subject…/ }));

    expect(await screen.findByRole('dialog', { name: 'New subject' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox')).toHaveValue('Math');
  });

  it('creating a subject in the overlay selects it immediately, without waiting for a refetch', async () => {
    mockSubjects();
    server.use(
      http.post(`${BASE}/api/subjects`, async ({ request }) => {
        const body = (await request.json()) as { name: string };
        expect(body.name).toBe('History');
        return HttpResponse.json(
          { id: 's3', name: 'History', icon: 'book-open', description: '', user_id: 'u1', created_at: '' },
          { status: 201 },
        );
      }),
    );
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<SubjectPicker onChange={onChange} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: /New subject…/ }));
    await screen.findByRole('dialog', { name: 'New subject' });

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'History');
    await user.click(screen.getByRole('button', { name: 'Create subject' }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('s3'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('History');
  });
});
