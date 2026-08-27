// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import PracticeCreatePage from 'src/pages/PracticeCreatePage';

const BASE = 'http://localhost:8000';

// Two decks with the *same name* under different subjects — the case group headers
// exist to disambiguate.
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
    prompt_pool_ids: [] as string[],
    prompt_pool_counts: [] as number[],
    answer_pool_ids: [] as string[],
    answer_pool_counts: [] as number[],
    deck_name: 'Shared Deck Name',
    subject_id: 's1',
    subject_name: 'Alpha',
    ...overrides,
  };
}

const configRecall = config();
const configRecognition = config({ id: 'c2', name: 'Recognition' });
const configBasics = config({
  id: 'c3',
  deck_id: 'd2',
  name: 'Basics',
  subject_id: 's2',
  subject_name: 'Beta',
});

const ALL_CONFIGS = [configRecall, configRecognition, configBasics];

/** Records what the page asked the server for — same shape as
 * PracticeOverviewPage.test.tsx's mockLibrary. */
function mockLibrary(configsFor: (query: URLSearchParams) => unknown[] = () => ALL_CONFIGS) {
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

/** Stands in for DeckConfigurationEditor's create route: records where it was carried
 * to, and on "Finish" plays back the same round trip the real builder makes — navigate
 * to `returnTo` (ADR 024: a URL param, not state) with `state: {configurationId}`. */
function NewConfigStub() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  return (
    <div>
      <span data-testid="new-config-location">{`${location.pathname}${location.search}`}</span>
      <button
        type="button"
        onClick={() =>
          navigate(searchParams.get('returnTo') ?? '/practice/new', {
            state: { configurationId: 'c2' },
          })
        }
      >
        Finish new config
      </button>
    </div>
  );
}

function renderCreate(initialPath = '/practice/new') {
  return renderWithProviders(
    <Routes>
      <Route path="/practice/new" element={<PracticeCreatePage />} />
      <Route path="/practice" element={<LocationProbe />} />
      <Route path="/practice/:practiceSessionId" element={<LocationProbe />} />
      <Route path="/deck-configurations/new" element={<NewConfigStub />} />
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

describe('PracticeCreatePage', () => {
  it('groups configurations by deck, keeping two same-named decks in different subjects apart', async () => {
    mockLibrary();
    renderCreate();

    const alphaGroup = await screen.findByRole('group', { name: 'Shared Deck Name · Alpha' });
    const betaGroup = screen.getByRole('group', { name: 'Shared Deck Name · Beta' });

    expect(within(alphaGroup).getByText('Recall')).toBeInTheDocument();
    expect(within(alphaGroup).getByText('Recognition')).toBeInTheDocument();
    expect(within(betaGroup).getByText('Basics')).toBeInTheDocument();
  });

  it('enforces one selected configuration per deck', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');

    await user.click(screen.getByRole('radio', { name: 'Recall' }));
    expect(screen.getByRole('radio', { name: 'Recall' })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: 'Recognition' }));
    expect(screen.getByRole('radio', { name: 'Recognition' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Recall' })).not.toBeChecked();
  });

  it('Create stays disabled with the unmet condition shown, mirroring the builder’s Save', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');
    const create = screen.getByRole('button', { name: 'Create' });

    expect(create).toBeDisabled();
    expect(screen.getByText('Select at least one configuration to practise.')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Recall' }));
    expect(create).toBeEnabled(); // the name arrives prefilled, so nothing else is left

    await user.clear(screen.getByLabelText('Name'));
    expect(screen.getByText('Give this practice a name to create it.')).toBeInTheDocument();
    expect(create).toBeDisabled();
  });

  it('creates a session from the selected configs and name, then navigates to it', async () => {
    mockLibrary();
    let sent: Record<string, unknown> | null = null;
    server.use(
      http.post(`${BASE}/api/practice_sessions`, async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { id: 'ps9', user_id: 'u1', name: sent.name, status: 'active', created_at: '' },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');

    await user.click(screen.getByRole('radio', { name: 'Recall' })); // deck d1
    await user.click(screen.getByRole('radio', { name: 'Basics' })); // deck d2
    const nameInput = screen.getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Study run');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(sent).not.toBeNull());
    expect(sent).toEqual({ name: 'Study run', deck_practice_config_ids: ['c1', 'c3'] });
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/practice/ps9'));
  });

  it('stale_config renders on the offending row and keeps the selection', async () => {
    mockLibrary();
    server.use(
      http.post(`${BASE}/api/practice_sessions`, () =>
        HttpResponse.json(
          { detail: { code: 'stale_config', message: 'stale', config_id: 'c1' } },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');

    await user.click(screen.getByRole('radio', { name: 'Recall' }));
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(
      await screen.findByText('This configuration no longer produces any prompts — edit it.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Recall' })).toBeChecked();
  });

  it('config_not_found shows a top-of-list message and refetches the list', async () => {
    mockLibrary();
    let calls = 0;
    server.use(
      http.get(`${BASE}/api/deck_practice_configs`, () => {
        calls += 1;
        return HttpResponse.json(ALL_CONFIGS);
      }),
      http.post(`${BASE}/api/practice_sessions`, () =>
        HttpResponse.json(
          { detail: { code: 'config_not_found', message: 'gone', config_id: 'c1' } },
          { status: 404 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');
    const callsAfterLoad = calls;

    await user.click(screen.getByRole('radio', { name: 'Recall' }));
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(
      await screen.findByText('A selected configuration no longer exists.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(calls).toBeGreaterThan(callsAfterLoad));
  });

  it('duplicate_deck and any other error render as a banner above Create', async () => {
    mockLibrary();
    server.use(
      http.post(`${BASE}/api/practice_sessions`, () =>
        HttpResponse.json({ detail: 'Something went wrong' }, { status: 400 }),
      ),
    );
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');

    await user.click(screen.getByRole('radio', { name: 'Recall' }));
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('no configurations at all shows the true-empty state with a New configuration button', async () => {
    mockLibrary(() => []);
    renderCreate();

    expect(await screen.findByText('No deck configurations yet.')).toBeInTheDocument();
    // The always-visible add control above the list, repeated in the empty state
    // itself (ADR 023 rule 2) — two buttons, same label, is the intended shape.
    expect(screen.getAllByRole('button', { name: 'New configuration' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });

  it('filters matching zero configurations offer Clear filters instead', async () => {
    mockLibrary((query) => (query.get('subject_id') === 's1' ? [] : ALL_CONFIGS));
    renderCreate('/practice/new?subject=s1');

    expect(await screen.findByText('No configurations match these filters.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });

  it('the selected count stays correct even once its group is filtered out of view (MD-4)', async () => {
    mockLibrary((query) => {
      const subjectId = query.get('subject_id');
      if (!subjectId) return ALL_CONFIGS;
      return subjectId === 's1' ? [configRecall, configRecognition] : [configBasics];
    });
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');

    await user.click(screen.getByRole('radio', { name: 'Recall' })); // deck d1, subject s1

    // Filtering to subject s2 drops d1's group — and the Recall radio — from view.
    await user.click(screen.getByPlaceholderText('All subjects'));
    await user.click(await screen.findByRole('option', { name: 'Beta' }));

    await waitFor(() => expect(screen.queryByText('Recall')).not.toBeInTheDocument());
    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });

  it('New configuration carries the current filters, and auto-selects the config it returns', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/practice/new?subject=s1&deck=d1');
    await screen.findByText('Recall');

    await user.click(screen.getByRole('button', { name: 'New configuration' }));

    // Decoded via URLSearchParams, not compared as an encoded string literal (ADR 024).
    const [path, search] = (screen.getByTestId('new-config-location').textContent ?? '').split('?');
    const params = new URLSearchParams(search);
    expect(path).toBe('/deck-configurations/new');
    expect(params.get('subject')).toBe('s1');
    expect(params.get('deck')).toBe('d1');
    expect(params.get('returnTo')).toBe('/practice/new?subject=s1&deck=d1');

    await user.click(screen.getByRole('button', { name: 'Finish new config' }));

    expect(await screen.findByRole('radio', { name: 'Recognition' })).toBeChecked();
  });

  it('Cancel returns to the practice list, keeping the current filters', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/practice/new?subject=s1');
    await screen.findByText('Recall');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/practice?subject=s1');
  });
});
