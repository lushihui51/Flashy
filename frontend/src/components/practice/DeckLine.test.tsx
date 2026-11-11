// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DeckLine from 'src/components/practice/DeckLine';

const DECKS = [
  { deck_id: 'd1', deck_name: 'Commands' },
  { deck_id: 'd2', deck_name: 'Ports' },
];

describe('DeckLine', () => {
  it('writes each deck by its name, joined by " · "', () => {
    const { container } = render(<DeckLine decks={DECKS} />);

    expect(container).toHaveTextContent(/^Commands · Ports$/);
  });

  it('puts the deck mark before each name', () => {
    const { container } = render(<DeckLine decks={DECKS} />);

    expect(screen.getAllByRole('img', { name: 'Deck' })).toHaveLength(2);
    const decks = Array.from(container.querySelectorAll('.whitespace-nowrap'));
    expect(decks.map((deck) => deck.firstElementChild?.getAttribute('aria-label'))).toEqual([
      'Deck',
      'Deck',
    ]);
    expect(decks.map((deck) => deck.textContent)).toEqual([' Commands', ' Ports']);
  });

  it('writes one deck with no joiner', () => {
    const { container } = render(<DeckLine decks={[{ deck_id: 'd2', deck_name: 'Ports' }]} />);

    expect(container).toHaveTextContent(/^Ports$/);
  });
});
