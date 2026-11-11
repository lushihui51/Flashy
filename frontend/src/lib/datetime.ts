/**
 * The single sanctioned place to turn a date into text.
 *
 * The server works out every user-facing date in the user's zone and sends it as a
 * calendar date with no time, so nothing here parses one into a `Date`: "2026-11-03"
 * read by `new Date` is midnight UTC, the day before anywhere west of UTC. The ESLint
 * rule in `eslint.config.js` blocks zone-dependent formatting outside this file.
 */

/**
 * The browser's IANA zone, e.g. "America/Los_Angeles". This is the same value the API
 * client sends as `X-Timezone` and the server stores on `app_user.timezone`, which is the
 * zone the server works out a run's day in.
 */
export function userTimeZone(): string {
  // The one sanctioned direct read; eslint.config.js exempts this file.
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** A run's day as the user reads it: `day`, the server's calendar date such as
 * "2026-11-03", as sent, with " (N)" added when `dayIndex`, the run's place among its
 * practice's runs of that day from 0, is above 0. */
export function formatRunDay(day: string, dayIndex: number): string {
  return dayIndex > 0 ? `${day} (${dayIndex})` : day;
}
