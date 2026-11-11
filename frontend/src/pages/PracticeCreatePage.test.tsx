// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import PracticeCreatePage from 'src/pages/PracticeCreatePage';
import { MISSING_CONFIGURATION_MESSAGE, NO_CARDS_MESSAGE } from 'src/lib/practiceCopy';
import { useViewParams } from 'src/lib/viewParams';

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

const decks = [
  {
    id: 'd1',
    name: 'Commands',
    created_at: '',
    last_activity_at: '',
    card_count: 2,
    readiness: 0.5,
    field_names: [],
  },
  {
    id: 'd2',
    name: 'Ports',
    created_at: '',
    last_activity_at: '',
    card_count: 2,
    readiness: 0.5,
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
    deck_name: 'Commands',
    ...overrides,
  };
}

const configRecall = config();
const configRecognition = config({ id: 'c2', name: 'Recognition' });
const configBasics = config({
  id: 'c3',
  deck_id: 'd2',
  name: 'Basics',
  deck_name: 'Ports',
});

const ALL_CONFIGS = [configRecall, configRecognition, configBasics];

/** Records what the page asked the server for — same shape as
 * PracticeOverviewPage.test.tsx's mockLibrary. */
function mockLibrary(configsFor: (query: URLSearchParams) => unknown[] = () => ALL_CONFIGS) {
  const requests: URLSearchParams[] = [];
  server.use(
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
 * showing — the page's own URL writes included. */
function CurrentLocationProbe() {
  const location = useLocation();
  return <span data-testid="current-location">{`${location.pathname}${location.search}`}</span>;
}

/** True when `first` comes before `second` in the document. */
function precedes(first: Element, second: Element) {
  return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

/** Decoded via URLSearchParams, never compared as an encoded string literal. */
function currentLocation() {
  const full = screen.getByTestId('current-location').textContent ?? '';
  const [pathname, search = ''] = full.split('?');
  return { full, pathname, params: new URLSearchParams(search) };
}

/** Stands in for DeckConfigurationEditor's create route: records where it was carried
 * to, and on "Finish" plays back the same round trip the real builder makes — navigate
 * to `returnTo` (a URL param, not state) with `state: {configurationId}`. */
function NewConfigStub() {
  const location = useLocation();
  const navigate = useNavigate();
  const { params } = useViewParams();
  return (
    <div>
      <span data-testid="new-config-location">{`${location.pathname}${location.search}`}</span>
      <button
        type="button"
        onClick={() =>
          navigate(params.get('returnTo') ?? '/practice/new', {
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
        <Route path="/deck-configurations/:configId/edit" element={<LocationProbe />} />
      </Routes>
    </>,
    [initialPath],
  );
}

/** Serves every configuration unfiltered, and holds any filtered answer until `release`
 * is called, so a test can look at the page between the filter's write and the new list. */
function holdFilteredConfigs(respond: () => Response) {
  mockLibrary();
  let release = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const filteredRequests: URLSearchParams[] = [];
  server.use(
    http.get(`${BASE}/api/deck_practice_configs`, async ({ request }) => {
      const query = new URL(request.url).searchParams;
      if (query.get('deck_id') === null) return HttpResponse.json(ALL_CONFIGS);
      filteredRequests.push(query);
      await released;
      return respond();
    }),
  );
  return { filteredRequests, release };
}

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  leaveCalls.mockClear();
});
afterEach(() => {
  consoleError.mockRestore();
  server.resetHandlers();
});

describe('PracticeCreatePage', () => {
  it('groups configurations by deck, each group named by its deck alone', async () => {
    mockLibrary();
    renderCreate();

    const commandsGroup = await screen.findByRole('group', { name: 'Commands' });
    const portsGroup = screen.getByRole('group', { name: 'Ports' });

    expect(within(commandsGroup).getByText('Recall')).toBeInTheDocument();
    expect(within(commandsGroup).getByText('Recognition')).toBeInTheDocument();
    expect(within(portsGroup).getByText('Basics')).toBeInTheDocument();
    expect(screen.queryByText(/Alpha|Beta/)).not.toBeInTheDocument();
  });

  it("holds the deck filter alone, each deck's row reading its name alone", async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');

    expect(within(screen.getByTestId('practice-filters')).getAllByRole('combobox')).toHaveLength(1);
    await user.click(screen.getByPlaceholderText('All decks'));
    const rows = screen.getAllByRole('option');
    // The first row is "All decks".
    expect(rows.map((row) => row.textContent)).toEqual(['All decks', 'Commands', 'Ports']);
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
    expect(screen.getByRole('button', { name: 'Create' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('the selection rides the URL as repeated config params, in tick order', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');

    await user.click(screen.getByRole('checkbox', { name: 'Recall' }));
    await user.click(screen.getByRole('checkbox', { name: 'Basics' }));

    expect(currentLocation().pathname).toBe('/practice/new');
    expect(currentLocation().params.getAll('config')).toEqual(['c1', 'c3']);
  });

  it('mounting with config params shows them ticked and counted', async () => {
    mockLibrary();
    renderCreate('/practice/new?config=c1&config=c3');

    expect(await screen.findByRole('checkbox', { name: 'Recall' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Basics' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Recognition' })).not.toBeChecked();
    expect(within(screen.getByTestId('form-bar')).getByText('2 selected')).toBeInTheDocument();
  });

  it('Create is pressable and reads not ready with each unmet condition shown by its own hint, mirroring the builder’s Save', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');
    const create = screen.getByRole('button', { name: 'Create' });
    const selectHint = 'Select at least one configuration to practice.';
    const nameHint = 'Give this practice a name to create it.';

    expect(create).toHaveAttribute('aria-disabled', 'true');
    expect(create).not.toBeDisabled();
    expect(screen.getByText(selectHint)).toBeInTheDocument();
    expect(screen.queryByText(nameHint)).not.toBeInTheDocument(); // the name arrives prefilled

    await user.click(screen.getByRole('checkbox', { name: 'Recall' }));
    expect(create).not.toHaveAttribute('aria-disabled');
    expect(screen.queryByText(selectHint)).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Name'));
    expect(screen.getByText(nameHint)).toBeInTheDocument();
    expect(screen.queryByText(selectHint)).not.toBeInTheDocument();
    expect(create).toHaveAttribute('aria-disabled', 'true');
    expect(create).not.toBeDisabled();

    // The two hints are independent: with neither condition met, both show.
    await user.click(screen.getByRole('checkbox', { name: 'Recall' }));
    expect(screen.getByText(nameHint)).toBeInTheDocument();
    expect(screen.getByText(selectHint)).toBeInTheDocument();
    expect(create).toHaveAttribute('aria-disabled', 'true');
    expect(create).not.toBeDisabled();
  });

  it('the Name input sits under the header, above the filters (MD-7)', async () => {
    mockLibrary();
    renderCreate();
    await screen.findByText('Recall');

    expect(
      precedes(screen.getByLabelText('Name'), screen.getByPlaceholderText('All decks')),
    ).toBe(true);
  });

  it('the filters sit above the first configuration group', async () => {
    mockLibrary();
    renderCreate();
    await screen.findByText('Recall');

    const [firstGroup] = screen.getAllByRole('group');
    expect(precedes(screen.getByPlaceholderText('All decks'), firstGroup!)).toBe(true);
  });

  it('Selected sits below the last configuration group', async () => {
    mockLibrary();
    renderCreate();
    await screen.findByText('Recall');

    const lastGroup = screen.getAllByRole('group').at(-1)!;
    expect(precedes(lastGroup, screen.getByRole('region', { name: 'Selected' }))).toBe(true);
  });

  it('with three configurations ticked across three decks, the filters stay above the first group and Selected below it', async () => {
    const configThirdDeck = config({
      id: 'c4',
      deck_id: 'd3',
      name: 'Listening',
      deck_name: 'Third Deck',
    });
    mockLibrary(() => [...ALL_CONFIGS, configThirdDeck]);
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');

    await user.click(screen.getByRole('checkbox', { name: 'Recall' }));
    await user.click(screen.getByRole('checkbox', { name: 'Basics' }));
    await user.click(screen.getByRole('checkbox', { name: 'Listening' }));
    expect(within(screen.getByTestId('form-bar')).getByText('3 selected')).toBeInTheDocument();

    const [firstGroup] = screen.getAllByRole('group');
    expect(precedes(screen.getByPlaceholderText('All decks'), firstGroup!)).toBe(true);
    expect(precedes(firstGroup!, screen.getByRole('region', { name: 'Selected' }))).toBe(true);
  });

  it('the name is prefilled with no name param, and an edit writes the name param', async () => {
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

  it('the typed name survives the New configuration… round trip', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');

    const nameInput = screen.getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Exam cram');
    await user.click(screen.getByRole('button', { name: 'New configuration…' }));
    await user.click(screen.getByRole('button', { name: 'Finish new config' }));

    expect(await screen.findByLabelText('Name')).toHaveValue('Exam cram');
  });

  it('an empty name param gives an empty input, the name hint, and a Create that reads not ready', async () => {
    mockLibrary();
    renderCreate('/practice/new?name=&config=c1');
    await screen.findByRole('checkbox', { name: 'Recall' });

    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByText('Give this practice a name to create it.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toHaveAttribute('aria-disabled', 'true');
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
    expect(leaveCalls).toHaveBeenCalledExactlyOnceWith('/practice/ps9');
  });

  it('with returnTo, Create lands on returnTo, and cancelTo never stands in for it', async () => {
    mockLibrary();
    server.use(
      http.post(`${BASE}/api/practice_runs`, () =>
        HttpResponse.json(
          { id: 'ps9', user_id: 'u1', name: 'Run', status: 'active', created_at: '' },
          { status: 201 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderCreate('/practice/new?config=c1&cancelTo=%2Fother&returnTo=%2Fpractice%3Fdeck%3Dd1');
    await screen.findByRole('checkbox', { name: 'Recall' });

    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(currentLocation().full).toBe('/practice?deck=d1'));
    expect(leaveCalls).toHaveBeenCalledExactlyOnceWith('/practice?deck=d1');
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

    expect(await screen.findByText(MISSING_CONFIGURATION_MESSAGE)).toBeInTheDocument();
    await waitFor(() => expect(calls).toBeGreaterThan(callsAfterLoad));
    // Removed from the selection the same way the settled-list check removes it.
    expect(screen.getByRole('checkbox', { name: 'Recall' })).not.toBeChecked();
    expect(currentLocation().params.getAll('config')).not.toContain('c1');
  });

  it('a selection the settled list lacks is removed with the sentence, the rest kept (MD-4)', async () => {
    mockLibrary();
    let posted = false;
    server.use(
      http.post(`${BASE}/api/practice_runs`, () => {
        posted = true;
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    renderCreate('/practice/new?config=c1&config=gone');
    await screen.findByRole('checkbox', { name: 'Recall' });

    expect(await screen.findByText(MISSING_CONFIGURATION_MESSAGE)).toBeInTheDocument();
    await waitFor(() => expect(currentLocation().params.getAll('config')).toEqual(['c1']));
    expect(screen.getByRole('checkbox', { name: 'Recall' })).toBeChecked();
    expect(within(screen.getByTestId('form-bar')).getByText('1 selected')).toBeInTheDocument();
    const items = within(screen.getByRole('region', { name: 'Selected' })).getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('Recall');
    expect(posted).toBe(false);
  });

  it('a selection that vanished entirely still warns, and leaves nothing selected (MD-4)', async () => {
    mockLibrary();
    renderCreate('/practice/new?config=gone');
    await screen.findByRole('checkbox', { name: 'Recall' });

    expect(
      await within(screen.getByTestId('form-bar')).findByText(MISSING_CONFIGURATION_MESSAGE),
    ).toBeInTheDocument();
    await waitFor(() => expect(currentLocation().params.has('config')).toBe(false));
    expect(screen.queryByText(/\d+ selected/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toHaveAttribute('aria-disabled', 'true');
    expect(
      within(screen.getByRole('region', { name: 'Selected' })).getByText(
        'Select at least one configuration to practice.',
      ),
    ).toBeInTheDocument();
  });

  it('a selection missing only from the cached list is kept: only settled data counts (MD-4)', async () => {
    mockLibrary(); // the server has all three
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // A stale cache that predates Basics, as after a round trip that created it.
    queryClient.setQueryData(['deck_practice_configs', null, null], [configRecall]);
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/practice/new?config=c3']}>
          <CurrentLocationProbe />
          <Routes>
            <Route path="/practice/new" element={<PracticeCreatePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('checkbox', { name: 'Basics' })).toBeChecked();
    expect(currentLocation().params.getAll('config')).toEqual(['c3']);
    expect(screen.queryByText(MISSING_CONFIGURATION_MESSAGE)).not.toBeInTheDocument();
  });

  it('when the list of all configurations fails to load, nothing is removed and Create sends the selection', async () => {
    mockLibrary();
    let sent: Record<string, unknown> | null = null;
    server.use(
      http.get(`${BASE}/api/deck_practice_configs`, ({ request }) => {
        const query = new URL(request.url).searchParams;
        if (!query.has('deck_id')) {
          return HttpResponse.json({ detail: 'boom' }, { status: 500 });
        }
        return HttpResponse.json([configRecall, configRecognition]);
      }),
      http.post(`${BASE}/api/practice_runs`, async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { id: 'ps9', user_id: 'u1', name: sent.name, status: 'active', created_at: '' },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderCreate('/practice/new?deck=d1&config=c1');
    await screen.findByRole('checkbox', { name: 'Recall' });
    await screen.findByText('Could not load your selected configurations.');

    expect(screen.queryByText(MISSING_CONFIGURATION_MESSAGE)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(sent).not.toBeNull());
    expect(sent!.deck_practice_config_ids).toEqual(['c1']);
  });

  it('duplicate_deck and any other error render inside the bar', async () => {
    mockLibrary();
    server.use(
      http.post(`${BASE}/api/practice_runs`, () =>
        HttpResponse.json({ detail: 'boom' }, { status: 400 }),
      ),
    );
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');

    await user.click(screen.getByRole('checkbox', { name: 'Recall' }));
    await user.click(screen.getByRole('button', { name: 'Create' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong.');
    expect(screen.getByTestId('form-bar')).toContainElement(alert);
  });

  it('a failed Create stands above the count, and the count above the buttons, in the bar', async () => {
    mockLibrary();
    server.use(
      http.post(`${BASE}/api/practice_runs`, () =>
        HttpResponse.json({ detail: 'boom' }, { status: 400 }),
      ),
    );
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');

    await user.click(screen.getByRole('checkbox', { name: 'Recall' }));
    await user.click(screen.getByRole('button', { name: 'Create' }));

    const bar = screen.getByTestId('form-bar');
    const alert = await within(bar).findByRole('alert');
    const count = within(bar).getByText('1 selected');
    expect(precedes(alert, count)).toBe(true);
    expect(precedes(count, within(bar).getByRole('button', { name: 'Cancel' }))).toBe(true);
    expect(
      precedes(
        within(bar).getByRole('button', { name: 'Cancel' }),
        within(bar).getByRole('button', { name: 'Create' }),
      ),
    ).toBe(true);
  });

  it('with nothing selected, the bar shows no count', async () => {
    mockLibrary();
    renderCreate();
    await screen.findByText('Recall');

    expect(within(screen.getByTestId('form-bar')).queryByText(/selected/)).not.toBeInTheDocument();
  });

  it('the heading is the first thing on the page and stays outside the bar', async () => {
    mockLibrary();
    renderCreate();
    await screen.findByText('Recall');

    const heading = screen.getByRole('heading', { level: 1, name: 'New practice' });
    expect(heading.closest('[data-reveal-clear]')).toBeNull();
    expect(precedes(heading, screen.getByLabelText('Name'))).toBe(true);
  });

  it('no configurations at all shows the true-empty state with a New configuration… button', async () => {
    mockLibrary(() => []);
    renderCreate();

    expect(await screen.findByText('No configurations yet.')).toBeInTheDocument();
    // The always-visible add control above the list is the only one; the empty
    // state is its text alone. getByRole throws on a second match.
    expect(screen.getByRole('button', { name: 'New configuration…' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });

  it('filters matching zero configurations offer Clear filters instead', async () => {
    mockLibrary((query) => (query.get('deck_id') === 'd1' ? [] : ALL_CONFIGS));
    renderCreate('/practice/new?deck=d1');

    expect(await screen.findByText('No configurations match these filters.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });

  it('Clear filters drops only the filters, keeping the selection', async () => {
    mockLibrary((query) => (query.get('deck_id') === 'd1' ? [] : ALL_CONFIGS));
    const user = userEvent.setup();
    renderCreate('/practice/new?deck=d1&config=c3');
    await screen.findByText('No configurations match these filters.');

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(currentLocation().pathname).toBe('/practice/new');
    expect(currentLocation().params.has('deck')).toBe(false);
    expect(currentLocation().params.getAll('config')).toEqual(['c3']);
    expect(await screen.findByRole('checkbox', { name: 'Basics' })).toBeChecked();
  });

  it('a selection a filter hides stays listed under Selected and counted (MD-3, MD-5)', async () => {
    mockLibrary((query) => {
      const deckId = query.get('deck_id');
      if (!deckId) return ALL_CONFIGS;
      return deckId === 'd1' ? [configRecall, configRecognition] : [configBasics];
    });
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');

    await user.click(screen.getByRole('checkbox', { name: 'Recall' })); // deck d1

    // Filtering to deck d2 drops d1's group — and the Recall checkbox — from view.
    await user.click(screen.getByPlaceholderText('All decks'));
    await user.click(await screen.findByRole('option', { name: 'Ports' }));

    await waitFor(() =>
      expect(screen.queryByRole('checkbox', { name: 'Recall' })).not.toBeInTheDocument(),
    );
    const selected = screen.getByRole('region', { name: 'Selected' });
    expect(within(selected).getByText('Recall')).toBeInTheDocument();
    expect(within(screen.getByTestId('form-bar')).getByText('1 selected')).toBeInTheDocument();
  });

  it("Selected lists every selection in the configurations' order, with its deck alone", async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');

    await user.click(screen.getByRole('checkbox', { name: 'Basics' }));
    await user.click(screen.getByRole('checkbox', { name: 'Recall' }));

    const items = within(screen.getByRole('region', { name: 'Selected' })).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Recall');
    expect(items[0]).toHaveTextContent(/^RecallCommands/);
    expect(items[1]).toHaveTextContent(/^BasicsPorts/);
    expect(items[0]).not.toHaveTextContent(/Alpha/);
    expect(items[1]).not.toHaveTextContent(/Beta/);
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
        if (!query.has('deck_id')) {
          return HttpResponse.json({ detail: 'boom' }, { status: 500 });
        }
        return HttpResponse.json([configRecall, configRecognition]);
      }),
    );
    renderCreate('/practice/new?deck=d1&config=c1');

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
        'Select at least one configuration to practice.',
      ),
    ).toBeInTheDocument();
  });

  it('a filtered page also requests every configuration, unfiltered (MD-3)', async () => {
    const requests = mockLibrary();
    renderCreate('/practice/new?deck=d1');
    await screen.findByText('Recall');

    await waitFor(() =>
      expect(requests.some((query) => !query.has('deck_id'))).toBe(
        true,
      ),
    );
  });

  it('New configuration… carries the current filters, and auto-selects the config it returns', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/practice/new?deck=d1');
    await screen.findByText('Recall');

    await user.click(screen.getByRole('button', { name: 'New configuration…' }));

    // Decoded via URLSearchParams, not compared as an encoded string literal.
    const [path, search] = (screen.getByTestId('new-config-location').textContent ?? '').split('?');
    const params = new URLSearchParams(search);
    expect(path).toBe('/deck-configurations/new');
    expect(params.get('deck')).toBe('d1');
    expect(params.get('cancelTo')).toBe('/practice/new?deck=d1');
    expect(params.get('returnTo')).toBe('/practice/new?deck=d1');

    await user.click(screen.getByRole('button', { name: 'Finish new config' }));

    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: 'Recognition' })).toBeChecked(),
    );
    expect(currentLocation().params.getAll('config')).toEqual(['c2']);
  });

  it('the New configuration… round trip keeps the draft, and the returned config replaces its deck’s tick', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');

    await user.click(screen.getByRole('checkbox', { name: 'Recall' })); // deck d1
    await user.click(screen.getByRole('checkbox', { name: 'Basics' })); // deck d2
    await user.click(screen.getByRole('button', { name: 'New configuration…' }));

    // The draft left with both addresses, so it comes back with either.
    const params = new URLSearchParams(
      (screen.getByTestId('new-config-location').textContent ?? '').split('?')[1],
    );
    expect(params.get('cancelTo')).toBe('/practice/new?config=c1&config=c3');
    expect(params.get('returnTo')).toBe('/practice/new?config=c1&config=c3');

    // The stub hands back c2 — Recognition, in Recall's deck d1.
    await user.click(screen.getByRole('button', { name: 'Finish new config' }));

    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: 'Recognition' })).toBeChecked(),
    );
    expect(screen.getByRole('checkbox', { name: 'Basics' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Recall' })).not.toBeChecked();
    expect(within(screen.getByTestId('form-bar')).getByText('2 selected')).toBeInTheDocument();
    expect(currentLocation().params.getAll('config')).toEqual(['c3', 'c2']);
  });

  it('a row’s pencil opens Edit configuration with both addresses set to the page’s full URL (MD-6)', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate('/practice/new?deck=d1&config=c1&name=Exam');
    await screen.findByRole('checkbox', { name: 'Recall' });

    await user.click(screen.getByRole('button', { name: 'Edit Recognition' }));

    const landed = currentLocation();
    expect(landed.pathname).toBe('/deck-configurations/c2/edit');
    expect(landed.params.get('cancelTo')).toBe('/practice/new?deck=d1&config=c1&name=Exam');
    expect(landed.params.get('returnTo')).toBe('/practice/new?deck=d1&config=c1&name=Exam');
    // Opening Edit configuration from inside this form is not leaving it.
    expect(leaveCalls).not.toHaveBeenCalled();
  });

  it('tapping a row’s label still ticks it and stays on the page (MD-6)', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate();
    await screen.findByRole('checkbox', { name: 'Recognition' });

    await user.click(screen.getByText('Recognition'));

    expect(screen.getByRole('checkbox', { name: 'Recognition' })).toBeChecked();
    expect(currentLocation().pathname).toBe('/practice/new');
  });

  it.each([
    {
      given: 'cancelTo',
      search: '&cancelTo=%2Fpractice%3Fdeck%3Dd1%26status%3Dcompleted&returnTo=%2Fother',
      cancel: '/practice?deck=d1&status=completed',
    },
    { given: 'returnTo alone', search: '&returnTo=%2Fother', cancel: '/practice' },
    { given: 'a non-internal cancelTo', search: '&cancelTo=https%3A%2F%2Fevil.com', cancel: '/practice' },
    { given: 'neither', search: '', cancel: '/practice' },
  ])('with $given, Cancel lands on $cancel and none of the draft', async ({ search, cancel }) => {
    mockLibrary();
    const user = userEvent.setup();
    renderCreate(`/practice/new?deck=d1&status=completed&config=c1${search}`);
    await screen.findByRole('checkbox', { name: 'Recall' });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(currentLocation().full).toBe(cancel));
    expect(leaveCalls).toHaveBeenCalledExactlyOnceWith(cancel);
  });

  it('a filter whose list is loading keeps the old row until the new list arrives', async () => {
    const { filteredRequests, release } = holdFilteredConfigs(() =>
      HttpResponse.json([configBasics]),
    );
    const user = userEvent.setup();
    renderCreate();
    await screen.findByRole('checkbox', { name: 'Recall' });

    await user.click(screen.getByPlaceholderText('All decks'));
    await user.click(await screen.findByRole('option', { name: 'Ports' }));

    await waitFor(() => expect(filteredRequests).toHaveLength(1));
    expect(currentLocation().params.get('deck')).toBe('d2');
    expect(screen.getByRole('checkbox', { name: 'Recall' })).toBeInTheDocument();

    release();

    await waitFor(() =>
      expect(screen.queryByRole('checkbox', { name: 'Recall' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('group', { name: 'Ports' })).toBeInTheDocument();
  });

  it('a filter whose list fails removes the old row and says so', async () => {
    const { filteredRequests, release } = holdFilteredConfigs(() =>
      HttpResponse.json({ detail: 'boom' }, { status: 500 }),
    );
    const user = userEvent.setup();
    renderCreate();
    await screen.findByRole('checkbox', { name: 'Recall' });

    await user.click(screen.getByPlaceholderText('All decks'));
    await user.click(await screen.findByRole('option', { name: 'Ports' }));

    await waitFor(() => expect(filteredRequests).toHaveLength(1));
    expect(screen.getByRole('checkbox', { name: 'Recall' })).toBeInTheDocument();

    release();

    expect(await screen.findByText('Could not load configurations.')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Recall' })).not.toBeInTheDocument();
  });

  it('a configuration ticked while the list loads stays selected after a list that omits it', async () => {
    const { filteredRequests, release } = holdFilteredConfigs(() =>
      HttpResponse.json([configBasics]),
    );
    const user = userEvent.setup();
    renderCreate();
    await screen.findByRole('checkbox', { name: 'Recall' });

    await user.click(screen.getByPlaceholderText('All decks'));
    await user.click(await screen.findByRole('option', { name: 'Ports' }));
    await waitFor(() => expect(filteredRequests).toHaveLength(1));

    await user.click(screen.getByRole('checkbox', { name: 'Recall' }));
    expect(screen.getByRole('checkbox', { name: 'Recall' })).toBeChecked();
    expect(currentLocation().params.getAll('config')).toEqual(['c1']);

    release();

    await waitFor(() =>
      expect(screen.queryByRole('checkbox', { name: 'Recall' })).not.toBeInTheDocument(),
    );
    expect(currentLocation().params.getAll('config')).toEqual(['c1']);
    const selected = screen.getByRole('region', { name: 'Selected' });
    expect(within(selected).getByText('Recall')).toBeInTheDocument();
    expect(within(screen.getByTestId('form-bar')).getByText('1 selected')).toBeInTheDocument();
  });
});

describe('PracticeCreatePage — bringing a part of the form and its sentence on screen', () => {
  let scrollBy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    scrollBy = vi.spyOn(window, 'scrollBy');
  });
  afterEach(() => scrollBy.mockRestore());

  const posted = () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(`${BASE}/api/practice_runs`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ detail: 'boom' }, { status: 500 });
      }),
    );
    return bodies;
  };

  it('a tap of Create with nothing ticked posts nothing and moves the page once', async () => {
    mockLibrary();
    const bodies = posted();
    const user = userEvent.setup();
    renderCreate();
    await screen.findByText('Recall');

    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(bodies).toEqual([]);
  });

  it('a tap of Create with a blank name posts nothing and moves the page once', async () => {
    mockLibrary();
    const bodies = posted();
    const user = userEvent.setup();
    renderCreate('/practice/new?name=&config=c1');
    await screen.findByRole('checkbox', { name: 'Recall' });

    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(bodies).toEqual([]);
  });
});
