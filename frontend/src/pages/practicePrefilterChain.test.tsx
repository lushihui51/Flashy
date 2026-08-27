// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import SubjectDetailPage from 'src/pages/SubjectDetailPage';
import DeckDetailPage from 'src/pages/DeckDetailPage';
import PracticeOverviewPage from 'src/pages/PracticeOverviewPage';
import PracticeCreatePage from 'src/pages/PracticeCreatePage';
import DeckConfigurationEditor from 'src/components/library/DeckConfigurationEditor';
import DeckEditor from 'src/components/library/DeckEditor';

const BASE = 'http://localhost:8000';

/**
 * T6: the pre-filter chains walked end to end through the REAL pages — every hop is the
 * production component, so a step that drops context fails here even when each page's
 * own tests pass. The per-page behavior is already covered by each page's test file;
 * these tests only assert the context that travels between pages.
 */

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

const initialDeckSummaries = [
  {
    id: 'd1',
    subject_id: 's1',
    name: 'Alpha Deck',
    created_at: '',
    last_activity_at: '',
    card_count: 0,
    field_names: ['Term', 'Meaning'],
  },
  {
    id: 'd2',
    subject_id: 's2',
    name: 'Beta Deck',
    created_at: '',
    last_activity_at: '',
    card_count: 0,
    field_names: ['Note', 'Tune'],
  },
];

const initialDeckDetails: Record<string, object> = {
  d1: {
    id: 'd1',
    name: 'Alpha Deck',
    subject_id: 's1',
    created_at: '',
    last_activity_at: '',
    field_defs: [
      { id: 'f1', name: 'Term', type: 'text', position: 0 },
      { id: 'f2', name: 'Meaning', type: 'text', position: 1 },
    ],
    cards: [],
  },
  d2: {
    id: 'd2',
    name: 'Beta Deck',
    subject_id: 's2',
    created_at: '',
    last_activity_at: '',
    field_defs: [
      { id: 'f3', name: 'Note', type: 'text', position: 0 },
      { id: 'f4', name: 'Tune', type: 'text', position: 1 },
    ],
    cards: [],
  },
};

const initialConfigs = [
  {
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
    deck_name: 'Alpha Deck',
    subject_id: 's1',
    subject_name: 'Alpha',
  },
  {
    id: 'c2',
    deck_id: 'd2',
    name: 'Basics',
    created_at: '',
    prompt_field_ids: ['f3'],
    answer_field_ids: ['f4'],
    prompt_pool_ids: [] as string[],
    prompt_pool_counts: [] as number[],
    answer_pool_ids: [] as string[],
    answer_pool_counts: [] as number[],
    deck_name: 'Beta Deck',
    subject_id: 's2',
    subject_name: 'Beta',
  },
];

/** A small in-memory library the handlers read AND write — the save-direction walk
 * creates a deck and then a configuration mid-chain, exactly as the dev backend would,
 * so the return legs can only pass if the new rows actually come back on refetch. */
function mockLibrary() {
  const decks = structuredClone(initialDeckSummaries);
  const deckDetails = structuredClone(initialDeckDetails);
  const configs = structuredClone(initialConfigs);
  const configRequests: URLSearchParams[] = [];

  server.use(
    http.get(`${BASE}/api/subjects`, () => HttpResponse.json(subjects)),
    http.get(`${BASE}/api/subjects/:subjectId`, ({ params }) => {
      const subject = subjects.find((s) => s.id === params.subjectId);
      return subject
        ? HttpResponse.json(subject)
        : HttpResponse.json({ detail: 'Subject not found' }, { status: 404 });
    }),
    http.get(`${BASE}/api/decks`, ({ request }) => {
      const subjectId = new URL(request.url).searchParams.get('subject_id');
      return HttpResponse.json(
        subjectId ? decks.filter((deck) => deck.subject_id === subjectId) : decks,
      );
    }),
    http.get(`${BASE}/api/decks/:deckId`, ({ params }) => {
      const detail = deckDetails[params.deckId as string];
      return detail
        ? HttpResponse.json(detail)
        : HttpResponse.json({ detail: 'Deck not found' }, { status: 404 });
    }),
    http.get(`${BASE}/api/practice_sessions`, () => HttpResponse.json([])),
    http.get(`${BASE}/api/deck_practice_configs`, ({ request }) => {
      const query = new URL(request.url).searchParams;
      configRequests.push(query);
      const subjectId = query.get('subject_id');
      const deckId = query.get('deck_id');
      return HttpResponse.json(
        configs.filter(
          (config) =>
            (!subjectId || config.subject_id === subjectId) &&
            (!deckId || config.deck_id === deckId),
        ),
      );
    }),
    http.post(`${BASE}/api/decks`, async ({ request }) => {
      const body = (await request.json()) as {
        name: string;
        subject_id: string;
        field_defs: { name: string; type: string }[];
      };
      const detail = {
        id: 'd9',
        name: body.name,
        subject_id: body.subject_id,
        created_at: '',
        last_activity_at: '',
        field_defs: body.field_defs.map((field, index) => ({
          id: `nf${index + 1}`,
          name: field.name,
          type: field.type,
          position: index,
        })),
        cards: [],
      };
      deckDetails.d9 = detail;
      decks.push({
        id: 'd9',
        subject_id: body.subject_id,
        name: body.name,
        created_at: '',
        last_activity_at: '',
        card_count: 0,
        field_names: body.field_defs.map((field) => field.name),
      });
      return HttpResponse.json(detail, { status: 201 });
    }),
    http.post(`${BASE}/api/deck_practice_configs`, async ({ request }) => {
      const body = (await request.json()) as {
        deck_id: string;
        name: string;
        prompt_field_ids: string[];
        answer_field_ids: string[];
        prompt_pool_ids: string[];
        prompt_pool_counts: number[];
        answer_pool_ids: string[];
        answer_pool_counts: number[];
      };
      const deck = decks.find((d) => d.id === body.deck_id)!;
      const subject = subjects.find((s) => s.id === deck.subject_id)!;
      const saved = { id: 'c9', created_at: '', ...body };
      configs.push({
        ...saved,
        deck_name: deck.name,
        subject_id: subject.id,
        subject_name: subject.name,
      });
      return HttpResponse.json(saved, { status: 201 });
    }),
  );

  return { configRequests };
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

/** Decoded via URLSearchParams, never compared as an encoded string literal (ADR 024). */
function currentLocation() {
  const full = screen.getByTestId('location').textContent ?? '';
  const [pathname, search = ''] = full.split('?');
  return { full, pathname, params: new URLSearchParams(search) };
}

function renderChain(initialPath: string) {
  return renderWithProviders(
    <>
      <LocationProbe />
      <Routes>
        <Route path="/subjects/:subjectId" element={<SubjectDetailPage />} />
        <Route path="/decks/:deckId" element={<DeckDetailPage />} />
        <Route path="/practice" element={<PracticeOverviewPage />} />
        <Route path="/practice/new" element={<PracticeCreatePage />} />
        <Route
          path="/deck-configurations/new"
          element={<DeckConfigurationEditor mode="create" />}
        />
        <Route path="/decks/new" element={<DeckEditor mode="create" />} />
        {/* T5 owns the real details page; the chains never land there. */}
        <Route path="/practice/:practiceSessionId" element={<span>practice detail</span>} />
      </Routes>
    </>,
    [initialPath],
  );
}

// The board's one interaction path (ADR 020): tap the chip, then tap a destination row.
async function assign(user: ReturnType<typeof userEvent.setup>, fieldName: string, label: string) {
  await user.click(screen.getByRole('button', { name: fieldName }));
  const sheet = await screen.findByRole('dialog');
  await user.click(within(sheet).getByRole('button', { name: label }));
}

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  consoleError.mockRestore();
  server.resetHandlers();
});

describe('practice pre-filter chains', () => {
  it('subject page → overview → New practice → New configuration, the subject riding every hop', async () => {
    const { configRequests } = mockLibrary();
    const user = userEvent.setup();
    renderChain('/subjects/s2');

    // Subject page → the overview, pre-filtered to this subject.
    await user.click(await screen.findByRole('button', { name: 'Practice' }));
    expect(currentLocation().pathname).toBe('/practice');
    expect(currentLocation().params.get('subject')).toBe('s2');
    await waitFor(() => expect(screen.getByPlaceholderText('All subjects')).toHaveValue('Beta'));

    // Overview → New practice, still carrying the subject.
    await user.click(screen.getByRole('button', { name: 'New practice' }));
    expect(currentLocation().pathname).toBe('/practice/new');
    expect(currentLocation().params.get('subject')).toBe('s2');

    // The filter reached the server and the list: only Beta's group renders.
    await screen.findByRole('group', { name: 'Beta Deck · Beta' });
    expect(screen.queryByText('Recall')).not.toBeInTheDocument();
    expect(configRequests.at(-1)?.get('subject_id')).toBe('s2');

    // New practice → the builder: subject param and returnTo both ride along, and the
    // context subject's decks sort first in the picker.
    await user.click(screen.getByRole('button', { name: 'New configuration' }));
    const builder = currentLocation();
    expect(builder.pathname).toBe('/deck-configurations/new');
    expect(builder.params.get('subject')).toBe('s2');
    expect(builder.params.get('returnTo')).toBe('/practice/new?subject=s2');

    await user.click(await screen.findByPlaceholderText('Deck'));
    const options = await screen.findAllByRole('option');
    // "New deck…" is last; the first real option belongs to the context subject even
    // though "Alpha Deck" would sort first alphabetically.
    expect(options[0]).toHaveTextContent('Beta Deck');
  });

  it('deck page → overview → New practice → New configuration, both filters riding and the deck pre-selected', async () => {
    const { configRequests } = mockLibrary();
    const user = userEvent.setup();
    renderChain('/decks/d1');

    // Deck page → the overview, pre-filtered to subject AND deck.
    await user.click(await screen.findByRole('button', { name: 'Practice' }));
    expect(currentLocation().pathname).toBe('/practice');
    expect(currentLocation().params.get('subject')).toBe('s1');
    expect(currentLocation().params.get('deck')).toBe('d1');
    await waitFor(() => expect(screen.getByPlaceholderText('All subjects')).toHaveValue('Alpha'));
    expect(screen.getByPlaceholderText('All decks')).toHaveValue('Alpha Deck');

    // Overview → New practice with both filters intact.
    await user.click(screen.getByRole('button', { name: 'New practice' }));
    expect(currentLocation().pathname).toBe('/practice/new');
    expect(currentLocation().params.get('subject')).toBe('s1');
    expect(currentLocation().params.get('deck')).toBe('d1');

    await screen.findByRole('group', { name: 'Alpha Deck · Alpha' });
    expect(screen.queryByText('Basics')).not.toBeInTheDocument();
    const lastRequest = configRequests.at(-1);
    expect(lastRequest?.get('subject_id')).toBe('s1');
    expect(lastRequest?.get('deck_id')).toBe('d1');

    // New practice → the builder: the deck arrives pre-selected, straight to its board.
    await user.click(screen.getByRole('button', { name: 'New configuration' }));
    const builder = currentLocation();
    expect(builder.pathname).toBe('/deck-configurations/new');
    expect(builder.params.get('subject')).toBe('s1');
    expect(builder.params.get('deck')).toBe('d1');
    expect(builder.params.get('returnTo')).toBe('/practice/new?subject=s1&deck=d1');

    const notUsed = await screen.findByRole('region', { name: 'Not used' });
    expect(within(notUsed).getByText('Term')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByPlaceholderText('Deck')).toHaveValue('Alpha Deck'));
  });

  it('New practice → New configuration → New deck, then Cancel twice back up the chain (MD-5)', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderChain('/practice/new?subject=s1&deck=d1');
    await screen.findByRole('radio', { name: 'Recall' });

    await user.click(screen.getByRole('button', { name: 'New configuration' }));
    await screen.findByRole('region', { name: 'Not used' });
    const builderLocation = currentLocation().full;

    // Builder → "New deck…": the deck editor's returnTo is the builder's exact
    // location — context params and the builder's own nested returnTo included.
    await user.click(screen.getByPlaceholderText('Deck'));
    await user.click(await screen.findByRole('option', { name: /New deck…/ }));
    expect(currentLocation().pathname).toBe('/decks/new');
    expect(currentLocation().params.get('returnTo')).toBe(builderLocation);

    // Cancel in the deck editor → back on the builder, nothing dropped.
    await screen.findByDisplayValue('Term');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(currentLocation().full).toBe(builderLocation));
    const backOnBuilder = currentLocation();
    expect(backOnBuilder.params.get('subject')).toBe('s1');
    expect(backOnBuilder.params.get('deck')).toBe('d1');
    expect(backOnBuilder.params.get('returnTo')).toBe('/practice/new?subject=s1&deck=d1');
    await screen.findByRole('region', { name: 'Not used' });
    await waitFor(() => expect(screen.getByPlaceholderText('Deck')).toHaveValue('Alpha Deck'));

    // Cancel in the builder → back on New practice with the original filters.
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(currentLocation().full).toBe('/practice/new?subject=s1&deck=d1'));
    expect(await screen.findByRole('heading', { name: 'New practice' })).toBeInTheDocument();
    await screen.findByRole('radio', { name: 'Recall' });
    await waitFor(() => expect(screen.getByPlaceholderText('All subjects')).toHaveValue('Alpha'));
    expect(screen.getByPlaceholderText('All decks')).toHaveValue('Alpha Deck');
  });

  it('the save direction: deck created → builder resumes on it → configuration saved → auto-selected on New practice, earlier selections gone (MD-5, MD-6)', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderChain('/practice/new');

    // Two selections before leaving — per MD-6 these are draft state and will NOT
    // survive the round trip; only the returned configuration's auto-select should.
    await user.click(await screen.findByRole('radio', { name: 'Recall' }));
    await user.click(screen.getByRole('radio', { name: 'Basics' }));
    expect(screen.getByText('2 selected')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'New configuration' }));
    expect(currentLocation().pathname).toBe('/deck-configurations/new');
    const builderLocation = currentLocation().full;

    await user.click(await screen.findByPlaceholderText('Deck'));
    await user.click(await screen.findByRole('option', { name: /New deck…/ }));
    expect(currentLocation().pathname).toBe('/decks/new');

    // Create the deck; its default Term/Definition fields are enough.
    await user.type(await screen.findByRole('textbox', { name: 'Deck name' }), 'Fresh Deck');
    await user.click(screen.getByPlaceholderText('Subject'));
    await user.click(await screen.findByRole('option', { name: 'Alpha' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    // Back on the builder, resumed on the freshly created deck.
    await waitFor(() => expect(currentLocation().full).toBe(builderLocation));
    await waitFor(() => expect(screen.getByPlaceholderText('Deck')).toHaveValue('Fresh Deck'));
    const notUsed = await screen.findByRole('region', { name: 'Not used' });
    expect(within(notUsed).getByText('Term')).toBeInTheDocument();

    // Author and save a minimal configuration on it.
    await assign(user, 'Term', 'Prompt · always shown');
    await assign(user, 'Definition', 'Answer · always shown');
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Fresh Config');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    // Back on New practice: the new configuration is auto-selected; the two selections
    // made before leaving are gone (MD-6) — only the auto-selected one is checked.
    await waitFor(() => expect(currentLocation().full).toBe('/practice/new'));
    expect(await screen.findByRole('radio', { name: 'Fresh Config' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Recall' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Basics' })).not.toBeChecked();
    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });
});
