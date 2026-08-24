// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useLocation } from 'react-router-dom';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import LibraryPage from 'src/pages/LibraryPage';

const BASE = 'http://localhost:8000';

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

const subjects = [
  {
    id: 's1',
    name: 'Math',
    icon: 'brain',
    description: 'Numbers',
    user_id: 'u1',
    created_at: '',
    deck_count: 2,
  },
  {
    id: 's2',
    name: 'Bio',
    icon: 'dna',
    description: '',
    user_id: 'u1',
    created_at: '',
    deck_count: 1,
  },
];
const decks = [
  { id: 'd1', subject_id: 's1', name: 'Algebra', created_at: '', card_count: 3, field_names: [] },
  { id: 'd2', subject_id: 's2', name: 'Cells', created_at: '', card_count: 0, field_names: [] },
];

function mockLibrary({
  subjectsData = subjects,
  decksData = decks,
}: { subjectsData?: typeof subjects; decksData?: typeof decks } = {}) {
  server.use(
    http.get(`${BASE}/api/subjects`, () => HttpResponse.json(subjectsData)),
    http.get(`${BASE}/api/decks`, () => HttpResponse.json(decksData)),
  );
}

afterEach(() => {
  server.resetHandlers();
});

describe('LibraryPage', () => {
  it('renders the Subjects tab by default with real data, icons rendered as icons not text', async () => {
    mockLibrary();
    const { container } = renderWithProviders(<LibraryPage />);

    expect(await screen.findByText('Math')).toBeInTheDocument();
    expect(screen.getByText('Numbers')).toBeInTheDocument();
    expect(screen.getByText('Bio')).toBeInTheDocument();
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('brain')).not.toBeInTheDocument();
    expect(screen.queryByText('dna')).not.toBeInTheDocument();
  });

  it('switches to the Decks tab and shows real deck data with subject names', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderWithProviders(<LibraryPage />);

    await screen.findByText('Math');
    await user.click(screen.getByRole('tab', { name: 'Decks' }));

    expect(await screen.findByText('Algebra')).toBeInTheDocument();
    expect(screen.getByText('Cells')).toBeInTheDocument();
  });

  it('tapping a subject row links to its detail page', async () => {
    mockLibrary();
    renderWithProviders(<LibraryPage />);

    const row = await screen.findByRole('link', { name: /Math/ });
    expect(row).toHaveAttribute('href', '/subjects/s1');
  });

  it('tapping a deck row links to its detail page', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderWithProviders(<LibraryPage />);

    await screen.findByText('Math');
    await user.click(screen.getByRole('tab', { name: 'Decks' }));

    const row = await screen.findByRole('link', { name: /Algebra/ });
    expect(row).toHaveAttribute('href', '/decks/d1');
  });

  it('shows an empty state with a create button when there are no subjects', async () => {
    mockLibrary({ subjectsData: [] });
    renderWithProviders(<LibraryPage />);

    expect(await screen.findByText('No subjects yet.')).toBeInTheDocument();
    // the tab header's create button and the empty state's own button both read
    // "New subject" now — both real, both should be present.
    expect(screen.getAllByRole('button', { name: 'New subject' })).toHaveLength(2);
  });

  it('shows an empty state with a create button when there are no decks', async () => {
    mockLibrary({ decksData: [] });
    const user = userEvent.setup();
    renderWithProviders(<LibraryPage />);

    await screen.findByText('Math');
    await user.click(screen.getByRole('tab', { name: 'Decks' }));

    expect(await screen.findByText('No decks yet.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'New deck' })).toHaveLength(2);
  });

  it('the Subjects tab create button is present and sized for touch', async () => {
    mockLibrary();
    renderWithProviders(<LibraryPage />);

    await screen.findByText('Math');
    const button = screen.getByRole('button', { name: 'New subject' });
    expect(button).toBeInTheDocument();
    expect(button.className).toMatch(/h-9/);
  });

  it('navigates to /subjects/new when the Subjects create button is clicked', async () => {
    mockLibrary();
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <LibraryPage />
        <LocationProbe />
      </>,
    );

    await screen.findByText('Math');
    await user.click(screen.getByRole('button', { name: 'New subject' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/subjects/new');
  });

  it('subject rows show their deck count, pluralized', async () => {
    mockLibrary();
    renderWithProviders(<LibraryPage />);

    await screen.findByText('Math');
    expect(screen.getByText('2 decks')).toBeInTheDocument();
    expect(screen.getByText('1 deck')).toBeInTheDocument();
  });
});
