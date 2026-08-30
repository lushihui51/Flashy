import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, RotateCcw, Trash2 } from 'lucide-react';
import {
  deletePracticeSession,
  readPracticeSession,
  readPracticeSessionBreakdown,
  rerunPracticeSession,
} from 'src/api/practice_session';
import PracticeStatusBadge from 'src/components/practice/PracticeStatusBadge';
import SessionBreakdown from 'src/components/practice/SessionBreakdown';
import SessionDeckChips from 'src/components/practice/SessionDeckChips';
import ConfirmDialog from 'src/components/ui/ConfirmDialog';
import { formatDateTime } from 'src/lib/datetime';
import type { components } from 'src/api/types';

type PracticeSessionSummary = components['schemas']['PracticeSessionSummary'];

/**
 * One practice's own page: name, status, when it was created, which decks it covers,
 * and — while it's still active — the way into it. Delete and, once completed,
 * Re-run (ADR 030) are the entity actions and so live in the header (ADR 023); create
 * is start (invariant 2), so there is nothing to edit beyond that.
 *
 * The body is a separate component, gated on the session actually being loaded — same
 * reason DeckConfigurationEditor gates its body on the config: everything below needs
 * real data, and splitting it out keeps this component's own hook count fixed instead
 * of some of them running only once the query resolves.
 */
export default function PracticeDetailsPage() {
  const { practiceSessionId } = useParams<{ practiceSessionId: string }>();

  const sessionQuery = useQuery({
    queryKey: ['practice_session', practiceSessionId],
    queryFn: () => readPracticeSession(practiceSessionId!),
    enabled: !!practiceSessionId,
  });

  if (sessionQuery.isError) {
    return (
      <div className="p-4">
        <p className="text-(--color-text-muted)">Practice session not found.</p>
      </div>
    );
  }
  if (!sessionQuery.data) return null;

  return <PracticeDetailsPageBody session={sessionQuery.data} />;
}

function PracticeDetailsPageBody({ session }: { session: PracticeSessionSummary }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmRerunOpen, setConfirmRerunOpen] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);

  // Only a completed session has a breakdown to show (ADR 029) — the router itself
  // 409s a breakdown request for an active one, so this stays disabled until then.
  const breakdownQuery = useQuery({
    queryKey: ['practice_breakdown', session.id],
    queryFn: () => readPracticeSessionBreakdown(session.id),
    enabled: session.status === 'completed',
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePracticeSession(session.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['practice_sessions'] });
      navigate('/practice');
    },
    onError: (error: Error) => setDeleteError(error.message),
  });

  const rerunMutation = useMutation({
    mutationFn: () => rerunPracticeSession(session.id),
    onSuccess: async (newSession) => {
      await queryClient.invalidateQueries({ queryKey: ['practice_sessions'] });
      navigate(`/practice/${newSession.id}`);
    },
    onError: (error: Error) => {
      setConfirmRerunOpen(false);
      setRerunError(error.message);
    },
  });

  return (
    <div className="p-4">
      <Link
        to="/practice"
        className="inline-flex items-center gap-1 text-[13px] text-(--color-text-secondary)"
      >
        <ChevronLeft aria-hidden="true" className="h-[15px] w-[15px]" />
        Practice
      </Link>

      <div className="mt-1 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-xl font-semibold text-(--color-text)">{session.name}</h1>
          <PracticeStatusBadge status={session.status} />
        </div>
        <div className="flex shrink-0 items-center">
          {session.status === 'completed' && (
            <button
              type="button"
              aria-label={`Re-run ${session.name}`}
              onClick={() => setConfirmRerunOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center text-(--color-text-muted)"
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            aria-label={`Delete ${session.name}`}
            onClick={() => setConfirmDeleteOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center text-(--color-text-muted)"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ADR 035: the rerun mutation's dialog closes on failure (unlike delete's,
          which stays open), so its error renders here instead — same alert styling as
          the delete error, next to the header actions that triggered it. */}
      {rerunError && (
        <p role="alert" className="mt-1 text-sm text-(--color-danger)">
          {rerunError}
        </p>
      )}

      <p className="mt-1 text-sm text-(--color-text-muted)">{formatDateTime(session.created_at)}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1">
        <SessionDeckChips decks={session.decks} deletedDeckCount={session.deleted_deck_count} />
      </div>

      {session.status === 'active' ? (
        <button
          type="button"
          onClick={() => navigate(`/practice/${session.id}/run`)}
          className="mt-6 h-11 w-full rounded-full bg-(--color-primary) text-sm font-semibold text-(--color-primary-contrast)"
        >
          Start practice
        </button>
      ) : (
        <div className="mt-6">
          {breakdownQuery.isError && (
            <p role="alert" className="text-sm text-(--color-danger)">
              {breakdownQuery.error.message}
            </p>
          )}
          {breakdownQuery.data && <SessionBreakdown breakdown={breakdownQuery.data} />}
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete this practice session?"
        // Same copy the overview uses — deliberately says nothing about decks or
        // configs: deleting a session takes its own cards and snapshots and nothing
        // else (ADR 015, amended), and reviews already logged stay on record.
        description="Its progress will be gone. The decks it practised are not affected."
        confirmLabel="Delete"
        destructive
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
          <p role="alert" className="mt-2 text-sm text-(--color-danger)">
            {deleteError}
          </p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmRerunOpen}
        title="Re-run this practice?"
        description="A new practice with the same decks is created, and this one is deleted. Reviews already logged stay on record."
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
