import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { readPractice, startRun } from 'src/api/practice';
import { isNotFound } from 'src/api/unwrap';
import DeckChips from 'src/components/practice/DeckChips';
import RunRow from 'src/components/run/RunRow';
import Breadcrumb from 'src/components/ui/Breadcrumb';
import { failureSentence } from 'src/lib/failureSentence';
import { usePageTitle } from 'src/lib/pageTitle';

/** One practice's own page: its name, its decks, the way into its run, "Start run" with no
 * active run and "Continue run" with one, and every run it has had. */
export default function PracticeDetailsPage() {
  const { practiceId } = useParams<{ practiceId: string }>();
  const navigate = useNavigate();
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

      <h1 className="mt-3.5 min-w-0 text-page leading-[1.05] font-bold tracking-[-0.02em] break-words text-(--color-ink)">
        {practice.name}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-x-2">
        <DeckChips decks={practice.decks} variant="full" />
      </div>

      <button
        type="button"
        disabled={startMutation.isPending}
        onClick={() => startMutation.mutate()}
        className="tappable mt-6 h-action w-full rounded-2xl bg-(--color-main-action) text-action font-semibold text-(--color-ink)"
      >
        {practice.active_run_id ? 'Continue run' : 'Start run'}
      </button>
      {startMutation.isError && (
        <p role="alert" className="mt-2 text-sm text-(--color-wrong)">
          {failureSentence(startMutation.error, 'Practice not found.')}
        </p>
      )}

      {practice.runs.length > 0 && (
        <>
          <h2 className="mt-6 text-action font-semibold text-(--color-ink)">Runs</h2>
          <ul className="tappable mt-2.5 flex flex-col divide-y divide-(--color-line) rounded-block bg-(--color-surface)">
            {practice.runs.map((run) => (
              <li key={run.id}>
                <RunRow run={run} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
