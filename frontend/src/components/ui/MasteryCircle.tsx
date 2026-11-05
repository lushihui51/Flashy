import type { ReactNode } from 'react';

type MasteryCircleProps = {
  /** 0 to 1. */
  readiness: number;
  /** `row`: the circle on a row, 1.375rem. `heading`: beside a page's heading, 1.875rem. */
  size: 'row' | 'heading';
  className?: string;
};

// The drawn geometry of each size, in viewBox units. The rendered size comes from the class,
// so the circle grows with the browser's text size.
const SIZES = {
  row: { box: 22, radius: 9.5, sizeClass: 'size-[1.375rem]' },
  heading: { box: 30, radius: 13.5, sizeClass: 'size-[1.875rem]' },
} as const;

// A wedge from the centre, starting at the top and sweeping clockwise through `readiness` of a turn.
function wedgePath(readiness: number, centre: number, radius: number): string {
  const angle = readiness * 2 * Math.PI;
  const endX = centre + radius * Math.sin(angle);
  const endY = centre - radius * Math.cos(angle);
  const largeArc = readiness > 0.5 ? 1 : 0;
  return `M${centre},${centre} L${centre},${centre - radius} A${radius},${radius} 0 ${largeArc} 1 ${endX.toFixed(2)},${endY.toFixed(2)} Z`;
}

/** How ready the user is to recall a subject, deck, card or field: an ink-outlined circle
 * filled clockwise from the top, spoken "Mastery N%". A subject or deck with no card has no
 * readiness, and its caller renders no circle. */
export default function MasteryCircle({ readiness, size, className }: MasteryCircleProps): ReactNode {
  const { box, radius, sizeClass } = SIZES[size];
  const centre = box / 2;

  return (
    <span
      role="img"
      aria-label={`Mastery ${Math.round(readiness * 100)}%`}
      className={`flex shrink-0 ${className ?? ''}`}
    >
      <svg aria-hidden="true" viewBox={`0 0 ${box} ${box}`} className={sizeClass}>
        <circle
          cx={centre}
          cy={centre}
          r={radius}
          fill="var(--color-surface)"
          stroke="var(--color-ink)"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
        {readiness >= 1 ? (
          <circle cx={centre} cy={centre} r={radius} fill="var(--color-ink)" />
        ) : (
          readiness > 0 && <path d={wedgePath(readiness, centre, radius)} fill="var(--color-ink)" />
        )}
      </svg>
    </span>
  );
}
