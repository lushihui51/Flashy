import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { readSubjects } from 'src/api/subject';
import { readDecks } from 'src/api/deck';
import { deletePracticeRun, readPracticeRuns } from 'src/api/practice_run';
import PracticeFilterBar from 'src/components/practice/PracticeFilterBar';
import PracticeRunRow from 'src/components/practice/PracticeRunRow';
import AddButton from 'src/components/ui/AddButton';
import ConfirmDialog from 'src/components/ui/ConfirmDialog';
import Tabs, { type TabItem } from 'src/components/ui/Tabs';
import { failureSentence } from 'src/lib/failureSentence';
import { usePageTitle } from 'src/lib/pageTitle';
import { useViewParams } from 'src/lib/viewParams';
import type { components } from 'src/api/types';

type PracticeRunSummary = components['schemas']['PracticeRunSummary'];

const STATUS_TABS = ['all', 'active', 'completed'] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const TAB_ITEMS: TabItem<StatusTab>[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

function isStatusTab(value: string | null): value is StatusTab {
  return value !== null && (STATUS_TABS as readonly string[]).includes(value);
}

/** The session list. Filter state lives in the URL rather than component state so
 * every entry point into practice — the subject page's Practice button, the deck
 * page's, a shared link — is just a URL with the right params, and so going back
 * returns to the list the user was actually looking at. */
export default function PracticeOverviewPage() {
  usePageTitle('Practice');
  const { params, changeView } = useViewParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const filtersRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  // The list, its empty sentence or its failure sentence: whichever shows for the current
  // filters, so a reveal after a tab or filter change finds where the list starts, and
  // nothing while the old list stands in for the new one.
  const listRef = useRef<HTMLUListElement>(null);
  const emptyRef = useRef<HTMLDivElement>(null);
  const failureRef = useRef<HTMLParagraphElement>(null);

  const subjectId = params.get('subject');
  const deckId = params.get('deck');
  const statusTab: StatusTab = isStatusTab(params.get('status'))
    ? (params.get('status') as StatusTab)
    : 'all';

  const [pendingDelete, setPendingDelete] = useState<PracticeRunSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const subjectsQuery = useQuery({ queryKey: ['subjects'], queryFn: readSubjects });
  const decksQuery = useQuery({ queryKey: ['decks'], queryFn: () => readDecks() });
  // Subject and deck are sent to the server rather than filtered here: the relation
  // being asked about (practice_deck → deck → subject) lives there, and a session's
  // rows only carry the decks that still exist.
  const sessionsQuery = useQuery({
    queryKey: ['practice_runs', subjectId, deckId],
    queryFn: () =>
      readPracticeRuns({ subjectId: subjectId ?? undefined, deckId: deckId ?? undefined }),
    // An empty list while a filter's new one loads would shrink the page and lose the
    // user's place on it.
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => deletePracticeRun(sessionId),
    onSuccess: async () => {
      setPendingDelete(null);
      setDeleteError(null);
      await queryClient.invalidateQueries({ queryKey: ['practice_runs'] });
    },
    onError: (error: Error) => setDeleteError(failureSentence(error, 'Practice not found.')),
  });

  const listStart = () => listRef.current ?? emptyRef.current ?? failureRef.current;
  const filterTargets = {
    control: () => filtersRef.current?.firstElementChild ?? null,
    listStart,
  };
  const tabTargets = {
    // The whole tablist rather than the pressed tab, whose pressed look sits 2px lower than
    // the others: at the band's top it would leave them under the header.
    control: () => tabsRef.current?.querySelector('[role="tablist"]') ?? null,
    listStart,
  };

  const setFilters = (next: { subjectId: string | null; deckId: string | null }) => {
    const nextParams = new URLSearchParams(params);
    if (next.subjectId) nextParams.set('subject', next.subjectId);
    else nextParams.delete('subject');
    if (next.deckId) nextParams.set('deck', next.deckId);
    else nextParams.delete('deck');
    changeView(nextParams, filterTargets);
  };

  const setStatusTab = (tab: StatusTab) => {
    const nextParams = new URLSearchParams(params);
    if (tab === 'all') nextParams.delete('status');
    else nextParams.set('status', tab);
    changeView(nextParams, tabTargets);
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
        <h1 className="text-[30px] leading-[1.05] font-bold tracking-[-0.02em] text-(--color-ink)">
          Practice
        </h1>
        <AddButton
          label="Add practice"
          onClick={() => navigate({ pathname: '/practice/new', search: params.toString() })}
        />
      </div>

      <div ref={filtersRef} className="mt-3.5">
        <PracticeFilterBar
          subjects={subjectsQuery.data ?? []}
          decks={decksQuery.data ?? []}
          subjectId={subjectId}
          deckId={deckId}
          onChange={setFilters}
        />
      </div>

      <div ref={tabsRef} className="mt-3.5">
        <Tabs
          ariaLabel="Practice status"
          items={TAB_ITEMS}
          value={statusTab}
          onChange={setStatusTab}
        />
      </div>

      {sessionsQuery.isError && (
        <p ref={failureRef} role="alert" className="mt-4 text-sm text-(--color-wrong)">
          Could not load practices.
        </p>
      )}

      {sessionsQuery.data && sessions.length === 0 ? (
        <div
          ref={sessionsQuery.isPlaceholderData ? undefined : emptyRef}
          className="flex flex-col items-start gap-3 py-8"
        >
          <p className="text-[15px] text-(--color-aside)">
            {filtered ? 'No practices match these filters.' : 'No practices yet.'}
          </p>
          {/* No Add practice button here — the header's is always on screen. */}
          {filtered && (
            <button
              type="button"
              onClick={() => changeView(new URLSearchParams(), filterTargets)}
              className="tappable-sm h-10 rounded-full bg-(--color-surface) px-3.5 text-[15px] font-semibold text-(--color-ink)"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        // Nothing to hold while the list loads or fails, and an empty block would draw a bare
        // outline.
        sessions.length > 0 && (
          <ul
            ref={sessionsQuery.isPlaceholderData ? undefined : listRef}
            className="tappable mt-3.5 flex flex-col divide-y divide-(--color-line) rounded-[20px] bg-(--color-surface)"
          >
            {sessions.map((session) => (
              <li key={session.id}>
                <PracticeRunRow session={session} onDelete={() => setPendingDelete(session)} />
              </li>
            ))}
          </ul>
        )
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this practice?"
        // Deliberately says nothing about decks or configs: deleting a session takes its
        // own cards and snapshots and nothing else, and reviews already logged stay on
        // record.
        description="Its progress will be gone. The decks it practiced are not affected."
        confirmLabel="Delete"
        onConfirm={() => {
          setDeleteError(null);
          if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
        }}
        onCancel={() => {
          setPendingDelete(null);
          setDeleteError(null);
        }}
      >
        {deleteError && (
          <p role="alert" className="mt-2 text-sm text-(--color-wrong)">
            {deleteError}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
