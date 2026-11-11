import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rerunRun } from 'src/api/run';
import { failureSentence } from 'src/lib/failureSentence';

type RerunButtonProps = {
  /** The completed run whose practice runs again. */
  runId: string;
  /** Where a failure's sentence is drawn; the button draws none itself. Called with '' when a
   * new try clears the sentence. */
  onError: (sentence: string) => void;
};

/** The summary's white "Re-run": starts a new run of the completed run's whole practice at
 * once, then opens the new run's page. */
export default function RerunButton({ runId, onError }: RerunButtonProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const rerunMutation = useMutation({
    mutationFn: () => rerunRun(runId),
    onSuccess: async (newRun) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['practice', newRun.practice_id] }),
        queryClient.invalidateQueries({ queryKey: ['practices'] }),
      ]);
      navigate(`/runs/${newRun.id}`);
    },
    onError: (error: Error) => onError(failureSentence(error, 'Run not found.')),
  });

  return (
    <button
      type="button"
      disabled={rerunMutation.isPending}
      onClick={() => {
        onError('');
        rerunMutation.mutate();
      }}
      className="tappable h-action shrink-0 rounded-2xl bg-(--color-surface) px-4.5 text-action font-semibold text-(--color-ink)"
    >
      Re-run
    </button>
  );
}
