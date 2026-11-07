// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import SubjectDetailPage from 'src/pages/SubjectDetailPage';

// SubjectDetailPage reads its id via useParams, which only resolves inside a matched
// <Route> — a bare MemoryRouter with no route config leaves params empty.
function renderAtSubjectRoute(extra: ReactNode = null, path = '/subjects/s1') {
  return renderWithProviders(
    <>
      <Routes>
        <Route path="/subjects/:subjectId" element={<SubjectDetailPage />} />
        <Route path="*" element={null} />
      </Routes>
      {extra}
    </>,
    [path],
  );
}

const BASE = 'http://localhost:8000';

const subject = {
  id: 's1',
  name: 'Math',
  icon: 'brain',
  description: 'Numbers and shapes',
  user_id: 'u1',
  created_at: '',
  deck_count: 1,
  readiness: 0.5 as number | null,
};
const decks = [
  {
    id: 'd1',
    subject_id: 's1',
    name: 'Algebra',
    created_at: '',
    card_count: 6,
    readiness: 0.5 as number | null,
    field_names: ['Front', 'Back'],
  },
];

let decksCallCount = 0;

function mockSubject({
  subjectData = subject,
  decksData = decks,
  subjectStatus = 200,
}: {
  subjectData?: typeof subject;
  decksData?: typeof decks;
  subjectStatus?: number;
} = {}) {
  decksCallCount = 0;
  server.use(
    http.get(`${BASE}/api/subjects/:id`, () =>
      subjectStatus === 200
        ? HttpResponse.json(subjectData)
        : HttpResponse.json({ detail: 'Subject not found' }, { status: subjectStatus }),
    ),
    http.get(`${BASE}/api/decks`, () => {
      decksCallCount += 1;
      return HttpResponse.json(decksData);
    }),
  );
}

function LocationProbe() {
  const location = useLocation();
  return (
    <span
      data-testid="location"
      data-state={JSON.stringify(location.state)}
      data-search={location.search}
    >
      {location.pathname}
    </span>
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

describe('SubjectDetailPage', () => {
  it('renders the header (icon, name, description) and its decks with no console errors', async () => {
    mockSubject();
    const { container } = renderAtSubjectRoute();

    expect(await screen.findByRole('heading', { name: 'Math' })).toBeInTheDocument();
    expect(screen.getByText('Numbers and shapes')).toBeInTheDocument();
    expect(await screen.findByText('Algebra')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('renders no description line when the subject has none', async () => {
    mockSubject({ subjectData: { ...subject, description: '' } });
    renderAtSubjectRoute();

    await screen.findByRole('heading', { name: 'Math' });
    expect(screen.queryByText('Numbers and shapes')).not.toBeInTheDocument();
  });

  it('shows the mastery circle after the name in the heading row', async () => {
    mockSubject({ subjectData: { ...subject, readiness: 0.42 }, decksData: [] });
    renderAtSubjectRoute();

    const heading = await screen.findByRole('heading', { name: 'Math' });
    expect(heading.nextElementSibling).toBe(screen.getByRole('img', { name: 'Mastery 42%' }));
  });

  it('shows no mastery circle for a subject with no card', async () => {
    mockSubject({ subjectData: { ...subject, readiness: null }, decksData: [] });
    renderAtSubjectRoute();

    await screen.findByRole('heading', { name: 'Math' });
    expect(screen.queryByRole('img', { name: /Mastery/ })).not.toBeInTheDocument();
  });

  it('a deck row shows its mastery, and a deck with no card shows none', async () => {
    mockSubject({
      subjectData: { ...subject, readiness: null },
      decksData: [
        { ...decks[0]!, readiness: 0.42 },
        { ...decks[0]!, id: 'd2', name: 'Empty', card_count: 0, readiness: null },
      ],
    });
    renderAtSubjectRoute();

    const withCards = await screen.findByRole('link', { name: /Algebra/ });
    expect(within(withCards).getByRole('img', { name: 'Mastery 42%' })).toBeInTheDocument();
    const withoutCards = screen.getByRole('link', { name: /Empty/ });
    expect(within(withoutCards).queryByRole('img', { name: /Mastery/ })).not.toBeInTheDocument();
  });

  it('breadcrumb links to /library', async () => {
    mockSubject();
    renderAtSubjectRoute();

    const row = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    const links = within(row).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent('Your library');
    expect(links[0]).toHaveAttribute('href', '/library');
  });

  it('the deck row links to its detail page', async () => {
    mockSubject();
    renderAtSubjectRoute();

    const row = await screen.findByRole('link', { name: /Algebra/ });
    expect(row).toHaveAttribute('href', '/decks/d1');
  });

  describe('toolbar label pluralization', () => {
    it('reads "1 deck · 6 cards" for a single deck', async () => {
      mockSubject();
      renderAtSubjectRoute();

      expect(await screen.findByText('1 deck · 6 cards')).toBeInTheDocument();
    });

    it('reads plural counts for multiple decks, summed cards', async () => {
      mockSubject({
        decksData: [
          { id: 'd1', subject_id: 's1', name: 'Algebra', created_at: '', card_count: 6, readiness: 0.5, field_names: [] },
          { id: 'd2', subject_id: 's1', name: 'Geometry', created_at: '', card_count: 3, readiness: 0.5, field_names: [] },
        ],
      });
      renderAtSubjectRoute();

      expect(await screen.findByText('2 decks · 9 cards')).toBeInTheDocument();
    });

    it('reads "0 decks · 0 cards" for a subject with no decks', async () => {
      mockSubject({ decksData: [] });
      renderAtSubjectRoute();

      expect(await screen.findByText('0 decks · 0 cards')).toBeInTheDocument();
    });
  });

  describe('deck row subtitle (card and field counts)', () => {
    it('reads "0 cards · 1 field" for a deck with zero cards and one field', async () => {
      mockSubject({
        decksData: [
          { id: 'd1', subject_id: 's1', name: 'Empty Deck', created_at: '', card_count: 0, readiness: null, field_names: ['Front'] },
        ],
      });
      renderAtSubjectRoute();

      expect(await screen.findByText('0 cards · 1 field')).toBeInTheDocument();
    });

    it('reads "1 card · 2 fields" (singular card) for a deck with one card', async () => {
      mockSubject({
        decksData: [
          {
            id: 'd1',
            subject_id: 's1',
            name: 'Solo',
            created_at: '',
            card_count: 1,
            readiness: 0.5,
            field_names: ['Front', 'Back'],
          },
        ],
      });
      renderAtSubjectRoute();

      expect(await screen.findByText('1 card · 2 fields')).toBeInTheDocument();
    });

    it('counts the fields and never shows their names', async () => {
      mockSubject({
        decksData: [
          {
            id: 'd1',
            subject_id: 's1',
            name: 'Algebra',
            created_at: '',
            card_count: 2,
            readiness: 0.5,
            field_names: ['Front', 'Back', 'Notes', 'Extra'],
          },
        ],
      });
      renderAtSubjectRoute();

      expect(await screen.findByText('2 cards · 4 fields')).toBeInTheDocument();
      expect(screen.queryByText('Front, Back')).not.toBeInTheDocument();
      expect(screen.queryByText(/Front/)).not.toBeInTheDocument();
    });

    it("carries neither the subject's name nor a count at its right end", async () => {
      mockSubject();
      renderAtSubjectRoute();

      const row = await screen.findByRole('link', { name: /Algebra/ });
      expect(row).toHaveTextContent(/^Algebra6 cards · 2 fields$/);
      expect(screen.queryByText('6 cards')).not.toBeInTheDocument();
    });
  });

  it('renders the Decks row and its Add deck button above the empty state', async () => {
    mockSubject({ decksData: [] });
    renderAtSubjectRoute();

    expect(await screen.findByText('No decks yet.')).toBeInTheDocument();
    expect(screen.getByText('0 decks · 0 cards')).toBeInTheDocument();
    // The row's button is the one add control; the empty state is its text alone.
    // getByRole throws on a second match.
    expect(screen.getByRole('button', { name: 'Add deck' })).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('the header carries subject-level actions only; adding a deck belongs to the deck list', async () => {
    mockSubject();
    renderAtSubjectRoute();

    await screen.findByRole('heading', { name: 'Math' });
    expect(screen.getByRole('button', { name: 'Practice' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit subject' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New deck' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add deck' })).toBeInTheDocument();
  });

  it('Add deck navigates to the deck editor with this subject preselected', async () => {
    mockSubject();
    const user = userEvent.setup();
    renderAtSubjectRoute(<LocationProbe />);

    await screen.findByRole('heading', { name: 'Math' });
    await user.click(screen.getByRole('button', { name: 'Add deck' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/decks/new');
    expect(screen.getByTestId('location')).toHaveAttribute(
      'data-state',
      JSON.stringify({ subject: { id: 's1', name: 'Math', icon: 'brain' } }),
    );
  });

  it('Add deck passes this page as cancelTo and no returnTo', async () => {
    mockSubject();
    const user = userEvent.setup();
    renderAtSubjectRoute(<LocationProbe />, '/subjects/s1?from=here');

    await screen.findByRole('heading', { name: 'Math' });
    await user.click(screen.getByRole('button', { name: 'Add deck' }));

    const params = new URLSearchParams(screen.getByTestId('location').dataset.search);
    expect(params.get('cancelTo')).toBe('/subjects/s1?from=here');
    expect(params.has('returnTo')).toBe(false);
  });

  it('Practice opens the overview pre-filtered to this subject', async () => {
    mockSubject();
    const user = userEvent.setup();
    renderAtSubjectRoute(<LocationProbe />);

    await screen.findByRole('heading', { name: 'Math' });
    await user.click(screen.getByRole('button', { name: 'Practice' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/practice');
    expect(screen.getByTestId('location')).toHaveAttribute('data-search', '?subject=s1');
  });

  it('Edit subject navigates to the subject-edit placeholder route', async () => {
    mockSubject();
    const user = userEvent.setup();
    renderAtSubjectRoute(<LocationProbe />);

    await screen.findByRole('heading', { name: 'Math' });
    await user.click(screen.getByRole('button', { name: 'Edit subject' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/subjects/s1/edit');
  });

  it('shows a not-found message instead of crashing for a missing subject', async () => {
    mockSubject({ subjectStatus: 404 });
    renderAtSubjectRoute(null, '/subjects/nope');

    expect(await screen.findByText('Subject not found.')).toBeInTheDocument();
  });

  it('a load failure other than 404 says it could not load, not that it was not found', async () => {
    mockSubject();
    server.use(
      http.get(`${BASE}/api/subjects/:id`, () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    );
    renderAtSubjectRoute();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this subject.');
    expect(screen.queryByText('Subject not found.')).not.toBeInTheDocument();
  });

  it('issues a bounded number of deck-list requests regardless of deck count, never one per deck', async () => {
    mockSubject({
      decksData: Array.from({ length: 6 }, (_, i) => ({
        id: `d${i}`,
        subject_id: 's1',
        name: `Deck ${i}`,
        created_at: '',
        card_count: i,
        readiness: null,
        field_names: [],
      })),
    });
    renderAtSubjectRoute();

    await screen.findByText('Deck 0');
    expect(decksCallCount).toBe(1);
  });
});
