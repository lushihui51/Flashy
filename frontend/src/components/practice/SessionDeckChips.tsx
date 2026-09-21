import type { components } from 'src/api/types';

type PracticeRunDeckSummary = components['schemas']['PracticeRunDeckSummary'];

type SessionDeckChipsProps = {
  decks: PracticeRunDeckSummary[];
};

/**
 * The deck·subject chips a session carries. No wrapping element of its own — a caller
 * drops these chips into whatever flex row it's already building (the overview row
 * sits a created-date chip alongside them; the detail page doesn't).
 *
 * No fetching: `decks` is already on `PracticeRunSummary`, so this only renders what
 * it's given (AGENTS.md).
 */
export default function SessionDeckChips({ decks }: SessionDeckChipsProps) {
  return (
    <>
      {decks.map((deck) => (
        <span
          key={deck.deck_id}
          className="rounded-full bg-(--color-surface-elevated) px-2 py-0.5 text-[11px] text-(--color-text-secondary)"
        >
          {deck.subject_name} · {deck.deck_name}
        </span>
      ))}
    </>
  );
}
