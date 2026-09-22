/**
 * Joins clauses English-list style: `, ` between all but the last pair, `and` before
 * the last — `[a]` → `a`, `[a, b]` → `a and b`, `[a, b, c]` → `a, b and c`. Callers
 * omit a clause whose count is 0 before calling this; it does no filtering of its own.
 */
export function joinClauses(clauses: string[]): string {
  if (clauses.length === 0) return '';
  if (clauses.length === 1) return clauses[0]!;
  return `${clauses.slice(0, -1).join(', ')} and ${clauses.at(-1)}`;
}
