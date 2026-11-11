// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithRouter } from 'src/test/testUtils';
import DeckRow from 'src/components/library/DeckRow';

const deck = {
  id: 'd1',
  subject_id: 's1',
  subject_name: 'Math',
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

    expect(screen.getByText('Algebra')).toBeInTheDocument();
    expect(screen.getByText('6 cards · 2 fields')).toBeInTheDocument();
  });

  it("never shows its subject's name", () => {
    renderWithRouter(<DeckRow deck={deck} />);

    expect(screen.queryByText(/Math/)).not.toBeInTheDocument();
  });

  it('counts one card and one field in the singular', () => {
    renderWithRouter(<DeckRow deck={{ ...deck, card_count: 1, readiness: 0.5, field_names: ['Front'] }} />);

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
});
