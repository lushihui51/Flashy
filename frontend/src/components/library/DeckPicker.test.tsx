// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import DeckPicker from 'src/components/library/DeckPicker';

const BASE = 'http://localhost:8000';

const decks = [
  { id: 'd1', subject_id: 's1', name: 'Algebra', created_at: '', card_count: 2, field_names: [] },
  { id: 'd2', subject_id: 's1', name: 'Geometry', created_at: '', card_count: 0, field_names: [] },
];

function mockDecks(data = decks) {
  server.use(http.get(`${BASE}/api/decks`, () => HttpResponse.json(data)));
}

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  consoleError.mockRestore();
  server.resetHandlers();
});

describe('DeckPicker', () => {
  it('the create row is always present, even with zero decks', async () => {
    mockDecks([]);
    const user = userEvent.setup();
    renderWithProviders(<DeckPicker onChange={() => {}} onCreateNew={() => {}} />);

    await user.click(screen.getByRole('combobox'));
    expect(await screen.findByRole('option', { name: /New deck…/ })).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(1); // no leftover "no decks" empty state
  });

  it('filters existing decks as the user types', async () => {
    mockDecks();
    const user = userEvent.setup();
    renderWithProviders(<DeckPicker onChange={() => {}} onCreateNew={() => {}} />);

    await user.type(screen.getByRole('combobox'), 'Alg');

    expect(await screen.findByRole('option', { name: 'Algebra' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Geometry' })).not.toBeInTheDocument();
  });

  it('selecting a deck calls onChange with its id, and never offers an inline-create option', async () => {
    mockDecks();
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<DeckPicker onChange={onChange} onCreateNew={() => {}} />);

    await user.type(screen.getByRole('combobox'), 'Some Deck That Does Not Exist');
    expect(screen.queryByRole('option', { name: /^Create/ })).not.toBeInTheDocument();

    await user.clear(screen.getByRole('combobox'));
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Algebra' }));

    expect(onChange).toHaveBeenCalledWith('d1');
    expect(screen.getByRole('combobox')).toHaveValue('Algebra');
  });

  it('"New deck…" calls onCreateNew, not onChange', async () => {
    mockDecks();
    const onChange = vi.fn();
    const onCreateNew = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<DeckPicker onChange={onChange} onCreateNew={onCreateNew} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: /New deck…/ }));

    expect(onCreateNew).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('defaultValue preselects, and the picker is still an editable combobox (not locked)', async () => {
    mockDecks();
    renderWithProviders(
      <DeckPicker defaultValue={{ id: 'd1', name: 'Algebra' }} onChange={() => {}} onCreateNew={() => {}} />,
    );

    expect(await screen.findByRole('combobox')).toHaveValue('Algebra');
  });

  it('renders a static chip with no combobox when locked', async () => {
    mockDecks();
    renderWithProviders(
      <DeckPicker defaultValue={{ id: 'd1', name: 'Algebra' }} locked onChange={() => {}} onCreateNew={() => {}} />,
    );

    expect(await screen.findByText('Algebra')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});
