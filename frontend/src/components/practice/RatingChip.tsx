import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { RATING_TIERS } from 'src/components/practice/ratingTiers';

type RatingChipProps = {
  fieldName: string;
  rating: number | null;
  onSelect: (rating: number) => void;
};

/** One answer field's rating control (MD-1, MD-2, MD-5): an outlined "Rate" chip
 * until rated, then filled with its tier's color and label — tapping either opens a
 * non-blocking Popover of the four options so rating several fields in a row never
 * blocks on a modal. Each chip owns its own open state; Radix dismisses a Popover on
 * an outside interaction by default, so tapping a different chip closes this one
 * without any shared coordination. */
export default function RatingChip({ fieldName, rating, onSelect }: RatingChipProps) {
  const [open, setOpen] = useState(false);
  const tier = RATING_TIERS.find((t) => t.rating === rating);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={tier ? `${fieldName}: ${tier.label}` : `Rate ${fieldName}`}
          className={
            tier
              ? `inline-flex h-9 shrink-0 items-center rounded-full px-3 text-sm font-medium ${tier.chipClass}`
              : 'inline-flex h-9 shrink-0 items-center rounded-full border border-(--color-text-muted) px-3 text-sm text-(--color-text-muted)'
          }
        >
          {tier ? tier.label : 'Rate'}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="center"
          sideOffset={8}
          className="z-50 flex gap-1.5 rounded-2xl bg-(--color-surface) p-2 shadow-lg"
        >
          {RATING_TIERS.map((t) => (
            <button
              key={t.rating}
              type="button"
              onClick={() => {
                onSelect(t.rating);
                setOpen(false);
              }}
              className={`h-9 rounded-full px-3 text-sm font-medium ${t.chipClass}`}
            >
              {t.label}
            </button>
          ))}
          <Popover.Arrow className="fill-(--color-surface)" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
