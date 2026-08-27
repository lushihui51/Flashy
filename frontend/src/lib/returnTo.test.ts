import { describe, it, expect } from 'vitest';
import { internalReturnTo } from 'src/lib/returnTo';

function paramsWith(value: string | null) {
  const params = new URLSearchParams();
  if (value !== null) params.set('returnTo', value);
  return params;
}

describe('internalReturnTo', () => {
  it('accepts a value starting with a single slash', () => {
    expect(internalReturnTo(paramsWith('/x'))).toBe('/x');
  });

  it('accepts a full internal path with its own query string', () => {
    expect(internalReturnTo(paramsWith('/practice/new?subject=s1'))).toBe(
      '/practice/new?subject=s1',
    );
  });

  it('rejects a full external URL', () => {
    expect(internalReturnTo(paramsWith('https://evil.com'))).toBeNull();
  });

  it('rejects a protocol-relative URL', () => {
    expect(internalReturnTo(paramsWith('//evil.com'))).toBeNull();
  });

  it('rejects a value with no leading slash', () => {
    expect(internalReturnTo(paramsWith('x'))).toBeNull();
  });

  it('is null when the param is empty', () => {
    expect(internalReturnTo(paramsWith(''))).toBeNull();
  });

  it('is null when the param is absent', () => {
    expect(internalReturnTo(paramsWith(null))).toBeNull();
  });
});
