import { ChevronRight, Pencil } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { readPractice, startRun } from 'src/api/practice';
import { isNotFound } from 'src/api/unwrap';
import RunRow from 'src/components/run/RunRow';
import Breadcrumb from 'src/components/ui/Breadcrumb';
import DeckMark from 'src/components/ui/DeckMark';
import MarkedName from 'src/components/ui/MarkedName';
import MasteryCircle from 'src/components/ui/MasteryCircle';
import PracticeMark from 'src/components/ui/PracticeMark';
import { failureSentence } from 'src/lib/failureSentence';
import { usePageTitle } from 'src/lib/pageTitle';
import { returnAddressParams } from 'src/lib/returnTo';

/** One practice's own page: its mark, name and circle; "Start run" with no active run and
 * "Continue run" with one, beside the pencil to Edit practice; a line per deck, each opening the
 * deck's board; and every run it has had under "Runs". */
export default function PracticeDetailsPage() {
  const { practiceId } = useParams<{ practiceId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const practiceQuery = useQuery({
    queryKey: ['practice', practiceId],
    queryFn: () => readPractice(practiceId!),
    enabled: !!practiceId,
  });
  usePageTitle(practiceQuery.data?.name);

  const startMutation = useMutation({
    mutationFn: () => startRun(practiceId!),
    onSuccess: async (run) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['practice', practiceId] }),
        queryClient.invalidateQueries({ queryKey: ['practices'] }),
      ]);
      navigate(`/runs/${run.id}`);
    },
  });

  if (practiceQuery.isError) {
    return (
      <div className="p-4">
        {isNotFound(practiceQuery.error) ? (
          <p className="text-(--color-aside)">Practice not found.</p>
        ) : (
          <p role="alert" className="text-sm text-(--color-wrong)">
            Could not load this practice.
          </p>
        )}
      </div>
    );
  }
  const practice = practiceQuery.data;
  if (!practice) return null;

  return (
    <div className="p-4">
      <Breadcrumb places={[{ label: 'All practices', to: '/practices' }]} />

      {/* The heading is never narrower than its mark and longest word, so the circle wraps
          beneath it once that word no longer fits beside it. */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="max-w-full flex-1 break-words text-page leading-[1.05] font-bold tracking-[-0.02em] text-(--color-ink)">
          <MarkedName mark={<PracticeMark />} name={practice.name} />
        </h1>
        {practice.readiness !== null && (
          <MasteryCircle readiness={practice.readiness} size="heading" className="mr-2.5" />
        )}
      </div>

      <div className="mt-3.5 flex gap-2.5">
        <button
          type="button"
          disabled={startMutation.isPending}
          onClick={() => startMutation.mutate()}
          className="tappable h-action min-w-0 flex-1 rounded-2xl bg-(--color-main-action) text-action font-semibold text-(--color-ink)"
        >
          {practice.active_run_id ? 'Continue run' : 'Start run'}
        </button>
        <button
          type="button"
          aria-label={`Edit ${practice.name}`}
          onClick={() =>
            navigate({
              pathname: `/practices/${practice.id}/edit`,
              search: returnAddressParams(location, 'cancelTo', 'returnTo').toString(),
            })
          }
          className="tappable flex size-action shrink-0 items-center justify-center rounded-2xl bg-(--color-surface)"
        >
          <Pencil aria-hidden="true" className="size-icon text-(--color-ink)" />
        </button>
      </div>
      {startMutation.isError && (
        <p role="alert" className="mt-2 text-sm text-(--color-wrong)">
          {failureSentence(startMutation.error, 'Practice not found.')}
        </p>
      )}

      <ul className="tappable mt-3.5 flex flex-col divide-y divide-(--color-line) rounded-block bg-(--color-surface)">
        {practice.decks.map((deck) => (
          <li key={deck.deck_id}>
            <Link
              to={{
                pathname: `/practices/${practice.id}/decks/${deck.deck_id}`,
                search: returnAddressParams(location, 'cancelTo', 'returnTo').toString(),
              }}
              className="flex min-h-11 items-center justify-between gap-3 py-3 pr-3 pl-4"
            >
              <span className="line-clamp-2 min-w-0 text-body leading-5 font-semibold break-words text-(--color-ink)">
                <MarkedName mark={<DeckMark />} name={deck.deck_name} />
              </span>
              <ChevronRight aria-hidden="true" className="size-icon shrink-0 text-(--color-aside)" />
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mt-5 text-action font-semibold text-(--color-ink)">Runs</h2>
      {practice.runs.length > 0 ? (
        <ul className="tappable mt-2.5 flex flex-col divide-y divide-(--color-line) rounded-block bg-(--color-surface)">
          {practice.runs.map((run) => (
            <li key={run.id}>
              <RunRow run={run} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2.5 text-body text-(--color-aside)">No runs yet.</p>
      )}
    </div>
  );
}
