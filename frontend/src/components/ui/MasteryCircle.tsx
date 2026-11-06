import type { ReactNode } from 'react';
import ChangeBadge from 'src/components/ui/ChangeBadge';
import { CHANGE_WORDS, type ChangeKind } from 'src/lib/changeKinds';

type MasteryCircleProps = {
  /** 0 to 1. */
  readiness: number;
  /** `row`: 22 on a 22 viewBox, 1.375rem. `heading`: 30, 1.875rem. `summary`: a row on the
   * summary, 26, 1.625rem. `sheet`: beside the heading of a card opened from the summary,
   * 34, 2.125rem. */
  size: 'row' | 'heading' | 'summary' | 'sheet';
  /** With a kind, the badge of that kind sits off the circle's top-right and the circle is
   * spoken as "Mastery N%, up a lot". */
  change?: ChangeKind;
  className?: string;
};

// The drawn geometry of each size, in viewBox units. The rendered size comes from the class,
// so the circle grows with the browser's text size.
const SIZES = {
  row: { box: 22, radius: 9.5, sizeClass: 'size-[1.375rem]' },
  heading: { box: 30, radius: 13.5, sizeClass: 'size-[1.875rem]' },
  summary: { box: 26, radius: 11.5, sizeClass: 'size-[1.625rem]' },
  sheet: { box: 34, radius: 15.5, sizeClass: 'size-[2.125rem]' },
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
export default function MasteryCircle({ readiness, size, change, className }: MasteryCircleProps): ReactNode {
  const { box, radius, sizeClass } = SIZES[size];
  const centre = box / 2;
  const percent = `Mastery ${Math.round(readiness * 100)}%`;

  return (
    <span
      role="img"
      aria-label={change ? `${percent}, ${CHANGE_WORDS[change]}` : percent}
      className={`flex shrink-0 ${change ? 'relative mr-3' : ''} ${className ?? ''}`}
    >
      <svg aria-hidden="true" viewBox={`0 0 ${box} ${box}`} className={sizeClass}>
        <circle cx={centre} cy={centre} r={radius} fill="var(--color-surface)" />
        {readiness >= 1 ? (
          <circle cx={centre} cy={centre} r={radius} fill="var(--color-ink)" />
        ) : (
          readiness > 0 && <path d={wedgePath(readiness, centre, radius)} fill="var(--color-ink)" />
        )}
        {/* Last, so the wedge never covers the inner half of the outline. */}
        <circle
          cx={centre}
          cy={centre}
          r={radius}
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {change && <ChangeBadge kind={change} className="absolute top-[-0.375rem] right-[-0.9375rem]" />}
    </span>
  );
}
