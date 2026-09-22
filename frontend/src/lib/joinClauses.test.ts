import { describe, it, expect } from 'vitest';
import { joinClauses } from 'src/lib/joinClauses';

describe('joinClauses', () => {
  it('is empty for zero clauses', () => {
    expect(joinClauses([])).toBe('');
  });

  it('returns the clause bare for one', () => {
    expect(joinClauses(['3 decks'])).toBe('3 decks');
  });

  it('joins two with "and", no comma', () => {
    expect(joinClauses(['3 decks', '2 cards'])).toBe('3 decks and 2 cards');
  });

  it('joins three or more with commas and "and" before the last', () => {
    expect(joinClauses(['3 decks', '2 cards', '1 field'])).toBe('3 decks, 2 cards and 1 field');
    expect(joinClauses(['40 cards', '2 fields', '3 deck configurations', '2 practices'])).toBe(
      '40 cards, 2 fields, 3 deck configurations and 2 practices',
    );
  });
});
