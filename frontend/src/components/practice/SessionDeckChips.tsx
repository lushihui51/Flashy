import type { components } from 'src/api/types';
import { capList } from 'src/lib/capList';

type PracticeRunDeckSummary = components['schemas']['PracticeRunDeckSummary'];

type SessionDeckChipsProps = {
  decks: PracticeRunDeckSummary[];
  /** 'summary' (MD-2): "Deck · Configuration" per deck, at most CAP chips, then one "+N" chip.
   *  'full' (MD-3): "Subject · Deck · Configuration" per deck, every deck. */
  variant: 'summary' | 'full';
};

const CHIP_CLASS =
  'rounded-full bg-(--color-surface-elevated) px-2 py-0.5 text-[11px] text-(--color-text-secondary)';

/**
 * The chips naming what a practice ran, one per deck in the server's subject → deck
 * order. The overview row uses 'summary': each deck with its configuration, capped,
 * since the row's filters already narrow by subject (MD-2). The detail page uses
 * 'full': every deck with its subject, the one place the whole practice is spelled
 * out (MD-3). A deck whose snapshot has no configuration name shows without one
 * (ADR 066).
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
        const parts = variant === 'full' ? [deck.subject_name, deck.deck_name] : [deck.deck_name];
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
