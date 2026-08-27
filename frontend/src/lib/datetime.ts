/**
 * ADR 019 — the single sanctioned place to turn a stored instant into text.
 *
 * The API returns every timestamp as a UTC instant. Whether that instant reads as the
 * right day depends entirely on which zone it is formatted in, so every formatter here
 * passes `timeZone` explicitly. A bare `toLocaleDateString()` inherits whatever zone
 * the running process happens to sit in — which is correct on the machine of a
 * developer who lives in the user's zone and silently wrong everywhere else. The
 * ESLint rule in `eslint.config.js` blocks those calls outside this file.
 */

/**
 * The browser's IANA zone, e.g. "America/Los_Angeles". This is the same value the API
 * client sends as `X-Timezone` and the server stores on `app_user.timezone`, so
 * formatting here and bucketing on the server agree by construction.
 */
export function userTimeZone(): string {
  // The one sanctioned direct read; eslint.config.js exempts this file.
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function format(instant: string | Date, options: Intl.DateTimeFormatOptions): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`not a valid instant: ${String(instant)}`);
  }
  // Ditto — and `timeZone` is always explicit here, which is the whole point.
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: userTimeZone() }).format(date);
}

/** Calendar date in the user's zone, e.g. "Aug 24, 2026". */
export function formatDate(
  instant: string | Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  return format(instant, options);
}

/** Date and time in the user's zone, e.g. "Aug 24, 2026, 9:00 AM". */
export function formatDateTime(
  instant: string | Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
): string {
  return format(instant, options);
}
