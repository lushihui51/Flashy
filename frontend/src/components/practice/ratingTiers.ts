/** MD-5: user-facing vocabulary, never the schema's bare 1-4. MD-2's ramp: white text
 * on Again (`--color-danger-contrast` — the same white already used for destructive
 * actions), `--color-text` (#1a1a2e) on the other three. `RatingChip` uses this for its
 * interactive chip/popover; the breakdown detail sheet (T8) uses it for a read-only
 * rating badge — one shared mapping so the two ramps can't drift apart. Split into its
 * own module (rather than exported from `RatingChip.tsx`) because a component file may
 * only export components under this project's `react-refresh/only-export-components`
 * lint rule. */
export const RATING_TIERS = [
  { rating: 1, label: 'Again', chipClass: 'bg-(--color-danger) text-(--color-danger-contrast)' },
  { rating: 2, label: 'Hard', chipClass: 'bg-(--color-rating-hard) text-(--color-text)' },
  { rating: 3, label: 'Good', chipClass: 'bg-(--color-rating-good) text-(--color-text)' },
  { rating: 4, label: 'Easy', chipClass: 'bg-(--color-success) text-(--color-text)' },
] as const;
