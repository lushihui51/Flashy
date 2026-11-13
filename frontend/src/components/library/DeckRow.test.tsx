// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithRouter } from 'src/test/testUtils';
import DeckRow from 'src/components/library/DeckRow';

const deck = {
  id: 'd1',
  name: 'Algebra',
  created_at: '',
  last_activity_at: '',
  card_count: 6,
  readiness: 0.5,
  field_names: ['Front', 'Back'],
};

describe('DeckRow', () => {
  it('shows the name over its counts', () => {
    renderWithRouter(<DeckRow deck={deck} />);

    expect(screen.getByRole('link', { name: /^Deck Algebra/ })).toBeInTheDocument();
    expect(screen.getByText('6 cards · 2 fields')).toBeInTheDocument();
  });

  it('counts one card and one field in the singular', () => {
    renderWithRouter(
      <DeckRow deck={{ ...deck, card_count: 1, readiness: 0.5, field_names: ['Front'] }} />,
    );

    expect(screen.getByText('1 card · 1 field')).toBeInTheDocument();
  });

  it("never shows a field's name", () => {
    renderWithRouter(<DeckRow deck={deck} />);

    expect(screen.queryByText(/Front/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Back/)).not.toBeInTheDocument();
  });

  it('shows its mastery beside a deck with a card', () => {
    renderWithRouter(<DeckRow deck={{ ...deck, readiness: 0.42 }} />);

    expect(screen.getByRole('img', { name: 'Mastery 42%' })).toBeInTheDocument();
  });

  it('shows no mastery on a deck with no card', () => {
    renderWithRouter(<DeckRow deck={{ ...deck, card_count: 0, readiness: null }} />);

    expect(screen.queryByRole('img', { name: /Mastery/ })).not.toBeInTheDocument();
  });

  it("links to the deck's page", () => {
    renderWithRouter(<DeckRow deck={deck} />);

    expect(screen.getByRole('link', { name: /Algebra/ })).toHaveAttribute('href', '/decks/d1');
  });

  it("shows the deck's mark before the deck's name", () => {
    renderWithRouter(<DeckRow deck={deck} />);

    const row = screen.getByRole('link', { name: /^Deck Algebra/ });
    const mark = within(row).getByRole('img', { name: 'Deck' });
    // The mark is held to the name's first letter, inside the title's clamp.
    expect(mark.parentElement).toHaveClass('whitespace-nowrap');
    expect(mark.parentElement).toHaveTextContent(/^A$/);
    const title = mark.parentElement!.parentElement!;
    expect(title).toHaveTextContent(/^Algebra$/);
    expect(title).toHaveClass('line-clamp-2');
  });
});
