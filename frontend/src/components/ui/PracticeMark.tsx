import type { ReactNode } from 'react';

/** A practice's mark: a flash of lightning drawn as an outline in the color of the words beside
 * it, spoken "Practice". Sits inline before a practice's name, sized to the name's text. Its
 * caller puts a space between it and the name, which spaces the two on screen and keeps them two
 * words when spoken, as "Practice Commands + Ports". */
export default function PracticeMark(): ReactNode {
  return (
    <svg
      role="img"
      aria-label="Practice"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block size-[0.9em] shrink-0 align-[-0.15em]"
    >
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}
