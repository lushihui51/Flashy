import type { ReactNode } from 'react';

// Each rating's colour, and whether it is a ring with a dot rather than a solid dot.
const TIERS: Record<number, { colour: string; ring: boolean } | undefined> = {
  1: { colour: 'var(--color-wrong)', ring: false },
  2: { colour: 'var(--color-wrong)', ring: true },
  3: { colour: 'var(--color-ink)', ring: true },
  4: { colour: 'var(--color-ink)', ring: false },
};

/** How one attempt rated an answer field. It is silent, so its caller speaks the mark.
 * `rating` is 1 to 4 as the API gives it, or null when the attempt did not ask the field. */
export default function RatingMark({ rating }: { rating: number | null }): ReactNode {
  const tier = rating === null ? undefined : TIERS[rating];

  return (
    <svg aria-hidden="true" viewBox="0 0 13 13" className="size-[0.8125rem]">
      {tier && !tier.ring ? (
        <circle cx={6.5} cy={6.5} r={6.5} fill={tier.colour} />
      ) : (
        <circle
          cx={6.5}
          cy={6.5}
          r={5.75}
          fill="none"
          stroke={tier?.colour ?? 'var(--color-line)'}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {tier?.ring && <circle cx={6.5} cy={6.5} r={3.25} fill={tier.colour} />}
    </svg>
  );
}
