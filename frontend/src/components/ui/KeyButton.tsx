import type { ReactNode } from 'react';

/** The "i" that opens and closes the key to the marks. `open` says whether the key is showing, and
 * its caller draws the key and keeps that state. */
export default function KeyButton({ open, onClick }: { open: boolean; onClick: () => void }): ReactNode {
  const face = open ? 'var(--color-ink)' : 'var(--color-surface)';
  const letter = open ? 'var(--color-surface)' : 'var(--color-ink)';

  return (
    <button type="button" aria-label="Key" aria-expanded={open} onClick={onClick} className="block shrink-0">
      <svg aria-hidden="true" viewBox="0 0 26 28" className="h-[1.75rem] w-[1.625rem]">
        <circle cx={13} cy={15} r={12.25} fill="var(--color-ink)" />
        <circle
          cx={13}
          cy={13}
          r={12.25}
          fill={face}
          stroke="var(--color-ink)"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
        <g transform="translate(5.38 5)">
          <circle cx={9.2} cy={3} r={1.7} fill={letter} />
          <path
            d="M5.6 7.2 C6.6 6.8 8.3 6.6 8.1 7.8 L6.4 12.6 C6.1 13.6 6.9 14 8.4 12.9"
            fill="none"
            stroke={letter}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </button>
  );
}
