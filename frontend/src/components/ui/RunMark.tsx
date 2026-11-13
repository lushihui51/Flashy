import type { ReactNode } from 'react';

/** A run's mark: a flash of lightning inside a circle, drawn as an outline in the color of the
 * words beside it, spoken "Run". Sits inline before a run's day, sized to the day's text. Its
 * caller puts a space between it and the day, which spaces the two on screen and keeps them two
 * words when spoken, as "Run 2026-11-09". */
export default function RunMark(): ReactNode {
  return (
    <svg
      role="img"
      aria-label="Run"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block size-[0.9em] shrink-0 align-[-0.15em]"
    >
      <circle cx={12} cy={12} r={10.5} />
      <path d="M13 5 7 13h5l-1 6 6-8h-5l1-6z" strokeWidth={1.8} />
    </svg>
  );
}
