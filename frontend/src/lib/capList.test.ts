import { describe, it, expect } from 'vitest';
import { capList, formatCappedNames } from 'src/lib/capList';

describe('capList', () => {
  it('shows both of two items with no overflow', () => {
    expect(capList(['a', 'b'])).toEqual({ shown: ['a', 'b'], overflow: 0 });
  });

  it('shows two of three items and counts one left out', () => {
    expect(capList(['a', 'b', 'c'])).toEqual({ shown: ['a', 'b'], overflow: 1 });
  });

  it('returns nothing for an empty list', () => {
    expect(capList([])).toEqual({ shown: [], overflow: 0 });
  });
});

describe('formatCappedNames', () => {
  it('prints a single name alone', () => {
    expect(formatCappedNames(['Word'])).toBe('Word');
  });

  it('comma-joins two names', () => {
    expect(formatCappedNames(['Word', 'Example'])).toBe('Word, Example');
  });

  it('renders names past the cap as +N', () => {
    expect(formatCappedNames(['Word', 'Example', 'Reading'])).toBe('Word, Example +1');
  });

  it('is empty for an empty list', () => {
    expect(formatCappedNames([])).toBe('');
  });
});
