import { useId, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { readSubjects } from 'src/api/subject';
import { readDecks } from 'src/api/deck';
import { readDeckPracticeConfigs } from 'src/api/deck_practice_config';
import { createPracticeSession } from 'src/api/practice_session';
import { ApiDetailError } from 'src/api/unwrap';
import PracticeFilterBar from 'src/components/practice/PracticeFilterBar';
import ConfigurationPickList from 'src/components/practice/ConfigurationPickList';
import AddButton from 'src/components/ui/AddButton';
import { formatDateTime } from 'src/lib/datetime';
import { groupConfigurationsByDeck } from 'src/lib/practiceConfigurationGroups';

type RowError = { configId: string; message: string };

/**
 * `/practice/new`: filter, pick one configuration per deck, name, create. Create *is*
 * start (invariant 2) — there is no draft state, so a successful post lands straight on
 * the new session's own page.
 */
export default function PracticeCreatePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const nameInputId = useId();

  const subjectId = searchParams.get('subject');
  const deckId = searchParams.get('deck');

  // Per MD-4, selection lives in component state rather than the URL: it must survive
  // filter changes, which the URL-driven subject/deck params deliberately don't.
  const [selection, setSelection] = useState<Record<string, string>>({});
  // Prefilled with the moment the page opened (ADR 019's one sanctioned formatter) —
  // the same call DeckConfigurationEditor makes for a config name.
  const [name, setName] = useState(() => formatDateTime(new Date()));
  const [rowError, setRowError] = useState<RowError | null>(null);
  const [topError, setTopError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // The "New configuration…" round trip hands back `location.state.configurationId`
  // once. Captured via a state initializer (read only at mount) so a later re-render
  // (e.g. toggling a filter) can't reapply it and fight the user's own selection.
  const [returnedConfigId] = useState(
    () => (location.state as { configurationId?: string } | null)?.configurationId ?? null,
  );
  const [appliedReturnedConfig, setAppliedReturnedConfig] = useState(false);

  const subjectsQuery = useQuery({ queryKey: ['subjects'], queryFn: readSubjects });
  const decksQuery = useQuery({ queryKey: ['decks'], queryFn: () => readDecks() });
  const configsQuery = useQuery({
    queryKey: ['deck_practice_configs', subjectId, deckId],
    queryFn: () =>
      readDeckPracticeConfigs({ subjectId: subjectId ?? undefined, deckId: deckId ?? undefined }),
  });

  const groups = groupConfigurationsByDeck(configsQuery.data ?? []);

  // Adjusting state during render, the same pattern DeckConfigurationEditor uses to
  // resync its board once a deck's fields land: run once the returned config actually
  // appears in the fetched list, guarded so it never reapplies. Consumed only on a
  // match: after the builder round trip this page remounts onto the *stale cached*
  // list first (the invalidated refetch is still in flight), and a freshly created
  // configuration is only in the refetched one — spending the one-shot on the stale
  // render would drop the auto-select.
  if (!appliedReturnedConfig && returnedConfigId && configsQuery.data) {
    const match = configsQuery.data.find((config) => config.id === returnedConfigId);
    if (match) {
      setSelection((current) => ({ ...current, [match.deck_id]: match.id }));
      setAppliedReturnedConfig(true);
    }
  }

  const createMutation = useMutation({
    mutationFn: () =>
      createPracticeSession({
        name: name.trim(),
        deck_practice_config_ids: Object.values(selection),
      }),
    onSuccess: async (session) => {
      await queryClient.invalidateQueries({ queryKey: ['practice_sessions'] });
      navigate(`/practice/${session.id}`);
    },
    onError: (error: Error) => {
      if (error instanceof ApiDetailError) {
        if (error.detail.code === 'stale_config' && error.detail.config_id) {
          setRowError({
            configId: error.detail.config_id,
            message: 'This configuration no longer produces any prompts — edit it.',
          });
          return;
        }
        if (error.detail.code === 'config_not_found') {
          setTopError('A selected configuration no longer exists.');
          queryClient.invalidateQueries({ queryKey: ['deck_practice_configs'] });
          return;
        }
      }
      // duplicate_deck (unreachable through the radio UI) and anything else.
      setSaveError(error.message);
    },
  });

  const setFilters = (next: { subjectId: string | null; deckId: string | null }) => {
    const params = new URLSearchParams(searchParams);
    if (next.subjectId) params.set('subject', next.subjectId);
    else params.delete('subject');
    if (next.deckId) params.set('deck', next.deckId);
    else params.delete('deck');
    setSearchParams(params, { replace: true });
  };

  const newConfiguration = () => {
    const params = new URLSearchParams();
    if (subjectId) params.set('subject', subjectId);
    if (deckId) params.set('deck', deckId);
    // ADR 024: returnTo rides the URL, not router state — it has to survive a further
    // forward if the builder itself opens "New deck…" before coming back here.
    params.set('returnTo', `${location.pathname}${location.search}`);
    navigate({ pathname: '/deck-configurations/new', search: params.toString() });
  };

  const selectedCount = Object.keys(selection).length;
  const nameMissing = name.trim() === '';
  const canCreate = selectedCount > 0 && !nameMissing && !createMutation.isPending;
  const filtered = subjectId !== null || deckId !== null;

  const submit = () => {
    setRowError(null);
    setTopError(null);
    setSaveError(null);
    createMutation.mutate();
  };

  return (
    <div className="p-4">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between bg-(--color-surface) px-4 py-2">
        <button
          type="button"
          onClick={() => navigate({ pathname: '/practice', search: searchParams.toString() })}
          className="text-sm font-medium text-(--color-text-secondary)"
        >
          Cancel
        </button>
        <h1 className="text-base font-semibold text-(--color-text)">New practice</h1>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <span className="text-sm text-(--color-text-muted)">{selectedCount} selected</span>
          )}
          <button
            type="button"
            disabled={!canCreate}
            onClick={submit}
            className="text-sm font-semibold text-(--color-primary) disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </div>

      <div className="mt-3">
        <PracticeFilterBar
          subjects={subjectsQuery.data ?? []}
          decks={decksQuery.data ?? []}
          subjectId={subjectId}
          deckId={deckId}
          onChange={setFilters}
        />
      </div>

      <div className="flex justify-end py-2">
        <AddButton label="New configuration" onClick={newConfiguration} />
      </div>

      {configsQuery.isError && (
        <p role="alert" className="text-sm text-(--color-danger)">
          Could not load deck configurations.
        </p>
      )}

      {topError && (
        <p role="alert" className="text-sm text-(--color-danger)">
          {topError}
        </p>
      )}

      {configsQuery.data && groups.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-8">
          <p className="text-(--color-text-muted)">
            {filtered ? 'No configurations match these filters.' : 'No deck configurations yet.'}
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
            <AddButton label="New configuration" onClick={newConfiguration} />
          )}
        </div>
      ) : (
        <ConfigurationPickList
          groups={groups}
          selection={selection}
          rowError={rowError}
          onSelect={(deck, config) => setSelection((current) => ({ ...current, [deck]: config }))}
        />
      )}

      <div className="mt-4 flex flex-col gap-1">
        <label htmlFor={nameInputId} className="text-sm font-medium text-(--color-text)">
          Name
        </label>
        <input
          id={nameInputId}
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-11 rounded-lg border border-(--color-surface-elevated) px-3 text-(--color-text)"
        />
      </div>

      {(selectedCount === 0 || nameMissing) && (
        <p className="mt-3 text-sm text-(--color-text-muted)">
          {selectedCount === 0
            ? 'Select at least one configuration to practise.'
            : 'Give this practice a name to create it.'}
        </p>
      )}

      {saveError && (
        <p role="alert" className="mt-3 text-sm text-(--color-danger)">
          {saveError}
        </p>
      )}
    </div>
  );
}
