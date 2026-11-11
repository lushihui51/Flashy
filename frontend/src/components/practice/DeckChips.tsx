import type { components } from 'src/api/types';
import { capList } from 'src/lib/capList';

type DeckNameRead = components['schemas']['DeckNameRead'];

type DeckChipsProps = {
  decks: DeckNameRead[];
  /** 'summary': at most CAP chips, then one "+N" chip. 'full': every deck. */
  variant: 'summary' | 'full';
};

const CHIP_CLASS = 'text-label leading-4 text-(--color-aside)';

/**
 * The chips naming a practice's or a run's decks, one per deck in the server's order.
 * No wrapping element of its own — a caller drops these chips into whatever flex row
 * it's already building.
 */
export default function DeckChips({ decks, variant }: DeckChipsProps) {
  const { shown, overflow } =
    variant === 'summary' ? capList(decks) : { shown: decks, overflow: 0 };
  return (
    <>
      {shown.map((deck) => (
        <span key={deck.deck_id} className={CHIP_CLASS}>
          {deck.deck_name}
        </span>
      ))}
      {overflow > 0 && (
        <span key="overflow" className={CHIP_CLASS}>
          +{overflow}
        </span>
      )}
    </>
  );
}
