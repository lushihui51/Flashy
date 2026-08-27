import type { components } from 'src/api/types';

type PracticeSessionDeckSummary = components['schemas']['PracticeSessionDeckSummary'];

type SessionDeckChipsProps = {
  decks: PracticeSessionDeckSummary[];
  deletedDeckCount: number;
};

/**
 * The deck·subject chips a session carries, plus the "N / M decks deleted" treatment
 * once some of its snapshotted decks no longer exist. No wrapping element of its own —
 * a caller drops these chips into whatever flex row it's already building (the
 * overview row sits a created-date chip alongside them; the detail page doesn't).
 *
 * No fetching: `decks` and `deletedDeckCount` are already on `PracticeSessionSummary`,
 * so this only renders what it's given (AGENTS.md).
 */
export default function SessionDeckChips({ decks, deletedDeckCount }: SessionDeckChipsProps) {
  const totalDecks = decks.length + deletedDeckCount;
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
      {/* A snapshot whose deck was deleted still counts as part of this session, and
          is the one visible difference between a session that was cut short and one
          played to the end — both read as Completed now (ADR 015, amended). Stated
          against the session's whole deck count, since losing one of four decks and
          losing the only one are very different things. */}
      {deletedDeckCount > 0 && (
        <span className="rounded-full bg-(--color-surface-elevated) px-2 py-0.5 text-[11px] text-(--color-text-muted) italic">
          {deletedDeckCount} / {totalDecks} decks deleted
        </span>
      )}
    </>
  );
}
