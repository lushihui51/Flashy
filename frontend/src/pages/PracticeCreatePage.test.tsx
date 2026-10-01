// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import PracticeCreatePage from 'src/pages/PracticeCreatePage';
import { NO_CARDS_MESSAGE } from 'src/lib/practiceCopy';

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

/** A landing route's stand-in: shows where a navigation away from the page ended. */
function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

/** Rendered outside `<Routes>`, so it reports the current location whichever route is
 * showing — the page's own URL writes (ADR 061) included. */
function CurrentLocationProbe() {
  const location = useLocation();
  return (
    <span data-testid="current-location">{`${location.pathname}${location.search}`}</span>
  );
}

/** True when `first` comes before `second` in the document. */
function precedes(first: Element, second: Element) {
  return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

/** Decoded via URLSearchParams, never compared as an encoded string literal (ADR 024). */
function currentLocation() {
  const full = screen.getByTestId('current-location').textContent ?? '';
  const [pathname, search = ''] = full.split('?');
  return { full, pathname, params: new URLSearchParams(search) };
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
    <>
      <CurrentLocationProbe />
      <Routes>
        <Route path="/practice/new" element={<PracticeCreatePage />} />
        <Route path="/practice" element={<LocationProbe />} />
        <Route path="/practice/:practiceSessionId" element={<LocationProbe />} />
        <Route path="/deck-configurations/new" element={<NewConfigStub />} />
      </Routes>
    </>,
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

  it('a checkbox per configuration: at most one ticked per deck, and a tick can be cleared (MD-1)', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');

    await user.click(screen.getByRole('checkbox', { name: 'Recall' }));
    expect(screen.getByRole('checkbox', { name: 'Recall' })).toBeChecked();

    await user.click(screen.getByRole('checkbox', { name: 'Recognition' }));
    expect(screen.getByRole('checkbox', { name: 'Recognition' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Recall' })).not.toBeChecked();

    await user.click(screen.getByRole('checkbox', { name: 'Recognition' }));
    expect(screen.getByRole('checkbox', { name: 'Recognition' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Recall' })).not.toBeChecked();
    expect(screen.queryByText(/\d+ selected/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('the selection rides the URL as repeated config params, in tick order (ADR 061)', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');

    await user.click(screen.getByRole('checkbox', { name: 'Recall' }));
    await user.click(screen.getByRole('checkbox', { name: 'Basics' }));

    expect(currentLocation().pathname).toBe('/practice/new');
    expect(currentLocation().params.getAll('config')).toEqual(['c1', 'c3']);
  });

  it('mounting with config params shows them ticked and counted (ADR 061)', async () => {
    mockLibrary();
    renderCreate('/practice/new?config=c1&config=c3');

    expect(await screen.findByRole('checkbox', { name: 'Recall' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Basics' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Recognition' })).not.toBeChecked();
    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });

  it('Create stays disabled with each unmet condition shown by its own hint, mirroring the builder’s Save', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');
    const create = screen.getByRole('button', { name: 'Create' });
    const selectHint = 'Select at least one configuration to practise.';
    const nameHint = 'Give this practice a name to create it.';

    expect(create).toBeDisabled();
    expect(screen.getByText(selectHint)).toBeInTheDocument();
    expect(screen.queryByText(nameHint)).not.toBeInTheDocument(); // the name arrives prefilled

    await user.click(screen.getByRole('checkbox', { name: 'Recall' }));
    expect(create).toBeEnabled();
    expect(screen.queryByText(selectHint)).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Name'));
    expect(screen.getByText(nameHint)).toBeInTheDocument();
    expect(screen.queryByText(selectHint)).not.toBeInTheDocument();
    expect(create).toBeDisabled();

    // The two hints are independent (MD-7): with neither condition met, both show.
    await user.click(screen.getByRole('checkbox', { name: 'Recall' }));
    expect(screen.getByText(nameHint)).toBeInTheDocument();
    expect(screen.getByText(selectHint)).toBeInTheDocument();
    expect(create).toBeDisabled();
  });

  it('the Name input sits under the header, above the filters (MD-7)', async () => {
    mockLibrary();
    renderCreate();
    await screen.findByText('Recall');

    expect(precedes(screen.getByLabelText('Name'), screen.getByPlaceholderText('All subjects'))).toBe(
      true,
    );
  });

  it('the name is prefilled with no name param, and an edit writes the name param (ADR 061)', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');

    const nameInput = screen.getByLabelText('Name');
    expect(nameInput).not.toHaveValue('');
    expect(currentLocation().params.has('name')).toBe(false);

    await user.clear(nameInput);
    await user.type(nameInput, 'Exam cram');

    expect(nameInput).toHaveValue('Exam cram');
    expect(currentLocation().params.get('name')).toBe('Exam cram');
  });

  it('the typed name survives the New configuration round trip (ADR 061)', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');

    const nameInput = screen.getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Exam cram');
    await user.click(screen.getByRole('button', { name: 'New configuration' }));
    await user.click(screen.getByRole('button', { name: 'Finish new config' }));

    expect(await screen.findByLabelText('Name')).toHaveValue('Exam cram');
  });

  it('an empty name param gives an empty input, the name hint, and a disabled Create', async () => {
    mockLibrary();
    renderCreate('/practice/new?name=&config=c1');
    await screen.findByRole('checkbox', { name: 'Recall' });

    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByText('Give this practice a name to create it.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('a name param fills the input', async () => {
    mockLibrary();
    renderCreate('/practice/new?name=Exam%20cram');
    await screen.findByText('Recall');

    expect(screen.getByLabelText('Name')).toHaveValue('Exam cram');
  });

  it('creates a session from the selected configs and name, then navigates to it', async () => {
    mockLibrary();
    let sent: Record<string, unknown> | null = null;
    server.use(
      http.post(`${BASE}/api/practice_runs`, async ({ request }) => {
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

    await user.click(screen.getByRole('checkbox', { name: 'Recall' })); // deck d1
    await user.click(screen.getByRole('checkbox', { name: 'Basics' })); // deck d2
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
      http.post(`${BASE}/api/practice_runs`, () =>
        HttpResponse.json(
          { detail: { code: 'stale_config', message: 'stale', config_id: 'c1' } },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');

    await user.click(screen.getByRole('checkbox', { name: 'Recall' }));
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(
      await screen.findByText('This configuration no longer produces any prompts — edit it.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Recall' })).toBeChecked();
  });

  it('no_cards shows the no-cards sentence above the list and keeps the selection', async () => {
    mockLibrary();
    server.use(
      http.post(`${BASE}/api/practice_runs`, () =>
        HttpResponse.json(
          {
            detail: {
              code: 'no_cards',
              message: 'generation produced no practice cards across the selected decks',
              config_id: null,
            },
          },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');

    await user.click(screen.getByRole('checkbox', { name: 'Recall' }));
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText(NO_CARDS_MESSAGE)).toBeInTheDocument();
    // The selection survives, so the user can swap the configuration out in place.
    expect(screen.getByRole('checkbox', { name: 'Recall' })).toBeChecked();
  });

  it('config_not_found shows a top-of-list message and refetches the list', async () => {
    mockLibrary();
    let calls = 0;
    server.use(
      http.get(`${BASE}/api/deck_practice_configs`, () => {
        calls += 1;
        return HttpResponse.json(ALL_CONFIGS);
      }),
      http.post(`${BASE}/api/practice_runs`, () =>
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

    await user.click(screen.getByRole('checkbox', { name: 'Recall' }));
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(
      await screen.findByText('A selected configuration no longer exists.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(calls).toBeGreaterThan(callsAfterLoad));
  });

  it('duplicate_deck and any other error render as a banner above the configuration list', async () => {
    mockLibrary();
    server.use(
      http.post(`${BASE}/api/practice_runs`, () =>
        HttpResponse.json({ detail: 'Something went wrong' }, { status: 400 }),
      ),
    );
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');

    await user.click(screen.getByRole('checkbox', { name: 'Recall' }));
    await user.click(screen.getByRole('button', { name: 'Create' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong');
    expect(precedes(alert, screen.getByRole('checkbox', { name: 'Recall' }))).toBe(true);
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

  it('Clear filters drops only the filters, keeping the selection (ADR 061)', async () => {
    mockLibrary((query) => (query.get('subject_id') === 's1' ? [] : ALL_CONFIGS));
    const user = userEvent.setup();
    renderCreate('/practice/new?subject=s1&config=c3');
    await screen.findByText('No configurations match these filters.');

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(currentLocation().pathname).toBe('/practice/new');
    expect(currentLocation().params.has('subject')).toBe(false);
    expect(currentLocation().params.getAll('config')).toEqual(['c3']);
    expect(await screen.findByRole('checkbox', { name: 'Basics' })).toBeChecked();
  });

  it('a selection a filter hides stays listed under Selected and counted (MD-3, MD-5)', async () => {
    mockLibrary((query) => {
      const subjectId = query.get('subject_id');
      if (!subjectId) return ALL_CONFIGS;
      return subjectId === 's1' ? [configRecall, configRecognition] : [configBasics];
    });
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');

    await user.click(screen.getByRole('checkbox', { name: 'Recall' })); // deck d1, subject s1

    // Filtering to subject s2 drops d1's group — and the Recall checkbox — from view.
    await user.click(screen.getByPlaceholderText('All subjects'));
    await user.click(await screen.findByRole('option', { name: 'Beta' }));

    await waitFor(() =>
      expect(screen.queryByRole('checkbox', { name: 'Recall' })).not.toBeInTheDocument(),
    );
    const selected = screen.getByRole('region', { name: 'Selected' });
    expect(within(selected).getByText('Recall')).toBeInTheDocument();
    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });

  it('Selected lists every selection subject → deck → name, with its deck and subject (MD-5)', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');

    await user.click(screen.getByRole('checkbox', { name: 'Basics' }));
    await user.click(screen.getByRole('checkbox', { name: 'Recall' }));

    const items = within(screen.getByRole('region', { name: 'Selected' })).getAllByRole(
      'listitem',
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Recall');
    expect(items[0]).toHaveTextContent('Shared Deck Name · Alpha');
    expect(items[1]).toHaveTextContent('Basics');
    expect(items[1]).toHaveTextContent('Shared Deck Name · Beta');
  });

  it('Remove unticks the configuration, drops its row, and drops it from the URL', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/practice/new?config=c1&config=c3');
    await screen.findByRole('checkbox', { name: 'Recall' });
    const selected = screen.getByRole('region', { name: 'Selected' });
    await within(selected).findByText('Recall');

    await user.click(screen.getByRole('button', { name: 'Remove Recall' }));

    expect(screen.getByRole('checkbox', { name: 'Recall' })).not.toBeChecked();
    expect(within(selected).queryByText('Recall')).not.toBeInTheDocument();
    expect(within(selected).getByText('Basics')).toBeInTheDocument();
    expect(currentLocation().params.getAll('config')).toEqual(['c3']);
  });

  it('unticking a checkbox removes its Selected row', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/practice/new?config=c1');
    await screen.findByRole('checkbox', { name: 'Recall' });
    const selected = screen.getByRole('region', { name: 'Selected' });
    await within(selected).findByText('Recall');

    await user.click(screen.getByRole('checkbox', { name: 'Recall' }));

    expect(within(selected).queryByText('Recall')).not.toBeInTheDocument();
  });

  it('a selected id that resolves to nothing lists no row', async () => {
    mockLibrary();
    renderCreate('/practice/new?config=gone');
    await screen.findByRole('checkbox', { name: 'Recall' });

    expect(
      within(screen.getByRole('region', { name: 'Selected' })).queryAllByRole('listitem'),
    ).toHaveLength(0);
  });

  it('a failed load of all configurations shows its own error under Selected, and the filtered list still renders (MD-9)', async () => {
    mockLibrary();
    server.use(
      http.get(`${BASE}/api/deck_practice_configs`, ({ request }) => {
        const query = new URL(request.url).searchParams;
        if (!query.has('subject_id') && !query.has('deck_id')) {
          return HttpResponse.json({ detail: 'boom' }, { status: 500 });
        }
        return HttpResponse.json([configRecall, configRecognition]);
      }),
    );
    renderCreate('/practice/new?subject=s1&config=c1');

    expect(await screen.findByRole('checkbox', { name: 'Recall' })).toBeChecked();
    const selected = screen.getByRole('region', { name: 'Selected' });
    expect(
      await within(selected).findByText('Could not load your selected configurations.'),
    ).toBeInTheDocument();
    expect(within(selected).queryAllByRole('listitem')).toHaveLength(0);
  });

  it('with nothing selected, the select hint renders inside Selected', async () => {
    mockLibrary();
    renderCreate();
    await screen.findByText('Recall');

    expect(
      within(screen.getByRole('region', { name: 'Selected' })).getByText(
        'Select at least one configuration to practise.',
      ),
    ).toBeInTheDocument();
  });

  it('a filtered page also requests every configuration, unfiltered (MD-3)', async () => {
    const requests = mockLibrary();
    renderCreate('/practice/new?subject=s1');
    await screen.findByText('Recall');

    await waitFor(() =>
      expect(
        requests.some((query) => !query.has('subject_id') && !query.has('deck_id')),
      ).toBe(true),
    );
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

    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: 'Recognition' })).toBeChecked(),
    );
    expect(currentLocation().params.getAll('config')).toEqual(['c2']);
  });

  it('the New configuration round trip keeps the draft, and the returned config replaces its deck’s tick (ADR 061)', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');

    await user.click(screen.getByRole('checkbox', { name: 'Recall' })); // deck d1
    await user.click(screen.getByRole('checkbox', { name: 'Basics' })); // deck d2
    await user.click(screen.getByRole('button', { name: 'New configuration' }));

    // The draft left with the returnTo, so it comes back with it.
    const params = new URLSearchParams(
      (screen.getByTestId('new-config-location').textContent ?? '').split('?')[1],
    );
    expect(params.get('returnTo')).toBe('/practice/new?config=c1&config=c3');

    // The stub hands back c2 — Recognition, in Recall's deck d1.
    await user.click(screen.getByRole('button', { name: 'Finish new config' }));

    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: 'Recognition' })).toBeChecked(),
    );
    expect(screen.getByRole('checkbox', { name: 'Basics' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Recall' })).not.toBeChecked();
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(currentLocation().params.getAll('config')).toEqual(['c3', 'c2']);
  });

  it('Cancel returns to the practice list with the overview’s own params and none of the draft (ADR 061)', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/practice/new?subject=s1&status=completed&config=c1');
    await screen.findByRole('checkbox', { name: 'Recall' });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    const landed = currentLocation();
    expect(landed.pathname).toBe('/practice');
    expect(landed.params.get('subject')).toBe('s1');
    expect(landed.params.get('status')).toBe('completed');
    expect(landed.params.has('config')).toBe(false);
    expect([...landed.params.keys()].sort()).toEqual(['status', 'subject']);
  });
});
