import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { RATING_TIERS } from 'src/components/practice/ratingTiers';

type RatingChipProps = {
  fieldName: string;
  rating: number | null;
  onSelect: (rating: number) => void;
};

/** One answer field's rating control: a dashed "Rate" chip until rated, then a block
 * in its tier's colours with its label — tapping either opens a non-blocking Popover of
 * the four options so rating several fields in a row never blocks on a modal. Each chip
 * owns its own open state; Radix dismisses a Popover on an outside interaction by
 * default, so tapping a different chip closes this one without any shared
 * coordination. */
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
              ? `tappable-sm inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-sm font-semibold ${tier.blockClass}`
              : 'inline-flex h-9 shrink-0 items-center rounded-full border-[1.5px] border-dashed border-(--color-ink) bg-(--color-surface) px-3.5 text-sm font-semibold text-(--color-ink)'
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
          collisionPadding={16}
          className="tappable z-50 flex gap-1.5 rounded-2xl bg-(--color-surface) p-2"
        >
          {RATING_TIERS.map((t) => (
            <button
              key={t.rating}
              type="button"
              onClick={() => {
                onSelect(t.rating);
                setOpen(false);
              }}
              className={`tappable-sm h-9 rounded-full px-3 text-sm font-semibold ${t.blockClass}`}
            >
              {t.label}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
