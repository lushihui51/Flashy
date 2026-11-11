import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import RunStatusBadge from 'src/components/run/RunStatusBadge';
import RunMark from 'src/components/ui/RunMark';
import { formatRunDay } from 'src/lib/datetime';
import { pluralize } from 'src/lib/pluralize';
import type { components } from 'src/api/types';

type RunListing = components['schemas']['RunListing'];

/** One run in a practice's list of runs: its mark and day, its Active or Completed badge, and
 * how many of its cards it reached as "N of M cards", the whole row opening the run's page. */
export default function RunRow({ run }: { run: RunListing }) {
  return (
    <Link
      to={`/runs/${run.id}`}
      className="flex min-h-11 items-center justify-between gap-3 py-3 pr-3 pl-4"
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="text-body leading-5 font-semibold whitespace-nowrap text-(--color-ink)">
            <RunMark /> {formatRunDay(run.day, run.day_index)}
          </span>
          <RunStatusBadge status={run.status} />
        </span>
        <span className="text-label leading-4 text-(--color-aside)">
          {run.reached_cards} of {pluralize(run.counted_cards, 'card')}
        </span>
      </span>
      <ChevronRight aria-hidden="true" className="size-icon shrink-0 text-(--color-aside)" />
    </Link>
  );
}
