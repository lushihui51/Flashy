import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { deletePractice, readPractice, renamePractice } from 'src/api/practice';
import type { components } from 'src/api/types';
import { ApiDetailError, isNotFound } from 'src/api/unwrap';
import ConfirmDialog from 'src/components/ui/ConfirmDialog';
import FormBar from 'src/components/ui/FormBar';
import FormPart from 'src/components/ui/FormPart';
import SubmitButton from 'src/components/ui/SubmitButton';
import { failureSentence } from 'src/lib/failureSentence';
import { useLeaveForm } from 'src/lib/leaveForm';
import { usePageTitle } from 'src/lib/pageTitle';
import { internalReturnTo } from 'src/lib/returnTo';
import { useViewParams } from 'src/lib/viewParams';

/**
 * `/practices/:practiceId/edit`: the practice's Name, and Delete practice. Save lands on
 * `returnTo`, else the practice's page; Cancel on `cancelTo`, else the practice's page;
 * a deletion on All practices.
 */
export default function PracticeEditPage() {
  const { practiceId } = useParams<{ practiceId: string }>();
  const practiceQuery = useQuery({
    queryKey: ['practice', practiceId],
    queryFn: () => readPractice(practiceId!),
    enabled: !!practiceId,
  });
  usePageTitle(practiceQuery.data ? 'Edit practice' : undefined);

  if (practiceQuery.isError) {
    return (
      <div className="p-4">
        {isNotFound(practiceQuery.error) ? (
          <p className="text-(--color-aside)">Practice not found.</p>
        ) : (
          <FormPart sentence="Could not load this practice." look="wrong">
            {null}
          </FormPart>
        )}
      </div>
    );
  }
  if (!practiceQuery.data) return null;
  return <PracticeEditBody practice={practiceQuery.data} />;
}

function PracticeEditBody({ practice }: { practice: components['schemas']['PracticeDetail'] }) {
  const { params, revealFirstSentence } = useViewParams();
  const leaveForm = useLeaveForm();
  const queryClient = useQueryClient();
  const rootRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(practice.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const practicePage = `/practices/${practice.id}`;

  // Every page that names the practice reads it again: its own page, All practices, Home's
  // runs and a run's row of places.
  const forgetPracticeName = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['practice', practice.id] }),
      queryClient.invalidateQueries({ queryKey: ['practices'] }),
      queryClient.invalidateQueries({ queryKey: ['home'] }),
      queryClient.invalidateQueries({ queryKey: ['run'] }),
    ]);

  const saveMutation = useMutation({
    mutationFn: () => renamePractice(practice.id, name.trim()),
    onSuccess: async () => {
      await forgetPracticeName();
      await leaveForm(internalReturnTo(params, 'returnTo') ?? practicePage);
    },
    onError: (error: Error) => {
      const sentence = failureSentence(error, 'Practice not found.');
      // A taken name is fixed at Name, so it is said there rather than in the bar.
      if (error instanceof ApiDetailError && error.detail.code === 'practice_name_taken') {
        setNameError(sentence);
        revealFirstSentence(rootRef.current);
      } else {
        setSaveError(sentence);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePractice(practice.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['practices'] }),
        queryClient.invalidateQueries({ queryKey: ['home'] }),
      ]);
      await leaveForm('/practices');
      // Only once the form is gone: it watches the practice's query until it unmounts, and
      // dropping the query sooner refetches a practice that no longer exists.
      queryClient.removeQueries({ queryKey: ['practice', practice.id] });
    },
    onError: (error: Error) => {
      setSaveError(failureSentence(error, 'Practice not found.'));
      setConfirmDeleteOpen(false);
    },
  });

  const cancel = () => void leaveForm(internalReturnTo(params, 'cancelTo') ?? practicePage);

  return (
    <div ref={rootRef} className="p-4">
      <h1 className="text-page leading-[1.05] font-bold tracking-[-0.02em] text-(--color-ink)">
        Edit practice
      </h1>

      <FormPart sentence={nameError} look="wrong" className="mt-3.5 flex flex-col gap-1.5">
        <label className="flex flex-col gap-1.5">
          <span className="text-label text-(--color-aside)">Name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setNameError(null);
            }}
            className="h-field rounded-field outlined-ink bg-(--color-surface) px-3.5 text-base text-(--color-ink)"
          />
        </label>
      </FormPart>

      <button
        type="button"
        onClick={() => {
          setSaveError(null);
          setConfirmDeleteOpen(true);
        }}
        disabled={deleteMutation.isPending}
        className="mt-7 tappable-sm flex h-12 w-full items-center justify-center gap-1.5 rounded-2xl bg-(--color-surface) text-body font-semibold text-(--color-ink) disabled:border-(--color-line) disabled:text-(--color-aside) disabled:[box-shadow:none]"
      >
        <Trash2 aria-hidden="true" className="size-4" />
        Delete practice
      </button>

      <FormBar sentence={saveError}>
        <button
          type="button"
          onClick={cancel}
          className="tappable shrink-0 h-action rounded-2xl bg-(--color-surface) px-4.5 text-action font-semibold text-(--color-ink)"
        >
          Cancel
        </button>
        <SubmitButton
          ready={name.trim() !== ''}
          busy={saveMutation.isPending}
          onNotReady={() => setNameError('Name is required.')}
          onPress={() => {
            setSaveError(null);
            setNameError(null);
            saveMutation.mutate();
          }}
        >
          Save
        </SubmitButton>
      </FormBar>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete this practice?"
        description="Its runs will be gone. Its decks and your mastery stay as they are."
        confirmLabel="Delete"
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
