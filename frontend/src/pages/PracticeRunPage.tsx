import { ChevronLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

// TODO(defer:practice-run) stub landing page for an active session's "Start practice"
// button. The run task (branch rewrite/practice-run) fills this in with prompt
// rendering, rating, and requeue display, and also decides what a completed
// practice's summary shows. The breadcrumb label is static ("Practice session") per
// MD-2 — this stub doesn't fetch the session, so it has no name to show yet; the run
// task upgrades it to the session name once real data is fetched here.
export default function PracticeRunPage() {
  const { practiceSessionId } = useParams<{ practiceSessionId: string }>();

  return (
    <div className="p-4">
      <Link
        to={`/practice/${practiceSessionId}`}
        className="inline-flex items-center gap-1 text-[13px] text-(--color-text-secondary)"
      >
        <ChevronLeft aria-hidden="true" className="h-[15px] w-[15px]" />
        Practice session
      </Link>

      <h1 className="mt-1 text-xl font-semibold text-(--color-text)">Practice run</h1>
      <p className="text-(--color-text-muted)">Coming soon.</p>
    </div>
  );
}
