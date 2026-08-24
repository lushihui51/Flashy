import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { formatDate } from 'src/lib/datetime';
import { pluralize } from 'src/lib/pluralize';
import type { components } from 'src/api/types';

type PracticeSessionSummary = components['schemas']['PracticeSessionSummary'];

type PracticeSessionRowProps = {
  session: PracticeSessionSummary;
  onDelete: () => void;
};

/** Not a ListRow: this row carries deck/subject chips and a destructive action of its
 * own, neither of which fits that row's identity-shape-size grammar. */
export default function PracticeSessionRow({ session, onDelete }: PracticeSessionRowProps) {
  const active = session.status === 'active';

  return (
    <div className="flex items-center gap-2">
      <Link
        to={`/practice/${session.id}`}
        className="flex min-h-16 min-w-0 flex-1 flex-col justify-center gap-1 py-2"
      >
        <span className="flex items-center gap-2">
          <span className="truncate text-[15px] leading-5 text-(--color-text)">{session.name}</span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
              active
                ? 'bg-(--color-primary) text-(--color-primary-contrast)'
                : 'bg-(--color-surface-elevated) text-(--color-text-secondary)'
            }`}
          >
            {active ? 'Active' : 'Completed'}
          </span>
        </span>

        <span className="flex flex-wrap items-center gap-1">
          {session.decks.map((deck) => (
            <span
              key={deck.deck_id}
              className="rounded-full bg-(--color-surface-elevated) px-2 py-0.5 text-[11px] text-(--color-text-secondary)"
            >
              {deck.subject_name} · {deck.deck_name}
            </span>
          ))}
          {/* A snapshot whose deck was deleted still counts as part of this session, and
              is the one visible difference between a session that was cut short and one
              played to the end — both read as Completed now (ADR 015, amended). */}
          {session.deleted_deck_count > 0 && (
            <span className="rounded-full bg-(--color-surface-elevated) px-2 py-0.5 text-[11px] text-(--color-text-muted) italic">
              {session.deleted_deck_count === 1
                ? 'deleted deck'
                : `${pluralize(session.deleted_deck_count, 'deleted deck')}`}
            </span>
          )}
          <span className="text-[11px] text-(--color-text-muted)">
            {formatDate(session.created_at)}
          </span>
        </span>
      </Link>

      <button
        type="button"
        aria-label={`Delete ${session.name}`}
        onClick={onDelete}
        className="flex h-11 w-11 shrink-0 items-center justify-center text-(--color-text-muted)"
      >
        <Trash2 aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
