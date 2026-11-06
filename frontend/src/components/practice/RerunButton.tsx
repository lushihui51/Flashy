import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { rerunPracticeRun } from 'src/api/practice_run';
import ConfirmDialog from 'src/components/ui/ConfirmDialog';
import { formatDateTime } from 'src/lib/datetime';
import { failureSentence } from 'src/lib/failureSentence';

type RerunButtonProps = {
  session: { id: string; name: string };
  /** `icon`: the practice's own page's square button with the RotateCcw icon. `text`: the
   * summary's white "Re-run" button. */
  look: 'icon' | 'text';
  /** Where a failure's sentence is drawn; the button draws none itself. Called with '' when a new
   * try or a cancel clears the sentence. */
  onError: (sentence: string) => void;
};

/** Runs a completed practice again after a confirm, then opens the new practice's page. */
export default function RerunButton({ session, look, onError }: RerunButtonProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmRerunOpen, setConfirmRerunOpen] = useState(false);

  const rerunMutation = useMutation({
    // Named the same way the creation page pre-fills its own name field (the one
    // sanctioned formatter) — generated fresh at click time, not cached from mount.
    mutationFn: () => rerunPracticeRun(session.id, formatDateTime(new Date())),
    onSuccess: async (newSession) => {
      await queryClient.invalidateQueries({ queryKey: ['practice_runs'] });
      navigate(`/practice/${newSession.id}`);
    },
    onError: (error: Error) => {
      setConfirmRerunOpen(false);
      onError(failureSentence(error, 'Practice not found.'));
    },
  });

  return (
    <>
      <button
        type="button"
        aria-label={`Re-run ${session.name}`}
        onClick={() => setConfirmRerunOpen(true)}
        className={
          look === 'icon'
            ? 'tappable flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-(--color-surface) text-(--color-ink)'
            : 'tappable h-action shrink-0 rounded-2xl bg-(--color-surface) px-4.5 text-action font-semibold text-(--color-ink)'
        }
      >
        {look === 'icon' ? <RotateCcw aria-hidden="true" className="size-icon" /> : 'Re-run'}
      </button>
      <ConfirmDialog
        open={confirmRerunOpen}
        title="Re-run this practice?"
        description="A new practice with the same decks is created. This practice and its reviews stay on record."
        confirmLabel="Re-run"
        onConfirm={() => {
          onError('');
          rerunMutation.mutate();
        }}
        onCancel={() => {
          setConfirmRerunOpen(false);
          onError('');
        }}
      />
    </>
  );
}
