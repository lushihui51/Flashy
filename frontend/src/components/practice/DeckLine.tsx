import { Fragment, type ReactNode } from 'react';
import type { components } from 'src/api/types';
import DeckMark from 'src/components/ui/DeckMark';
import MarkedName from 'src/components/ui/MarkedName';

type DeckNameRead = components['schemas']['DeckNameRead'];

type DeckLineProps = {
  /** In the order they are written. */
  decks: DeckNameRead[];
  className?: string;
};

/** Several decks as one run of muted label text, each its mark and name, joined by " · ", as
 * "Commands · Ports". Too long for one line, it wraps onto a second, and is shortened with an
 * ellipsis after two. */
export default function DeckLine({ decks, className }: DeckLineProps): ReactNode {
  return (
    <span
      className={`line-clamp-2 text-label leading-4 break-words text-(--color-aside) ${className ?? ''}`}
    >
      {decks.map((deck, index) => (
        <Fragment key={deck.deck_id}>
          {index > 0 && ' · '}
          <MarkedName mark={<DeckMark />} name={deck.deck_name} />
        </Fragment>
      ))}
    </span>
  );
}
