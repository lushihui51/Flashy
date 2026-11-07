import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import PracticeStatusBadge from 'src/components/practice/PracticeStatusBadge';
import SessionDeckChips from 'src/components/practice/SessionDeckChips';
import type { components } from 'src/api/types';

type PracticeRunSummary = components['schemas']['PracticeRunSummary'];

type PracticeRunRowProps = {
  session: PracticeRunSummary;
  onDelete: () => void;
};

/** Not a ListRow: this row carries capped "Deck · Configuration" entries and a
 * destructive action of its own, neither of which fits that row's identity-shape-size
 * grammar. No date: the name already is one unless typed. */
export default function PracticeRunRow({ session, onDelete }: PracticeRunRowProps) {
  return (
    <div className="flex items-center gap-1.5 py-3 pr-1 pl-4">
      <Link
        to={`/practice/${session.id}`}
        className="flex min-w-0 flex-1 flex-col gap-1"
      >
        <span className="flex items-center gap-2">
          <span className="truncate text-body leading-5 font-semibold text-(--color-ink)">
            {session.name}
          </span>
          <PracticeStatusBadge status={session.status} />
        </span>

        <span className="flex flex-wrap items-center gap-x-2">
          <SessionDeckChips decks={session.decks} variant="summary" />
        </span>
      </Link>

      <button
        type="button"
        aria-label={`Delete ${session.name}`}
        onClick={onDelete}
        className="flex h-11 w-10 shrink-0 items-center justify-center border-none text-(--color-aside)"
      >
        <Trash2 aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
