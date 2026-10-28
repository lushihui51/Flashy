import { describe, it, expect } from 'vitest';
import { Atom, Brain, BookOpen } from 'lucide-react';
import { SUBJECT_ICONS, subjectIcon, subjectIconName } from 'src/lib/subjectIcon';

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

  it('lists every picture of the set once, each resolving to its own icon', () => {
    const keys = SUBJECT_ICONS.map((entry) => entry.key);
    expect(keys).toHaveLength(26);
    expect(new Set(keys).size).toBe(26);
    expect(new Set(keys.map((key) => subjectIcon(key))).size).toBe(26);
  });

  it('names the current picture, and the default for a blank or unknown key', () => {
    expect(subjectIconName('dna')).toBe('DNA');
    expect(subjectIconName('Flask-Conical')).toBe('Flask');
    expect(subjectIconName('book-open')).toBe('Open book');
    expect(subjectIconName('')).toBe('Open book');
    expect(subjectIconName(null)).toBe('Open book');
    expect(subjectIconName(undefined)).toBe('Open book');
    expect(subjectIconName('not-a-real-icon')).toBe('Open book');
  });
});
