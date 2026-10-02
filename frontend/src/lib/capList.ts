/** How many names a capped list shows before the rest become "+N" (ADR 067, MD-2). */
export const CAP = 2;

/** The first `CAP` items and how many were left out. `overflow` is 0 when nothing was. */
export function capList<T>(items: readonly T[]): { shown: T[]; overflow: number } {
  return { shown: items.slice(0, CAP), overflow: Math.max(0, items.length - CAP) };
}

/** `shown` comma-joined, then " +N" when anything overflowed: "Word, Example +1". "" for an empty list. */
export function formatCappedNames(names: readonly string[]): string {
  const { shown, overflow } = capList(names);
  const joined = shown.join(', ');
  return overflow > 0 ? `${joined} +${overflow}` : joined;
}
