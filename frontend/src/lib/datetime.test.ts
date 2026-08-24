import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, userTimeZone } from 'src/lib/datetime.ts';

describe('userTimeZone', () => {
  it('resolves an IANA zone key', () => {
    expect(userTimeZone()).toMatch(/^[A-Za-z0-9+_-]+(\/[A-Za-z0-9+_-]+)*$/);
  });
});

describe('formatDate', () => {
  it('formats the instant, not the string it was written as', () => {
    // ADR 019: the API emits UTC, but an equivalent offset spelling of the same moment
    // must render identically — a formatter that read the literal text would differ.
    expect(formatDate('2026-08-24T16:00:00Z')).toBe(formatDate('2026-08-24T09:00:00-07:00'));
  });

  it('accepts a Date as well as an ISO string', () => {
    expect(formatDate(new Date('2026-08-24T16:00:00Z'))).toBe(formatDate('2026-08-24T16:00:00Z'));
  });

  it('distinguishes instants a day apart', () => {
    expect(formatDate('2026-08-24T16:00:00Z')).not.toBe(formatDate('2026-08-25T16:00:00Z'));
  });

  it('rejects an unparseable instant rather than rendering "Invalid Date"', () => {
    expect(() => formatDate('not-a-date')).toThrow(TypeError);
  });
});

describe('formatDateTime', () => {
  it('includes a time component that formatDate omits', () => {
    const instant = '2026-08-24T16:00:00Z';
    expect(formatDateTime(instant)).not.toBe(formatDate(instant));
    expect(formatDateTime(instant).startsWith(formatDate(instant))).toBe(true);
  });

  it('separates two instants within the same local day', () => {
    expect(formatDateTime('2026-08-24T16:00:00Z')).not.toBe(
      formatDateTime('2026-08-24T16:30:00Z'),
    );
  });
});
