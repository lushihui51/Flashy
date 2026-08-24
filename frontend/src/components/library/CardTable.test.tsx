// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { renderWithRouter } from 'src/test/testUtils';
import CardTable from 'src/components/library/CardTable';

const fieldDefs = [
  { id: 'f1', name: 'Front', type: 'text' as const, position: 0 },
  { id: 'f2', name: 'Back', type: 'text' as const, position: 1 },
];
const cards = [
  { id: 'c1', deck_id: 'd1', created_at: '', values: { f1: 'Bonjour', f2: 'Hello' } },
  { id: 'c2', deck_id: 'd1', created_at: '', values: { f1: '', f2: 'Salut' } },
];

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderTable(overrides: Partial<Parameters<typeof CardTable>[0]> = {}) {
  return renderWithRouter(
    <>
      <CardTable
        deckName="Vocab Deck"
        fieldDefs={fieldDefs}
        cards={cards}
        cardHref={(id) => `/cards/${id}/edit`}
        {...overrides}
      />
      <LocationProbe />
    </>,
  );
}

describe('CardTable', () => {
  it('renders one header cell per field, in position order, with scope="col"', () => {
    renderTable();

    const headers = screen.getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual(['Front', 'Back']);
    headers.forEach((h) => expect(h).toHaveAttribute('scope', 'col'));
  });

  it('renders a scroll region that is focusable and labelled', () => {
    renderTable();

    const region = screen.getByLabelText('Cards in Vocab Deck');
    expect(region).toHaveAttribute('tabindex', '0');
  });

  it('renders an "empty" placeholder for a blank value, and still one cell per field', () => {
    renderTable();

    const rows = screen.getAllByRole('row');
    // header row + 2 card rows
    expect(rows).toHaveLength(3);
    const secondCardRow = rows[2]!;
    expect(secondCardRow.querySelectorAll('td')).toHaveLength(2);
    expect(secondCardRow).toHaveTextContent('empty');
    expect(secondCardRow).toHaveTextContent('Salut');
  });

  it('keys rows by card id, not index', () => {
    renderTable();

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Bonjour');
    expect(rows[1]).toHaveTextContent('Salut');
  });

  it('tapping a row navigates to that card via cardHref', async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByText('Hello'));

    expect(screen.getByTestId('location')).toHaveTextContent('/cards/c1/edit');
  });

  it('exposes a keyboard-reachable link to the row target in the first cell', () => {
    renderTable();

    const link = screen.getByRole('link', { name: 'Bonjour' });
    expect(link).toHaveAttribute('href', '/cards/c1/edit');
  });

  it('renders without a frozen-column crash for a single-field deck', () => {
    renderTable({
      fieldDefs: [fieldDefs[0]!],
      cards: [{ id: 'c1', deck_id: 'd1', created_at: '', values: { f1: 'Bonjour' } }],
    });

    expect(screen.getAllByRole('columnheader')).toHaveLength(1);
  });

  it('renders every column for a deck with many fields', () => {
    const manyFields = Array.from({ length: 8 }, (_, i) => ({
      id: `f${i}`,
      name: `Field ${i}`,
      type: 'text' as const,
      position: i,
    }));
    renderTable({ fieldDefs: manyFields, cards: [] });

    expect(screen.getAllByRole('columnheader')).toHaveLength(8);
  });
});
