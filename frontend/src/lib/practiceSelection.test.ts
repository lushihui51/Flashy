import { describe, it, expect } from 'vitest';
import {
  readSelectedConfigIds,
  selectConfig,
  toggleConfig,
  withSelectedConfigIds,
} from 'src/lib/practiceSelection';

describe('readSelectedConfigIds', () => {
  it('reads the repeated config params in URL order', () => {
    expect(readSelectedConfigIds(new URLSearchParams('config=c3&config=c1'))).toEqual([
      'c3',
      'c1',
    ]);
  });

  it('reads a repeated id once, at its first position (MD-8)', () => {
    expect(
      readSelectedConfigIds(new URLSearchParams('config=c1&config=c3&config=c1')),
    ).toEqual(['c1', 'c3']);
  });

  it('is empty when the URL carries no config param', () => {
    expect(readSelectedConfigIds(new URLSearchParams('subject=s1'))).toEqual([]);
  });
});

describe('withSelectedConfigIds', () => {
  it('makes the config params exactly the given ids, in order', () => {
    const next = withSelectedConfigIds(new URLSearchParams('config=c1&config=c2'), ['c3', 'c1']);
    expect(next.getAll('config')).toEqual(['c3', 'c1']);
  });

  it('removes every config param when given no ids', () => {
    const next = withSelectedConfigIds(new URLSearchParams('config=c1&subject=s1'), []);
    expect(next.has('config')).toBe(false);
    expect(next.get('subject')).toBe('s1');
  });

  it('leaves subject, name, and status untouched', () => {
    const params = new URLSearchParams(
      'subject=s1&config=c1&name=Exam+cram&status=completed&deck=d1',
    );
    const next = withSelectedConfigIds(params, ['c2']);
    expect(next.get('subject')).toBe('s1');
    expect(next.get('deck')).toBe('d1');
    expect(next.get('name')).toBe('Exam cram');
    expect(next.get('status')).toBe('completed');
    expect(next.getAll('config')).toEqual(['c2']);
  });

  it('returns a copy and leaves the input alone', () => {
    const params = new URLSearchParams('config=c1');
    const next = withSelectedConfigIds(params, ['c2']);
    expect(next).not.toBe(params);
    expect(params.getAll('config')).toEqual(['c1']);
  });
});

describe('selectConfig', () => {
  it('appends a configuration whose deck had no selection', () => {
    expect(selectConfig(['c3'], ['c1', 'c2'], 'c1')).toEqual(['c3', 'c1']);
  });

  it('replaces the deck’s existing selection, keeping other decks’ selections', () => {
    expect(selectConfig(['c1', 'c3'], ['c1', 'c2'], 'c2')).toEqual(['c3', 'c2']);
  });

  it('drops two pre-existing same-deck ids from a hand-edited URL (MD-8)', () => {
    expect(selectConfig(['c1', 'c2', 'c3'], ['c1', 'c2', 'c4'], 'c4')).toEqual(['c3', 'c4']);
  });

  it('selecting the already selected configuration keeps it once, at the end', () => {
    expect(selectConfig(['c1', 'c3'], ['c1', 'c2'], 'c1')).toEqual(['c3', 'c1']);
  });
});

describe('toggleConfig', () => {
  it('ticks an unselected configuration', () => {
    expect(toggleConfig([], ['c1', 'c2'], 'c1')).toEqual(['c1']);
  });

  it('unticks a selected configuration', () => {
    expect(toggleConfig(['c1', 'c3'], ['c1', 'c2'], 'c1')).toEqual(['c3']);
  });

  it('ticking another configuration in the same deck replaces the first', () => {
    expect(toggleConfig(['c1', 'c3'], ['c1', 'c2'], 'c2')).toEqual(['c3', 'c2']);
  });
});
