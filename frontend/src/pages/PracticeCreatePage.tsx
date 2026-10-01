import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { readSubjects } from 'src/api/subject';
import { readDecks } from 'src/api/deck';
import { readDeckPracticeConfigs } from 'src/api/deck_practice_config';
import { createPracticeRun } from 'src/api/practice_run';
import { ApiDetailError } from 'src/api/unwrap';
import PracticeFilterBar from 'src/components/practice/PracticeFilterBar';
import ConfigurationPickList from 'src/components/practice/ConfigurationPickList';
import SelectedConfigurationList from 'src/components/practice/SelectedConfigurationList';
import AddButton from 'src/components/ui/AddButton';
import { formatDateTime } from 'src/lib/datetime';
import { MISSING_CONFIGURATION_MESSAGE, NO_CARDS_MESSAGE } from 'src/lib/practiceCopy';
import { groupConfigurationsByDeck } from 'src/lib/practiceConfigurationGroups';
import {
  readSelectedConfigIds,
  selectConfig,
  toggleConfig,
  withSelectedConfigIds,
} from 'src/lib/practiceSelection';

type RowError = { configId: string; message: string };

/** The overview's own params — the only ones Cancel hands back, so the draft never
 * leaves this page (ADR 061). */
const OVERVIEW_PARAMS = ['subject', 'deck', 'status'] as const;

/**
 * `/practice/new`: name, filter, tick at most one configuration per deck, create. The
 * draft rides the URL — repeated `config` params and a `name` param (ADR 061) — so it
 * survives every round trip, a refresh, and back. Create *is* start (invariant 2) — a
 * successful post lands straight on the new session's own page.
 */
export default function PracticeCreatePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const nameInputId = useId();
  const selectedHeadingId = useId();

  const subjectId = searchParams.get('subject');
  const deckId = searchParams.get('deck');
  const selectedIds = readSelectedConfigIds(searchParams);
  const selectedIdSet = new Set(selectedIds);

  // Read from the URL once, at mount (ADR 061): the `name` param is absent until the
  // first edit, so a fresh page is prefilled with the moment it opened (ADR 019's one
  // sanctioned formatter — the same call DeckConfigurationEditor makes for a config
  // name), while a round trip or refresh comes back to whatever was typed, empty
  // included. The input stays bound to this local buffer, which mirrors each change to
  // the URL; binding it to the URL would route every keystroke through a navigation.
  const [name, setName] = useState(() => searchParams.get('name') ?? formatDateTime(new Date()));
  const [rowError, setRowError] = useState<RowError | null>(null);
  const [topError, setTopError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // The "New configuration…" round trip hands back `location.state.configurationId`
  // once. Captured via a state initializer (read only at mount) so a later re-render
  // (e.g. toggling a filter) can't reapply it and fight the user's own selection.
  const [returnedConfigId] = useState(
    () => (location.state as { configurationId?: string } | null)?.configurationId ?? null,
  );
  // A ref, not state: the effect below writes the URL, and a state flag would put a
  // setState inside that same effect.
  const appliedReturnedConfig = useRef(false);

  const subjectsQuery = useQuery({ queryKey: ['subjects'], queryFn: readSubjects });
  const decksQuery = useQuery({ queryKey: ['decks'], queryFn: () => readDecks() });
  const configsQuery = useQuery({
    queryKey: ['deck_practice_configs', subjectId, deckId],
    queryFn: () =>
      readDeckPracticeConfigs({ subjectId: subjectId ?? undefined, deckId: deckId ?? undefined }),
  });

  // Every configuration, unfiltered (MD-3): the Selected section resolves ids against
  // this, since the filtered list lacks any selection a filter hides. The same key the
  // filtered query uses with no filter set, so an unfiltered page makes one request.
  const allConfigsQuery = useQuery({
    queryKey: ['deck_practice_configs', null, null],
    queryFn: () => readDeckPracticeConfigs(),
  });

  const groups = groupConfigurationsByDeck(configsQuery.data ?? []);
  // Filtering keeps the backend's subject → deck → name order (MD-5).
  const selectedConfigs = (allConfigsQuery.data ?? []).filter((config) =>
    selectedIdSet.has(config.id),
  );

  // Selected ids the list of all configurations shows gone (MD-4). Judged only on
  // settled data: after a round trip this page remounts onto the cached list while the
  // invalidated refetch runs, and a configuration created on that trip is only in the
  // refetched one — judging the cached list would remove it.
  // Memoised so the effect below re-runs only when the URL or the settled list changes.
  const settledConfigs = allConfigsQuery.isFetching ? undefined : allConfigsQuery.data;
  const missingIds = useMemo(() => {
    if (!settledConfigs) return [];
    const knownIds = new Set(settledConfigs.map((config) => config.id));
    return readSelectedConfigIds(searchParams).filter((id) => !knownIds.has(id));
  }, [settledConfigs, searchParams]);

  // Adjusting state during render, as DeckConfigurationEditor does once a deck's
  // fields land, so no setState runs in the effect below. Stays until the next Create
  // press clears it, as every topError does.
  if (missingIds.length > 0 && topError !== MISSING_CONFIGURATION_MESSAGE) {
    setTopError(MISSING_CONFIGURATION_MESSAGE);
  }

  // The one effect that writes the URL in reaction to fetched data (ADR 061): two
  // `setSearchParams` calls after one render both start from that render's params, and
  // the second would overwrite the first. It drops `missingIds`, then applies the
  // returned-configuration one-shot if due, then writes once — an effect because
  // `setSearchParams` is a navigation.
  //
  // The "New configuration…" one-shot is consumed only once the returned config
  // actually appears in the filtered list: after the builder round trip this page
  // remounts onto the *stale cached* list first, and a freshly created configuration is
  // only in the refetched one — spending the one-shot on the stale render would drop
  // the auto-select.
  useEffect(() => {
    const match =
      !appliedReturnedConfig.current && returnedConfigId
        ? configsQuery.data?.find((config) => config.id === returnedConfigId)
        : undefined;
    if (missingIds.length === 0 && !match) return;

    let ids = readSelectedConfigIds(searchParams).filter((id) => !missingIds.includes(id));
    if (match && configsQuery.data) {
      appliedReturnedConfig.current = true;
      const deckConfigIds = configsQuery.data
        .filter((config) => config.deck_id === match.deck_id)
        .map((config) => config.id);
      ids = selectConfig(ids, deckConfigIds, match.id);
    }
    setSearchParams(withSelectedConfigIds(searchParams, ids), { replace: true });
  }, [missingIds, returnedConfigId, configsQuery.data, searchParams, setSearchParams]);

  const createMutation = useMutation({
    mutationFn: () =>
      createPracticeRun({
        name: name.trim(),
        deck_practice_config_ids: selectedIds,
      }),
    onSuccess: async (session) => {
      await queryClient.invalidateQueries({ queryKey: ['practice_runs'] });
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
          // MD-4: removed from the URL the same way the settled-list check removes it,
          // so pressing Create again proceeds with the rest.
          setTopError(MISSING_CONFIGURATION_MESSAGE);
          const goneId = error.detail.config_id;
          if (goneId) {
            setSearchParams(
              withSelectedConfigIds(
                searchParams,
                selectedIds.filter((id) => id !== goneId),
              ),
              { replace: true },
            );
          }
          queryClient.invalidateQueries({ queryKey: ['deck_practice_configs'] });
          return;
        }
        // ADR 056: emptiness is a property of the whole practice, so this names no
        // configuration and renders above the list rather than against a row.
        if (error.detail.code === 'no_cards') {
          setTopError(NO_CARDS_MESSAGE);
          return;
        }
      }
      // duplicate_deck (reachable only from a hand-edited URL, MD-8) and anything else.
      setSaveError(error.message);
    },
  });

  // Changes only its own params, so the draft's `config` ids ride along (ADR 061).
  const setFilters = (next: { subjectId: string | null; deckId: string | null }) => {
    const params = new URLSearchParams(searchParams);
    if (next.subjectId) params.set('subject', next.subjectId);
    else params.delete('subject');
    if (next.deckId) params.set('deck', next.deckId);
    else params.delete('deck');
    setSearchParams(params, { replace: true });
  };

  const changeName = (value: string) => {
    setName(value);
    const params = new URLSearchParams(searchParams);
    params.set('name', value);
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

  const removeSelection = (configId: string) =>
    setSearchParams(
      withSelectedConfigIds(
        searchParams,
        selectedIds.filter((id) => id !== configId),
      ),
      { replace: true },
    );

  // The draft rides this page's URL, so a returnTo of the full location brings it back
  // intact (ADR 061). An edit's Save hands back no result, so nothing gets auto-selected.
  const editConfiguration = (configId: string) => {
    const params = new URLSearchParams();
    params.set('returnTo', `${location.pathname}${location.search}`);
    navigate({ pathname: `/deck-configurations/${configId}/edit`, search: params.toString() });
  };

  const cancel = () => {
    const params = new URLSearchParams();
    for (const key of OVERVIEW_PARAMS) {
      const value = searchParams.get(key);
      if (value !== null) params.set(key, value);
    }
    navigate({ pathname: '/practice', search: params.toString() });
  };

  const selectedCount = selectedIds.length;
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
          onClick={cancel}
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

      <div className="mt-3 flex flex-col gap-1">
        <label htmlFor={nameInputId} className="text-sm font-medium text-(--color-text)">
          Name
        </label>
        <input
          id={nameInputId}
          type="text"
          value={name}
          onChange={(event) => changeName(event.target.value)}
          className="h-11 rounded-lg border border-(--color-surface-elevated) px-3 text-(--color-text)"
        />
        {nameMissing && (
          <p className="text-sm text-(--color-text-muted)">
            Give this practice a name to create it.
          </p>
        )}
      </div>

      <section aria-labelledby={selectedHeadingId} className="mt-3 flex flex-col gap-1">
        <h2 id={selectedHeadingId} className="text-sm font-medium text-(--color-text)">
          Selected
        </h2>
        {selectedCount === 0 ? (
          <p className="text-sm text-(--color-text-muted)">
            Select at least one configuration to practise.
          </p>
        ) : allConfigsQuery.isError ? (
          <p role="alert" className="text-sm text-(--color-danger)">
            Could not load your selected configurations.
          </p>
        ) : (
          <SelectedConfigurationList configs={selectedConfigs} onRemove={removeSelection} />
        )}
      </section>

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

      {saveError && (
        <p role="alert" className="text-sm text-(--color-danger)">
          {saveError}
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
              onClick={() => setFilters({ subjectId: null, deckId: null })}
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
          selectedIds={selectedIdSet}
          rowError={rowError}
          onToggle={(group, configId) =>
            setSearchParams(
              withSelectedConfigIds(
                searchParams,
                toggleConfig(
                  selectedIds,
                  group.configs.map((config) => config.id),
                  configId,
                ),
              ),
              { replace: true },
            )
          }
          onEdit={editConfiguration}
        />
      )}
    </div>
  );
}
