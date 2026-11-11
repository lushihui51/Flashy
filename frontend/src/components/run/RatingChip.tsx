import { useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { RATING_TIERS } from 'src/components/run/ratingTiers';
import Scrim from 'src/components/ui/Scrim';

type RatingChipProps = {
  fieldName: string;
  /** Null until the answer is rated. */
  rating: number | null;
  onSelect: (rating: number) => void;
};

/** One answer field's rating control: a dashed "Rate" chip until rated, then a block in
 * its tier's colours with its label. Tapping it opens the four options above it and dims
 * the rest of the page; a tap on the dimming closes the list and reaches nothing beneath.
 * Each chip owns its own open state. */
export default function RatingChip({ fieldName, rating, onSelect }: RatingChipProps) {
  const [open, setOpen] = useState(false);
  const chipRef = useRef<HTMLButtonElement>(null);
  const tier = RATING_TIERS.find((t) => t.rating === rating);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          ref={chipRef}
          type="button"
          aria-label={tier ? `${fieldName}: ${tier.label}` : `Rate ${fieldName}`}
          className={
            tier
              ? `tappable-sm inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-sm font-semibold ${tier.blockClass}`
              : 'inline-flex h-9 shrink-0 items-center rounded-full outlined-ink-dashed bg-(--color-surface) px-3.5 text-sm font-semibold text-(--color-ink)'
          }
        >
          {tier ? tier.label : 'Rate'}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        {/* One element, since the portal takes a single child; it starts no stacking context,
            so the list's z-60 stands above the scrim's z-50. */}
        <div>
          <Scrim anchor={chipRef} onDismiss={() => setOpen(false)} />
          <Popover.Content
            side="top"
            align="center"
            sideOffset={8}
            collisionPadding={16}
            className="tappable z-60 flex gap-1.5 rounded-2xl bg-(--color-surface) p-2"
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
        </div>
      </Popover.Portal>
    </Popover.Root>
  );
}
