// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import PracticeConfigsPage from 'src/pages/PracticeConfigsPage';

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

// Same deck name under two subjects, as everywhere else in practice: the subject is what
// makes a config row unambiguous.
const decks = [
  {
    id: 'd1',
    subject_id: 's1',
    name: 'Shared Deck Name',
    created_at: '',
    last_activity_at: '',
    card_count: 2,
    field_names: [],
  },
  {
    id: 'd2',
    subject_id: 's2',
    name: 'Shared Deck Name',
    created_at: '',
    last_activity_at: '',
    card_count: 2,
    field_names: [],
  },
];

function config(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    deck_id: 'd1',
    name: 'Recall',
    created_at: '',
    prompt_field_ids: ['f1'],
    answer_field_ids: ['f2'],
    prompt_pool_ids: [],
    prompt_pool_counts: [],
    answer_pool_ids: [],
    answer_pool_counts: [],
    deck_name: 'Shared Deck Name',
    subject_id: 's1',
    subject_name: 'Alpha',
    ...overrides,
  };
}

const alphaConfig = config();
const betaConfig = config({
  id: 'c2',
  deck_id: 'd2',
  name: 'Reverse',
  subject_id: 's2',
  subject_name: 'Beta',
});

function mockLibrary(
  configsFor: (query: URLSearchParams) => unknown[] = () => [alphaConfig, betaConfig],
) {
  const requests: URLSearchParams[] = [];
  server.use(
    http.get(`${BASE}/api/subjects`, () => HttpResponse.json(subjects)),
    http.get(`${BASE}/api/decks`, () => HttpResponse.json(decks)),
    http.get(`${BASE}/api/deck_practice_configs`, ({ request }) => {
      const query = new URL(request.url).searchParams;
      requests.push(query);
      return HttpResponse.json(configsFor(query));
    }),
  );
  return requests;
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

function renderConfigs(initialPath = '/practice/configs') {
  return renderWithProviders(
    <Routes>
      <Route path="/practice/configs" element={<PracticeConfigsPage />} />
      <Route path="/practice/configs/new" element={<LocationProbe />} />
      <Route path="/practice/configs/:configId/edit" element={<LocationProbe />} />
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

describe('PracticeConfigsPage', () => {
  it('lists configs with the subject alongside the deck', async () => {
    mockLibrary();
    renderConfigs();

    expect(await screen.findByText('Recall')).toBeInTheDocument();
    expect(screen.getByText('Alpha · Shared Deck Name')).toBeInTheDocument();
    expect(screen.getByText('Beta · Shared Deck Name')).toBeInTheDocument();
  });

  it('sends the subject and deck filters from the URL', async () => {
    const requests = mockLibrary((query) => (query.get('deck_id') === 'd2' ? [betaConfig] : []));
    renderConfigs('/practice/configs?subject=s2&deck=d2');

    await screen.findByText('Reverse');
    expect(requests[0]!.get('subject_id')).toBe('s2');
    expect(requests[0]!.get('deck_id')).toBe('d2');
    expect(screen.queryByText('Recall')).not.toBeInTheDocument();
  });

  it('a config row opens the builder for that config', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderConfigs();

    await user.click(await screen.findByText('Recall'));
    expect(screen.getByTestId('location')).toHaveTextContent('/practice/configs/c1/edit');
  });

  it('New config carries the current filters into the builder', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderConfigs('/practice/configs?subject=s1&deck=d1');
    await screen.findByText('Recall');

    await user.click(screen.getByRole('button', { name: 'New config' }));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/practice/configs/new?subject=s1&deck=d1',
    );
  });

  it('deleting confirms, says sessions are unaffected, then removes the row', async () => {
    let deleted: string | null = null;
    mockLibrary(() => (deleted ? [betaConfig] : [alphaConfig, betaConfig]));
    server.use(
      http.delete(`${BASE}/api/deck_practice_configs/:id`, ({ params }) => {
        deleted = params.id as string;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderConfigs();
    await screen.findByText('Recall');

    await user.click(screen.getByRole('button', { name: 'Delete Recall' }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(/sessions that already used it are unaffected/i),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(deleted).toBe('c1'));
    await waitFor(() => expect(screen.queryByText('Recall')).not.toBeInTheDocument());
    expect(screen.getByText('Reverse')).toBeInTheDocument();
  });

  it('empty with filters offers to clear them; empty with none offers to build one', async () => {
    mockLibrary(() => []);
    const user = userEvent.setup();
    renderConfigs('/practice/configs?subject=s1');

    expect(await screen.findByText('No configs match these filters.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(await screen.findByText('No practice configs yet.')).toBeInTheDocument();
  });
});
