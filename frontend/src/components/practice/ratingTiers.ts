/** User-facing vocabulary, never the schema's bare 1-4, each tier with the classes
 * that draw it: Again filled red with white words, Hard white with a red outline, Good
 * white with an ink outline, Easy filled ink with white words. `blockClass` goes beside
 * `tappable-sm`, which sets the outline's width and the shadow, for `RatingChip`'s
 * interactive chip and popover.
 * Split into its own module (rather than exported from `RatingChip.tsx`) because a
 * component file may only export components under this project's
 * `react-refresh/only-export-components` lint rule. */
export const RATING_TIERS = [
  {
    rating: 1,
    label: 'Again',
    blockClass: 'bg-(--color-wrong) text-(--color-surface)',
  },
  {
    rating: 2,
    label: 'Hard',
    // Important because `tappable-sm`'s ink outline otherwise wins over this colour.
    blockClass: 'border-(--color-wrong)! bg-(--color-surface) text-(--color-ink)',
  },
  {
    rating: 3,
    label: 'Good',
    blockClass: 'bg-(--color-surface) text-(--color-ink)',
  },
  {
    rating: 4,
    label: 'Easy',
    blockClass: 'bg-(--color-ink) text-(--color-surface)',
  },
] as const;
