import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { formatDate } from 'src/lib/datetime';
import PracticeStatusBadge from 'src/components/practice/PracticeStatusBadge';
import SessionDeckChips from 'src/components/practice/SessionDeckChips';
import type { components } from 'src/api/types';

type PracticeSessionSummary = components['schemas']['PracticeSessionSummary'];

type PracticeSessionRowProps = {
  session: PracticeSessionSummary;
  onDelete: () => void;
};

/** Not a ListRow: this row carries deck/subject chips and a destructive action of its
 * own, neither of which fits that row's identity-shape-size grammar. */
export default function PracticeSessionRow({ session, onDelete }: PracticeSessionRowProps) {
  return (
    <div className="flex items-center gap-2">
      <Link
        to={`/practice/${session.id}`}
        className="flex min-h-16 min-w-0 flex-1 flex-col justify-center gap-1 py-2"
      >
        <span className="flex items-center gap-2">
          <span className="truncate text-[15px] leading-5 text-(--color-text)">{session.name}</span>
          <PracticeStatusBadge status={session.status} />
        </span>

        <span className="flex flex-wrap items-center gap-1">
          <SessionDeckChips decks={session.decks} deletedDeckCount={session.deleted_deck_count} />
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
