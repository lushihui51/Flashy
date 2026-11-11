import { Fragment, type ReactNode } from 'react';
import type { components } from 'src/api/types';
import DeckMark from 'src/components/ui/DeckMark';

type DeckNameRead = components['schemas']['DeckNameRead'];

type DeckLineProps = {
  /** In the order they are written. */
  decks: DeckNameRead[];
  className?: string;
};

/** Several decks in one line of muted label text, each its mark and name, joined by " · ", as
 * "Commands · Ports". A line too long for its place is cut short with an ellipsis. */
export default function DeckLine({ decks, className }: DeckLineProps): ReactNode {
  return (
    <span className={`block truncate text-label leading-4 text-(--color-aside) ${className ?? ''}`}>
      {decks.map((deck, index) => (
        <Fragment key={deck.deck_id}>
          {index > 0 && ' · '}
          {/* No break inside a deck, so a mark never ends a line apart from its name. */}
          <span className="whitespace-nowrap">
            <DeckMark /> {deck.deck_name}
          </span>
        </Fragment>
      ))}
    </span>
  );
}
