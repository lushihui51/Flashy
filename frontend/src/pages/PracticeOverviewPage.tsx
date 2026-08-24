import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { readSubjects } from 'src/api/subject';
import { readDecks } from 'src/api/deck';
import { deletePracticeSession, readPracticeSessions } from 'src/api/practice_session';
import PracticeFilterBar from 'src/components/practice/PracticeFilterBar';
import PracticeSessionRow from 'src/components/practice/PracticeSessionRow';
import ConfirmDialog from 'src/components/ui/ConfirmDialog';
import type { components } from 'src/api/types';

type PracticeSessionSummary = components['schemas']['PracticeSessionSummary'];

const STATUS_TABS = ['all', 'active', 'completed'] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const TAB_LABELS: Record<StatusTab, string> = {
  all: 'All',
  active: 'Active',
  completed: 'Completed',
};

function isStatusTab(value: string | null): value is StatusTab {
  return value !== null && (STATUS_TABS as readonly string[]).includes(value);
}

/** The session list (§Phase 1). Filter state lives in the URL rather than component
 * state so every entry point into practice — the subject page's Practice button, the
 * deck page's, a shared link — is just a URL with the right params, and so going back
 * returns to the list the user was actually looking at. */
export default function PracticeOverviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const subjectId = searchParams.get('subject');
  const deckId = searchParams.get('deck');
  const statusTab: StatusTab = isStatusTab(searchParams.get('status'))
    ? (searchParams.get('status') as StatusTab)
    : 'all';

  const [pendingDelete, setPendingDelete] = useState<PracticeSessionSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const subjectsQuery = useQuery({ queryKey: ['subjects'], queryFn: readSubjects });
  const decksQuery = useQuery({ queryKey: ['decks'], queryFn: () => readDecks() });
  // Subject and deck are sent to the server rather than filtered here: the relation
  // being asked about (practice_deck → deck → subject) lives there, and a session's
  // rows only carry the decks that still exist.
  const sessionsQuery = useQuery({
    queryKey: ['practice_sessions', subjectId, deckId],
    queryFn: () =>
      readPracticeSessions({ subjectId: subjectId ?? undefined, deckId: deckId ?? undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => deletePracticeSession(sessionId),
    onSuccess: async () => {
      setPendingDelete(null);
      setDeleteError(null);
      await queryClient.invalidateQueries({ queryKey: ['practice_sessions'] });
    },
    onError: (error: Error) => setDeleteError(error.message),
  });

  const setFilters = (next: { subjectId: string | null; deckId: string | null }) => {
    const params = new URLSearchParams(searchParams);
    if (next.subjectId) params.set('subject', next.subjectId);
    else params.delete('subject');
    if (next.deckId) params.set('deck', next.deckId);
    else params.delete('deck');
    setSearchParams(params, { replace: true });
  };

  const setStatusTab = (tab: StatusTab) => {
    const params = new URLSearchParams(searchParams);
    if (tab === 'all') params.delete('status');
    else params.set('status', tab);
    setSearchParams(params, { replace: true });
  };

  // Status is the one filter the server doesn't take: it isn't a relation, and every
  // session the other two filters returned is already in hand.
  const sessions = (sessionsQuery.data ?? []).filter(
    (session) => statusTab === 'all' || session.status === statusTab,
  );

  const filtered = subjectId !== null || deckId !== null || statusTab !== 'all';

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-(--color-text)">Practice</h1>
        <button
          type="button"
          onClick={() => navigate({ pathname: '/practice/new', search: searchParams.toString() })}
          className="h-9 shrink-0 rounded-full bg-(--color-primary) px-3 text-sm font-semibold text-(--color-primary-contrast)"
        >
          New practice
        </button>
      </div>

      <div className="mt-4">
        <PracticeFilterBar
          subjects={subjectsQuery.data ?? []}
          decks={decksQuery.data ?? []}
          subjectId={subjectId}
          deckId={deckId}
          onChange={setFilters}
        />
      </div>

      <div
        role="tablist"
        aria-label="Session status"
        className="mt-4 flex gap-4 border-b border-(--color-surface-elevated)"
      >
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={statusTab === tab}
            onClick={() => setStatusTab(tab)}
            className={`h-11 border-b-2 px-1 text-sm font-medium ${
              statusTab === tab
                ? 'border-(--color-primary) text-(--color-text)'
                : 'border-transparent text-(--color-text-muted)'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {sessionsQuery.isError && (
        <p role="alert" className="mt-4 text-sm text-(--color-danger)">
          Could not load practice sessions.
        </p>
      )}

      {sessionsQuery.data && sessions.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-8">
          <p className="text-(--color-text-muted)">
            {filtered ? 'No practice sessions match these filters.' : 'No practice sessions yet.'}
          </p>
          {filtered ? (
            <button
              type="button"
              onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}
              className="h-9 rounded-full border border-(--color-text-muted) px-3 text-sm font-medium text-(--color-text)"
            >
              Clear filters
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/practice/new')}
              className="h-9 rounded-full bg-(--color-primary) px-3 text-sm font-semibold text-(--color-primary-contrast)"
            >
              New practice
            </button>
          )}
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-(--color-surface-elevated)">
          {sessions.map((session) => (
            <li key={session.id}>
              <PracticeSessionRow session={session} onDelete={() => setPendingDelete(session)} />
            </li>
          ))}
        </ul>
      )}

      {deleteError && (
        <p role="alert" className="mt-2 text-sm text-(--color-danger)">
          {deleteError}
        </p>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this practice session?"
        // Deliberately says nothing about decks or configs: deleting a session takes its
        // own cards and snapshots and nothing else (ADR 015, amended), and reviews
        // already logged stay on record.
        description="Its progress will be gone. The decks it practised are not affected."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
        }}
        onCancel={() => {
          setPendingDelete(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
