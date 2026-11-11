import type { components } from 'src/api/types';
import { capList } from 'src/lib/capList';

type PracticeRunDeckSummary = components['schemas']['PracticeRunDeckSummary'];

type SessionDeckChipsProps = {
  decks: PracticeRunDeckSummary[];
  /** 'summary': "Deck · Configuration" per deck, at most CAP chips, then one "+N" chip.
   *  'full': "Deck · Configuration" per deck, every deck. */
  variant: 'summary' | 'full';
};

const CHIP_CLASS = 'text-label leading-4 text-(--color-aside)';

/**
 * The chips naming what a practice ran, one per deck in the server's order. The overview
 * row uses 'summary': each deck with its configuration, capped. The detail page uses
 * 'full': every deck, the one place the whole practice is spelled out. A deck whose
 * snapshot has no configuration name shows without one.
 *
 * No wrapping element of its own — a caller drops these chips into whatever flex row
 * it's already building. No fetching: `decks` is already on `PracticeRunSummary`, so
 * this only renders what it's given (AGENTS.md).
 */
export default function SessionDeckChips({ decks, variant }: SessionDeckChipsProps) {
  const { shown, overflow } =
    variant === 'summary' ? capList(decks) : { shown: decks, overflow: 0 };
  return (
    <>
      {shown.map((deck) => {
        const parts = [deck.deck_name];
        if (deck.configuration_name !== null) parts.push(deck.configuration_name);
        return (
          <span key={deck.deck_id} className={CHIP_CLASS}>
            {parts.join(' · ')}
          </span>
        );
      })}
      {overflow > 0 && (
        <span key="overflow" className={CHIP_CLASS}>
          +{overflow}
        </span>
      )}
    </>
  );
}
