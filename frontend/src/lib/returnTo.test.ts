import { describe, it, expect } from 'vitest';
import { internalReturnTo, returnAddressParams, type ReturnAddressKey } from 'src/lib/returnTo';

function paramsWith(key: ReturnAddressKey, value: string | null) {
  const params = new URLSearchParams();
  if (value !== null) params.set(key, value);
  return params;
}

describe.each<ReturnAddressKey>(['cancelTo', 'returnTo'])('internalReturnTo reading %s', (key) => {
  it('accepts a value starting with a single slash', () => {
    expect(internalReturnTo(paramsWith(key, '/x'), key)).toBe('/x');
  });

  it('accepts a full internal path with its own query string', () => {
    expect(internalReturnTo(paramsWith(key, '/practice/new?subject=s1'), key)).toBe(
      '/practice/new?subject=s1',
    );
  });

  it('rejects a full external URL', () => {
    expect(internalReturnTo(paramsWith(key, 'https://evil.com'), key)).toBeNull();
  });

  it('rejects a protocol-relative URL', () => {
    expect(internalReturnTo(paramsWith(key, '//evil.com'), key)).toBeNull();
  });

  it('rejects a value with no leading slash', () => {
    expect(internalReturnTo(paramsWith(key, 'x'), key)).toBeNull();
  });

  it('is null when the param is empty', () => {
    expect(internalReturnTo(paramsWith(key, ''), key)).toBeNull();
  });

  it('is null when the param is absent', () => {
    expect(internalReturnTo(paramsWith(key, null), key)).toBeNull();
  });
});

describe('internalReturnTo keeps the two addresses apart', () => {
  it('reads null for cancelTo when the params hold returnTo alone', () => {
    expect(internalReturnTo(paramsWith('returnTo', '/x'), 'cancelTo')).toBeNull();
  });

  it('reads null for returnTo when the params hold cancelTo alone', () => {
    expect(internalReturnTo(paramsWith('cancelTo', '/x'), 'returnTo')).toBeNull();
  });
});

describe('returnAddressParams', () => {
  const location = { pathname: '/deck-configurations/new', search: '?returnTo=%2Fpractice%2Fnew' };

  it('sets only the keys named, each to the full location', () => {
    const params = returnAddressParams(location, 'cancelTo');
    expect(params.get('cancelTo')).toBe('/deck-configurations/new?returnTo=%2Fpractice%2Fnew');
    expect(params.has('returnTo')).toBe(false);
  });

  it('sets both keys when both are named, and a nested address decodes intact', () => {
    const params = returnAddressParams(location, 'cancelTo', 'returnTo');
    const roundTripped = new URLSearchParams(params.toString());
    expect(roundTripped.get('cancelTo')).toBe(location.pathname + location.search);
    expect(roundTripped.get('returnTo')).toBe(location.pathname + location.search);
  });
});
