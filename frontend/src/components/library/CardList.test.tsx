// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { renderWithRouter } from 'src/test/testUtils';
import CardList from 'src/components/library/CardList';

const fieldDefs = [
  { id: 'f1', name: 'Front', type: 'text' as const, position: 0 },
  { id: 'f2', name: 'Back', type: 'text' as const, position: 1 },
];
const cards = [
  {
    id: 'c1',
    deck_id: 'd1',
    created_at: '',
    last_activity_at: '',
    values: { f1: 'Bonjour', f2: 'Hello' },
    readiness: 0.42,
  },
  {
    id: 'c2',
    deck_id: 'd1',
    created_at: '',
    last_activity_at: '',
    values: { f1: '', f2: 'Salut' },
    readiness: 0,
  },
];

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderList(overrides: Partial<Parameters<typeof CardList>[0]> = {}) {
  return renderWithRouter(
    <>
      <CardList
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

describe('CardList', () => {
  it('labels the list with the deck and renders no table', () => {
    const { container } = renderList();

    expect(screen.getByRole('list', { name: 'Cards in Vocab Deck' })).toBeInTheDocument();
    expect(container.querySelector('table')).toBeNull();
  });

  it('renders one entry per field, in position order, each label over its value', () => {
    renderList({ cards: [cards[0]!] });

    expect(screen.getByRole('link')).toHaveTextContent(/^\[Front\]Bonjour\[Back\]Hello$/);
  });

  it('renders an "empty" placeholder for a blank value, and still one entry per field', () => {
    renderList();

    const second = screen.getAllByRole('link')[1]!;
    expect(second).toHaveTextContent(/^\[Front\]empty\[Back\]Salut$/);
  });

  it('keys cards by card id, not index', () => {
    const list = (order: typeof cards) => (
      <MemoryRouter>
        <CardList
          deckName="Vocab Deck"
          fieldDefs={fieldDefs}
          cards={order}
          cardHref={(id) => `/cards/${id}/edit`}
        />
      </MemoryRouter>
    );
    const { rerender } = render(list(cards));
    const firstCard = screen.getByRole('link', { name: /Bonjour/ });

    rerender(list([...cards].reverse()));

    expect(screen.getAllByRole('link')[1]).toBe(firstCard);
  });

  it('tapping anywhere on a card opens it via cardHref', async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByText('Hello'));

    expect(screen.getByTestId('location')).toHaveTextContent('/cards/c1/edit');
  });

  it('makes each card one link, drawn as a block', () => {
    renderList();

    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/cards/c1/edit',
      '/cards/c2/edit',
    ]);
    links.forEach((link) => expect(link).toHaveClass('tappable'));
  });

  it('renders a card for a single-field deck', () => {
    renderList({
      fieldDefs: [fieldDefs[0]!],
      cards: [
        {
          id: 'c1',
          deck_id: 'd1',
          created_at: '',
          last_activity_at: '',
          values: { f1: 'Bonjour' },
          readiness: 0,
        },
      ],
    });

    expect(screen.getByRole('link')).toHaveTextContent(/^\[Front\]Bonjour$/);
  });

  it("shows each card's mastery on its lead line, an empty circle for a card never practiced", () => {
    renderList();

    const [first, second] = screen.getAllByRole('link');
    const circle = within(first!).getByRole('img', { name: 'Mastery 42%' });
    expect(circle.parentElement).toContainElement(within(first!).getByText('Bonjour'));
    expect(circle.parentElement).not.toContainElement(within(first!).getByText('Hello'));
    expect(within(second!).getByRole('img', { name: 'Mastery 0%' })).toBeInTheDocument();
  });

  it('renders every field for a deck with many fields', () => {
    const manyFields = Array.from({ length: 8 }, (_, i) => ({
      id: `f${i}`,
      name: `Field ${i}`,
      type: 'text' as const,
      position: i,
    }));
    renderList({
      fieldDefs: manyFields,
      cards: [
        { id: 'c1', deck_id: 'd1', created_at: '', last_activity_at: '', values: {}, readiness: 0 },
      ],
    });

    const card = screen.getByRole('link');
    manyFields.forEach((f) => expect(within(card).getByText(`[${f.name}]`)).toBeInTheDocument());
    expect(within(card).getAllByText('empty')).toHaveLength(8);
  });
});
