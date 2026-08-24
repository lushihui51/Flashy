import { describe, it, expect } from 'vitest';
import { Atom, Brain, BookOpen } from 'lucide-react';
import { subjectIcon } from 'src/lib/subjectIcon';

describe('subjectIcon', () => {
  it('resolves a known identifier to its icon component', () => {
    expect(subjectIcon('brain')).toBe(Brain);
    expect(subjectIcon('atom')).toBe(Atom);
  });

  it('normalizes case and surrounding whitespace before matching', () => {
    expect(subjectIcon('Brain')).toBe(Brain);
    expect(subjectIcon('  atom  ')).toBe(Atom);
  });

  it('falls back to BookOpen for an unrecognized identifier', () => {
    expect(subjectIcon('not-a-real-icon')).toBe(BookOpen);
  });

  it('falls back to BookOpen for null, undefined, or blank', () => {
    expect(subjectIcon(null)).toBe(BookOpen);
    expect(subjectIcon(undefined)).toBe(BookOpen);
    expect(subjectIcon('')).toBe(BookOpen);
    expect(subjectIcon('   ')).toBe(BookOpen);
  });

  it('falls back to BookOpen for the pre-rewrite emoji default', () => {
    expect(subjectIcon('📚')).toBe(BookOpen);
  });
});
