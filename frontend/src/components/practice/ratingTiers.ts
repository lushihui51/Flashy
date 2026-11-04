/** User-facing vocabulary, never the schema's bare 1-4, each tier with the classes
 * that draw it: Again filled red with white words, Hard white with a red outline, Good
 * white with an ink outline, Easy filled ink with white words. `blockClass` goes beside
 * `tappable-sm`, which sets the outline's width and the shadow, for `RatingChip`'s
 * interactive chip and popover; `chipClass` is complete on its own, for the breakdown
 * detail sheet's read-only rating badge. One shared mapping so the two can't drift apart.
 * Split into its own module (rather than exported from `RatingChip.tsx`) because a
 * component file may only export components under this project's
 * `react-refresh/only-export-components` lint rule. */
export const RATING_TIERS = [
  {
    rating: 1,
    label: 'Again',
    chipClass: 'bg-(--color-wrong) text-(--color-surface)',
    blockClass: 'bg-(--color-wrong) text-(--color-surface)',
  },
  {
    rating: 2,
    label: 'Hard',
    chipClass: 'border border-(--color-wrong) bg-(--color-surface) text-(--color-ink)',
    // Important because `tappable-sm`'s ink outline otherwise wins over this colour.
    blockClass: 'border-(--color-wrong)! bg-(--color-surface) text-(--color-ink)',
  },
  {
    rating: 3,
    label: 'Good',
    chipClass: 'border border-(--color-ink) bg-(--color-surface) text-(--color-ink)',
    blockClass: 'bg-(--color-surface) text-(--color-ink)',
  },
  {
    rating: 4,
    label: 'Easy',
    chipClass: 'bg-(--color-ink) text-(--color-surface)',
    blockClass: 'bg-(--color-ink) text-(--color-surface)',
  },
] as const;
