import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Trash2 } from 'lucide-react';
import {
  deletePracticeRun,
  readPracticeRun,
  readPracticeRunBreakdown,
  rerunPracticeRun,
} from 'src/api/practice_run';
import PracticeStatusBadge from 'src/components/practice/PracticeStatusBadge';
import RunBreakdown from 'src/components/practice/RunBreakdown';
import SessionDeckChips from 'src/components/practice/SessionDeckChips';
import Breadcrumb from 'src/components/ui/Breadcrumb';
import ConfirmDialog from 'src/components/ui/ConfirmDialog';
import { isNotFound } from 'src/api/unwrap';
import { formatDateTime } from 'src/lib/datetime';
import { failureSentence } from 'src/lib/failureSentence';
import { usePageTitle } from 'src/lib/pageTitle';
import type { components } from 'src/api/types';

type PracticeRunSummary = components['schemas']['PracticeRunSummary'];

const HEADER_ACTION_CLASS =
  'tappable flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-(--color-surface) text-(--color-ink)';

/**
 * One practice's own page: name, status, when it was created, which decks it covers,
 * and — while it's still active — the way into it. Delete and, once completed, Re-run
 * are the entity actions and so live in the header; create is start, so there is
 * nothing to edit beyond that.
 *
 * The body is a separate component, gated on the session actually being loaded — same
 * reason DeckConfigurationEditor gates its body on the config: everything below needs
 * real data, and splitting it out keeps this component's own hook count fixed instead
 * of some of them running only once the query resolves.
 */
export default function PracticeDetailsPage() {
  const { practiceSessionId } = useParams<{ practiceSessionId: string }>();

  const sessionQuery = useQuery({
    queryKey: ['practice_run_summary', practiceSessionId],
    queryFn: () => readPracticeRun(practiceSessionId!),
    enabled: !!practiceSessionId,
  });
  usePageTitle(sessionQuery.data?.name);

  if (sessionQuery.isError) {
    return (
      <div className="p-4">
        {isNotFound(sessionQuery.error) ? (
          <p className="text-(--color-aside)">Practice not found.</p>
        ) : (
          <p role="alert" className="text-sm text-(--color-wrong)">
            Could not load this practice.
          </p>
        )}
      </div>
    );
  }
  if (!sessionQuery.data) return null;

  return <PracticeDetailsPageBody session={sessionQuery.data} />;
}

function PracticeDetailsPageBody({ session }: { session: PracticeRunSummary }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmRerunOpen, setConfirmRerunOpen] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);

  // Only a completed session has a breakdown to show — the router itself 409s a
  // breakdown request for an active one, so this stays disabled until then.
  const breakdownQuery = useQuery({
    queryKey: ['practice_run_breakdown', session.id],
    queryFn: () => readPracticeRunBreakdown(session.id),
    enabled: session.status === 'completed',
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePracticeRun(session.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['practice_runs'] });
      navigate('/practice');
    },
    onError: (error: Error) => setDeleteError(failureSentence(error, 'Practice not found.')),
  });

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
      setRerunError(failureSentence(error, 'Practice not found.'));
    },
  });

  return (
    <div className="p-4">
      <Breadcrumb places={[{ label: 'Practice', to: '/practice' }]} />

      <div className="mt-3.5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <h1 className="min-w-0 text-page leading-[1.05] font-bold tracking-[-0.02em] break-words text-(--color-ink)">
            {session.name}
          </h1>
          <PracticeStatusBadge status={session.status} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {session.status === 'completed' && (
            <button
              type="button"
              aria-label={`Re-run ${session.name}`}
              onClick={() => setConfirmRerunOpen(true)}
              className={HEADER_ACTION_CLASS}
            >
              <RotateCcw aria-hidden="true" className="size-icon" />
            </button>
          )}
          <button
            type="button"
            aria-label={`Delete ${session.name}`}
            onClick={() => setConfirmDeleteOpen(true)}
            className={HEADER_ACTION_CLASS}
          >
            <Trash2 aria-hidden="true" className="size-icon" />
          </button>
        </div>
      </div>

      {/* The rerun mutation's dialog closes on failure (unlike delete's, which stays
          open), so its error renders here instead — same alert styling as the delete
          error, next to the header actions that triggered it. */}
      {rerunError && (
        <p role="alert" className="mt-1 text-sm text-(--color-wrong)">
          {rerunError}
        </p>
      )}

      <p className="mt-1 text-body text-(--color-aside)">{formatDateTime(session.created_at)}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-2">
        <SessionDeckChips decks={session.decks} variant="full" />
      </div>

      {session.status === 'active' ? (
        <button
          type="button"
          onClick={() => navigate(`/practice/${session.id}/run`)}
          className="tappable mt-6 h-action w-full rounded-2xl bg-(--color-main-action) text-action font-semibold text-(--color-ink)"
        >
          Start practice
        </button>
      ) : (
        <div className="mt-6">
          {breakdownQuery.isError && (
            <p role="alert" className="text-sm text-(--color-wrong)">
              {failureSentence(breakdownQuery.error, 'Practice not found.')}
            </p>
          )}
          {breakdownQuery.data && <RunBreakdown breakdown={breakdownQuery.data} />}
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete this practice?"
        // Same copy the overview uses — deliberately says nothing about decks or
        // configs: deleting a session takes its own cards and snapshots and nothing
        // else, and reviews already logged stay on record.
        description="Its progress will be gone. The decks it practiced are not affected."
        confirmLabel="Delete"
        onConfirm={() => {
          setDeleteError(null);
          deleteMutation.mutate();
        }}
        onCancel={() => {
          setConfirmDeleteOpen(false);
          setDeleteError(null);
        }}
      >
        {deleteError && (
          <p role="alert" className="mt-2 text-sm text-(--color-wrong)">
            {deleteError}
          </p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmRerunOpen}
        title="Re-run this practice?"
        description="A new practice with the same decks is created. This practice and its reviews stay on record."
        confirmLabel="Re-run"
        onConfirm={() => {
          setRerunError(null);
          rerunMutation.mutate();
        }}
        onCancel={() => {
          setConfirmRerunOpen(false);
          setRerunError(null);
        }}
      />
    </div>
  );
}
