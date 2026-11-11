import { describe, it, expect } from 'vitest';
import { fieldLabel } from 'src/lib/fieldLabel';

describe('fieldLabel', () => {
  it('puts a name in square brackets', () => {
    expect(fieldLabel('Definition')).toBe('[Definition]');
  });

  it('keeps the spaces inside a name', () => {
    expect(fieldLabel('Command purpose')).toBe('[Command purpose]');
  });
});
