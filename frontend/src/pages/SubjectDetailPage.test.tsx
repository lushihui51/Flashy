// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
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
};
const decks = [
  {
    id: 'd1',
    subject_id: 's1',
    name: 'Algebra',
    created_at: '',
    card_count: 6,
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
    <span data-testid="location" data-state={JSON.stringify(location.state)}>
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

  it('breadcrumb links to /library', async () => {
    mockSubject();
    renderAtSubjectRoute();

    const crumb = await screen.findByRole('link', { name: /Your library/ });
    expect(crumb).toHaveAttribute('href', '/library');
  });

  it('the deck row links to its detail page', async () => {
    mockSubject();
    renderAtSubjectRoute();

    const row = await screen.findByRole('link', { name: /Algebra/ });
    expect(row).toHaveAttribute('href', '/decks/d1');
  });

  describe('meta line pluralization', () => {
    it('reads "1 deck · 6 cards" for a single deck', async () => {
      mockSubject();
      renderAtSubjectRoute();

      expect(await screen.findByText('1 deck · 6 cards')).toBeInTheDocument();
    });

    it('reads plural counts for multiple decks, summed cards', async () => {
      mockSubject({
        decksData: [
          { id: 'd1', subject_id: 's1', name: 'Algebra', created_at: '', card_count: 6, field_names: [] },
          { id: 'd2', subject_id: 's1', name: 'Geometry', created_at: '', card_count: 3, field_names: [] },
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

  describe('deck row subtitle (field names) and meta (card count)', () => {
    it('meta reads "No cards" for a deck with zero cards; subtitle is just the field names', async () => {
      mockSubject({
        decksData: [
          { id: 'd1', subject_id: 's1', name: 'Empty Deck', created_at: '', card_count: 0, field_names: ['Front'] },
        ],
      });
      renderAtSubjectRoute();

      expect(await screen.findByText('No cards')).toBeInTheDocument();
      expect(screen.getByText('Front')).toBeInTheDocument();
    });

    it('meta reads "1 card" (singular) for a deck with one card', async () => {
      mockSubject({
        decksData: [
          { id: 'd1', subject_id: 's1', name: 'Solo', created_at: '', card_count: 1, field_names: [] },
        ],
      });
      renderAtSubjectRoute();

      expect(await screen.findByText('1 card')).toBeInTheDocument();
    });

    it('subtitle shows all field names with no +N when there are two or fewer', async () => {
      mockSubject({
        decksData: [
          {
            id: 'd1',
            subject_id: 's1',
            name: 'Algebra',
            created_at: '',
            card_count: 2,
            field_names: ['Front', 'Back'],
          },
        ],
      });
      renderAtSubjectRoute();

      expect(await screen.findByText('Front, Back')).toBeInTheDocument();
      expect(await screen.findByText('2 cards')).toBeInTheDocument();
    });

    it('subtitle truncates field names to two plus a correct +N', async () => {
      mockSubject({
        decksData: [
          {
            id: 'd1',
            subject_id: 's1',
            name: 'Algebra',
            created_at: '',
            card_count: 2,
            field_names: ['Front', 'Back', 'Notes', 'Extra'],
          },
        ],
      });
      renderAtSubjectRoute();

      expect(await screen.findByText('Front, Back +2')).toBeInTheDocument();
    });
  });

  it('shows an empty state, not an empty section label, when the subject has no decks', async () => {
    mockSubject({ decksData: [] });
    renderAtSubjectRoute();

    expect(await screen.findByText('No decks in this subject yet.')).toBeInTheDocument();
    expect(screen.queryByText('Decks')).not.toBeInTheDocument();
    // two "New deck" controls now: the header's icon-only button and this empty
    // state's own button — both real, both should be present.
    expect(screen.getAllByRole('button', { name: 'New deck' })).toHaveLength(2);
  });

  it('icon-only action buttons expose accessible names', async () => {
    mockSubject();
    renderAtSubjectRoute();

    await screen.findByRole('heading', { name: 'Math' });
    expect(screen.getByRole('button', { name: 'Practice' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New deck' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit subject' })).toBeInTheDocument();
  });

  it('New deck navigates to the deck editor with this subject preselected', async () => {
    mockSubject();
    const user = userEvent.setup();
    renderAtSubjectRoute(<LocationProbe />);

    await screen.findByRole('heading', { name: 'Math' });
    await user.click(screen.getByRole('button', { name: 'New deck' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/decks/new');
    expect(screen.getByTestId('location')).toHaveAttribute(
      'data-state',
      JSON.stringify({ subject: { id: 's1', name: 'Math', icon: 'brain' } }),
    );
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

  it('issues a bounded number of deck-list requests regardless of deck count, never one per deck', async () => {
    mockSubject({
      decksData: Array.from({ length: 6 }, (_, i) => ({
        id: `d${i}`,
        subject_id: 's1',
        name: `Deck ${i}`,
        created_at: '',
        card_count: i,
        field_names: [],
      })),
    });
    renderAtSubjectRoute();

    await screen.findByText('Deck 0');
    expect(decksCallCount).toBe(1);
  });
});
