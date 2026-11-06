import type { ReactNode } from 'react';
import type { ChangeKind } from 'src/lib/changeKinds';

// A kind other than no change, as a coloured disc and its chevrons, one chevron for "up" or "down"
// and two for "a lot".
const CHEVRONS = {
  up_a_lot: { fill: 'var(--color-ink)', path: 'M6.6 8.6 9.5 6 12.4 8.6 M6.6 13 9.5 10.4 12.4 13' },
  up: { fill: 'var(--color-ink)', path: 'M6.6 10.8 9.5 8.2 12.4 10.8' },
  down: { fill: 'var(--color-wrong)', path: 'M6.6 8.2 9.5 10.8 12.4 8.2' },
  down_a_lot: { fill: 'var(--color-wrong)', path: 'M6.6 6 9.5 8.6 12.4 6 M6.6 10.4 9.5 13 12.4 10.4' },
} as const;

/** A kind of change in mastery, drawn as a badge. It is silent, so its caller speaks the kind. */
export default function ChangeBadge({ kind, className }: { kind: ChangeKind; className?: string }): ReactNode {
  return (
    <svg aria-hidden="true" viewBox="0 0 19 19" className={`size-[1.1875rem] ${className ?? ''}`}>
      {kind === 'no_change' ? (
        <>
          <circle
            cx={9.5}
            cy={9.5}
            r={8.75}
            fill="var(--color-surface)"
            stroke="var(--color-aside)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
          <path d="M7 9.5h5" stroke="var(--color-aside)" strokeWidth={1.8} strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx={9.5} cy={9.5} r={9.5} fill="var(--color-surface)" />
          <circle cx={9.5} cy={9.5} r={7.5} fill={CHEVRONS[kind].fill} />
          <path
            d={CHEVRONS[kind].path}
            fill="none"
            stroke="var(--color-surface)"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}
