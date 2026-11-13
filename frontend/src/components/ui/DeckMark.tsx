import type { ReactNode } from 'react';

/** A deck's mark: a stack of cards drawn as an outline in the color of the words beside it,
 * spoken "Deck". Sits inline before a deck's name, sized to the name's text. Its caller puts a
 * space between it and the name, which spaces the two on screen and keeps them two words when
 * spoken, as "Deck Commands". */
export default function DeckMark(): ReactNode {
  return (
    <svg
      role="img"
      aria-label="Deck"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block size-[0.9em] shrink-0 align-[-0.15em]"
    >
      <rect x={3} y={7} width={14} height={14} rx={2} />
      <path d="M7 3h12a2 2 0 0 1 2 2v12" />
    </svg>
  );
}
