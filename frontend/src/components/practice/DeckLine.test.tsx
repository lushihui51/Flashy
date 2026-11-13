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
    // Each mark is held to its name's first letter alone, so a long name breaks between its words.
    const held = Array.from(container.querySelectorAll('.whitespace-nowrap'));
    expect(held.map((span) => span.firstElementChild?.getAttribute('aria-label'))).toEqual([
      'Deck',
      'Deck',
    ]);
    expect(held.map((span) => span.textContent)).toEqual([' C', ' P']);
  });

  it('wraps to two lines and is shortened after that', () => {
    const { container } = render(<DeckLine decks={DECKS} />);

    expect(container.firstElementChild).toHaveClass('line-clamp-2', 'break-words');
  });

  it('writes one deck with no joiner', () => {
    const { container } = render(<DeckLine decks={[{ deck_id: 'd2', deck_name: 'Ports' }]} />);

    expect(container).toHaveTextContent(/^Ports$/);
  });
});
