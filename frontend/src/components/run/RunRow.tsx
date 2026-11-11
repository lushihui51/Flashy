import { Link } from 'react-router-dom';
import RunStatusBadge from 'src/components/run/RunStatusBadge';
import { formatRunDay } from 'src/lib/datetime';
import type { components } from 'src/api/types';

type RunRead = components['schemas']['RunRead'];

/** One run in a practice's list of runs: its day and its Active or Completed badge, the
 * whole row opening the run's page. */
export default function RunRow({ run }: { run: RunRead }) {
  return (
    <Link to={`/runs/${run.id}`} className="flex min-h-11 items-center gap-2 py-3 pr-3 pl-4">
      <span className="truncate text-body leading-5 font-semibold text-(--color-ink)">
        {formatRunDay(run.day, run.day_index)}
      </span>
      <RunStatusBadge status={run.status} />
    </Link>
  );
}
