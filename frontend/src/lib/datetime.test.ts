import { describe, expect, it } from 'vitest';
import { formatRunDay, userTimeZone } from 'src/lib/datetime.ts';

describe('userTimeZone', () => {
  it('resolves an IANA zone key', () => {
    expect(userTimeZone()).toMatch(/^[A-Za-z0-9+_-]+(\/[A-Za-z0-9+_-]+)*$/);
  });
});

describe('formatRunDay', () => {
  it('writes the first run of a day as the day alone', () => {
    expect(formatRunDay('2026-11-03', 0)).toBe('2026-11-03');
  });

  it("adds the run's place in parentheses for a later run of the day", () => {
    expect(formatRunDay('2026-11-03', 1)).toBe('2026-11-03 (1)');
    expect(formatRunDay('2026-11-03', 12)).toBe('2026-11-03 (12)');
  });

  it('writes the day as sent, never moving it by a zone', () => {
    // A day read as a Date is midnight UTC, the previous day west of UTC.
    expect(formatRunDay('2026-01-01', 0)).toBe('2026-01-01');
  });
});
