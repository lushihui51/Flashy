import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { readSubjects } from 'src/api/subject';
import { readDecks } from 'src/api/deck';
import { deleteDeckPracticeConfig, readDeckPracticeConfigs } from 'src/api/deck_practice_config';
import PracticeFilterBar from 'src/components/practice/PracticeFilterBar';
import PracticeConfigRow from 'src/components/practice/PracticeConfigRow';
import ConfirmDialog from 'src/components/ui/ConfirmDialog';
import type { components } from 'src/api/types';

type DeckPracticeConfigSummary = components['schemas']['DeckPracticeConfigSummary'];

/** The saved configs, filterable by the same subject/deck pair as the overview. A config
 * is a reusable template, not part of any session — deleting one here never touches a
 * session that used it (invariant 3), which is what the confirm says. */
export default function PracticeConfigsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const subjectId = searchParams.get('subject');
  const deckId = searchParams.get('deck');

  const [pendingDelete, setPendingDelete] = useState<DeckPracticeConfigSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const subjectsQuery = useQuery({ queryKey: ['subjects'], queryFn: readSubjects });
  const decksQuery = useQuery({ queryKey: ['decks'], queryFn: () => readDecks() });
  const configsQuery = useQuery({
    queryKey: ['deck_practice_configs', subjectId, deckId],
    queryFn: () =>
      readDeckPracticeConfigs({ subjectId: subjectId ?? undefined, deckId: deckId ?? undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDeckPracticeConfig(id),
    onSuccess: async () => {
      setPendingDelete(null);
      setDeleteError(null);
      await queryClient.invalidateQueries({ queryKey: ['deck_practice_configs'] });
    },
    onError: (error: Error) => setDeleteError(error.message),
  });

  const newConfigSearch = searchParams.toString();
  const goToNewConfig = () =>
    navigate({ pathname: '/practice/configs/new', search: newConfigSearch });

  const configs = configsQuery.data ?? [];
  const filtered = subjectId !== null || deckId !== null;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-(--color-text)">Practice configs</h1>
        <button
          type="button"
          onClick={goToNewConfig}
          className="h-9 shrink-0 rounded-full bg-(--color-primary) px-3 text-sm font-semibold text-(--color-primary-contrast)"
        >
          New config
        </button>
      </div>

      <div className="mt-4">
        <PracticeFilterBar
          subjects={subjectsQuery.data ?? []}
          decks={decksQuery.data ?? []}
          subjectId={subjectId}
          deckId={deckId}
          onChange={(next) => {
            const params = new URLSearchParams(searchParams);
            if (next.subjectId) params.set('subject', next.subjectId);
            else params.delete('subject');
            if (next.deckId) params.set('deck', next.deckId);
            else params.delete('deck');
            setSearchParams(params, { replace: true });
          }}
        />
      </div>

      {configsQuery.isError && (
        <p role="alert" className="mt-4 text-sm text-(--color-danger)">
          Could not load practice configs.
        </p>
      )}

      {configsQuery.data && configs.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-8">
          <p className="text-(--color-text-muted)">
            {filtered ? 'No configs match these filters.' : 'No practice configs yet.'}
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
              onClick={goToNewConfig}
              className="h-9 rounded-full bg-(--color-primary) px-3 text-sm font-semibold text-(--color-primary-contrast)"
            >
              New config
            </button>
          )}
        </div>
      ) : (
        <ul className="mt-2 flex flex-col divide-y divide-(--color-surface-elevated)">
          {configs.map((config) => (
            <li key={config.id}>
              <PracticeConfigRow config={config} onDelete={() => setPendingDelete(config)} />
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
        title="Delete this config?"
        // Nothing alarming to say: a session copied whatever it needed at the moment it
        // started (ADR 013), so past and running sessions are genuinely unaffected.
        description="Practice sessions that already used it are unaffected."
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
