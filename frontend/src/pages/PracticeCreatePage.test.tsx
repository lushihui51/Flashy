// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import PracticeCreatePage from 'src/pages/PracticeCreatePage';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';

// Every call the form makes to leave, passed on to the real leave, which under a memory
// router replaces the form's entry.
const leaveCalls = vi.hoisted(() => vi.fn());
vi.mock('src/lib/leaveForm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('src/lib/leaveForm')>();
  return {
    useLeaveForm: () => {
      const leave = actual.useLeaveForm();
      return (...args: Parameters<typeof leave>) => {
        leaveCalls(...args);
        return leave(...args);
      };
    },
  };
});

const BASE = 'http://localhost:8000';

const deck = (id: string, name: string) => ({
  id,
  name,
  created_at: '',
  last_activity_at: '',
  card_count: 2,
  readiness: null,
  field_names: ['Front', 'Back'],
});
const DECKS = [deck('d1', 'Commands'), deck('d2', 'Ports'), deck('d3', 'Cells')];

function LocationProbe() {
  const location = useLocation();
  return (
    <span data-testid="location" data-state={JSON.stringify(location.state)}>
      {`${location.pathname}${location.search}`}
    </span>
  );
}

function renderCreate(
  entry: string | { pathname: string; search?: string; state?: unknown } = '/practices/new',
) {
  server.use(http.get(`${BASE}/api/decks`, () => HttpResponse.json(DECKS)));
  return renderWithProviders(
    <Routes>
      <Route
        path="/practices/new"
        element={
          <>
            <PracticeCreatePage />
            <LocationProbe />
          </>
        }
      />
      <Route path="*" element={<LocationProbe />} />
    </Routes>,
    [entry],
  );
}

function address() {
  const [pathname, search = ''] = screen.getByTestId('location').textContent!.split('?');
  return { pathname, params: new URLSearchParams(search) };
}

// The search keeps the last pick's name until the user clears it.
async function pick(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.clear(screen.getByRole('combobox'));
  await user.click(await screen.findByRole('option', { name: new RegExp(`^Deck ${name}`) }));
}

beforeEach(() => leaveCalls.mockClear());
afterEach(() => server.resetHandlers());

describe('PracticeCreatePage', () => {
  it('asks for Name and the decks alone', async () => {
    renderCreate();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'New practice' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('');
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.queryByText(/configuration/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('lists the picked decks beneath in the order picked, each in the URL, and counts them', async () => {
    const user = userEvent.setup();
    renderCreate();
    await screen.findByRole('combobox');

    await pick(user, 'Ports');
    await pick(user, 'Commands');

    expect(address().params.getAll('deck')).toEqual(['d2', 'd1']);
    expect(screen.getByRole('button', { name: 'Remove Ports' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Commands' })).toBeInTheDocument();
    const bar = screen.getByTestId('form-bar');
    expect(within(bar).getByText('2 selected')).toBeInTheDocument();
  });

  it('a picked deck leaves the list, and its cross puts it back', async () => {
    const user = userEvent.setup();
    renderCreate('/practices/new?deck=d2');

    await screen.findByRole('button', { name: 'Remove Ports' });
    await user.click(screen.getByRole('combobox'));
    expect(screen.queryByRole('option', { name: /^Deck Ports/ })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: 'Remove Ports' }));

    expect(address().params.getAll('deck')).toEqual([]);
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
  });

  it('a refresh keeps the picks and the typed name from the URL', async () => {
    renderCreate('/practices/new?deck=d1&deck=d3&name=Evening');

    expect(await screen.findByRole('button', { name: 'Remove Commands' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Cells' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Evening');
  });

  it('a deck param naming no deck of the user is neither counted nor sent', async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/api/practices`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          { id: 'p9', name: 'Commands', created_at: '', decks: [], active_run_id: null },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderCreate('/practices/new?deck=gone&deck=d1');

    await screen.findByRole('button', { name: 'Remove Commands' });
    expect(within(screen.getByTestId('form-bar')).getByText('1 selected')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(body).toEqual({ name: null, deck_ids: ['d1'] }));
  });

  it('clearing Name drops the name param', async () => {
    const user = userEvent.setup();
    renderCreate('/practices/new?name=Evening');

    await user.clear(await screen.findByRole('textbox', { name: 'Name' }));

    expect(address().params.has('name')).toBe(false);
  });

  it('a typed name rides the URL', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.type(await screen.findByRole('textbox', { name: 'Name' }), 'Evening');

    expect(address().params.get('name')).toBe('Evening');
  });

  it('Create is not ready with no deck picked, and posts nothing', async () => {
    let posts = 0;
    server.use(
      http.post(`${BASE}/api/practices`, () => {
        posts += 1;
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderCreate();

    const create = await screen.findByRole('button', { name: 'Create' });
    expect(create).toHaveAttribute('aria-disabled', 'true');
    await user.click(create);

    expect(posts).toBe(0);
  });

  it('Create sends no name when Name is blank, and lands on the new practice', async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/api/practices`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          {
            id: 'p9',
            name: 'Ports + Commands',
            created_at: '',
            decks: [],
            active_run_id: null,
          },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderCreate('/practices/new?deck=d2&deck=d1');

    await screen.findByRole('button', { name: 'Remove Ports' });
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(address().pathname).toBe('/practices/p9'));
    expect(body).toEqual({ name: null, deck_ids: ['d2', 'd1'] });
    expect(leaveCalls).toHaveBeenCalledWith('/practices/p9');
  });

  it('Create sends the typed name', async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/api/practices`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          { id: 'p9', name: 'Evening', created_at: '', decks: [], active_run_id: null },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderCreate('/practices/new?deck=d1&name=%20Evening%20');

    await screen.findByRole('button', { name: 'Remove Commands' });
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(body).toEqual({ name: 'Evening', deck_ids: ['d1'] }));
  });

  it('a refused Create reads its sentence in the bar', async () => {
    server.use(
      http.post(`${BASE}/api/practices`, () =>
        HttpResponse.json(
          { detail: { code: 'practice_name_taken', message: 'x' } },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderCreate('/practices/new?deck=d1&name=Mine');

    await screen.findByRole('button', { name: 'Remove Commands' });
    await user.click(screen.getByRole('button', { name: 'Create' }));

    const bar = screen.getByTestId('form-bar');
    expect(await within(bar).findByRole('alert')).toHaveTextContent(
      'A practice with this name already exists.',
    );
  });

  it('Cancel leaves for cancelTo, else All practices', async () => {
    const user = userEvent.setup();
    renderCreate('/practices/new?cancelTo=%2F');

    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(leaveCalls).toHaveBeenCalledWith('/');
  });

  it('Cancel with no cancelTo leaves for All practices', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(leaveCalls).toHaveBeenCalledWith('/practices');
  });

  it("New deck… opens New deck with the page's own address as cancelTo and returnTo", async () => {
    const user = userEvent.setup();
    renderCreate('/practices/new?deck=d1&name=Evening');
    await screen.findByRole('button', { name: 'Remove Commands' });

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: /New deck…/ }));

    const { pathname, params } = address();
    expect(pathname).toBe('/decks/new');
    expect(params.get('cancelTo')).toBe('/practices/new?deck=d1&name=Evening');
    expect(params.get('returnTo')).toBe('/practices/new?deck=d1&name=Evening');
  });

  it('the deck New deck brings back is added to the picks', async () => {
    renderCreate({ pathname: '/practices/new', search: '?deck=d1', state: { deckId: 'd3' } });

    expect(await screen.findByRole('button', { name: 'Remove Cells' })).toBeInTheDocument();
    expect(address().params.getAll('deck')).toEqual(['d1', 'd3']);
  });
});
