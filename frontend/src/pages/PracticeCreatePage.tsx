import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { readDecks } from 'src/api/deck';
import { readDeckPracticeConfigs } from 'src/api/deck_practice_config';
import { createPracticeRun } from 'src/api/practice_run';
import { ApiDetailError } from 'src/api/unwrap';
import PracticeFilterBar from 'src/components/practice/PracticeFilterBar';
import ConfigurationPickList from 'src/components/practice/ConfigurationPickList';
import SelectedConfigurationList from 'src/components/practice/SelectedConfigurationList';
import AddButton from 'src/components/ui/AddButton';
import FormBar from 'src/components/ui/FormBar';
import FormPart from 'src/components/ui/FormPart';
import SubmitButton from 'src/components/ui/SubmitButton';
import { formatDateTime } from 'src/lib/datetime';
import { failureSentence } from 'src/lib/failureSentence';
import { usePageTitle } from 'src/lib/pageTitle';
import { MISSING_CONFIGURATION_MESSAGE } from 'src/lib/practiceCopy';
import { returnAddressParams } from 'src/lib/returnTo';
import { groupConfigurationsByDeck } from 'src/lib/practiceConfigurationGroups';
import {
  readSelectedConfigIds,
  selectConfig,
  toggleConfig,
  withSelectedConfigIds,
} from 'src/lib/practiceSelection';
import { useViewParams } from 'src/lib/viewParams';

type RowError = { configId: string; sentence: string };

/** The overview's own params — the only ones Cancel hands back, so the draft never
 * leaves this page. */
const OVERVIEW_PARAMS = ['deck', 'status'] as const;

/**
 * `/practice/new`: name, filter, tick at most one configuration per deck, create. The
 * draft rides the URL — repeated `config` params and a `name` param — so it survives
 * every round trip, a refresh, and back. Create *is* start — a successful post lands
 * straight on the new session's own page.
 */
export default function PracticeCreatePage() {
  usePageTitle('New practice');
  const { params, setParams, changeView } = useViewParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const nameInputId = useId();
  const selectedHeadingId = useId();

  const filtersRef = useRef<HTMLDivElement>(null);
  // The pick list, its empty sentence or its failure sentence: whichever shows for the
  // current filters, so a reveal after a filter change finds where the list starts, and
  // nothing while the old list stands in for the new one.
  const pickListRef = useRef<HTMLDivElement>(null);
  const emptyRef = useRef<HTMLDivElement>(null);
  const failureRef = useRef<HTMLDivElement>(null);

  const deckId = params.get('deck');
  const selectedIds = readSelectedConfigIds(params);
  const selectedIdSet = new Set(selectedIds);

  // Read from the URL once, at mount: the `name` param is absent until the first edit,
  // so a fresh page is prefilled with the moment it opened (`formatDateTime`, the same
  // call Re-run on the details page uses to name the new run), while a round trip or
  // refresh comes back to whatever was typed, empty included. The input stays bound to
  // this local buffer, which mirrors each change to the URL; binding it to the URL
  // would route every keystroke through a navigation.
  const [name, setName] = useState(() => params.get('name') ?? formatDateTime(new Date()));
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

  const decksQuery = useQuery({ queryKey: ['decks'], queryFn: () => readDecks() });
  const configsQuery = useQuery({
    queryKey: ['deck_practice_configs', deckId],
    queryFn: () => readDeckPracticeConfigs({ deckId: deckId ?? undefined }),
    // An empty list while a filter's new one loads would shrink the page and lose the
    // user's place on it.
    placeholderData: keepPreviousData,
  });

  // Every configuration, unfiltered: the Selected section resolves ids against this,
  // since the filtered list lacks any selection a filter hides. The same key the
  // filtered query uses with no filter set, so an unfiltered page makes one request.
  const allConfigsQuery = useQuery({
    queryKey: ['deck_practice_configs', null],
    queryFn: () => readDeckPracticeConfigs(),
  });

  const groups = groupConfigurationsByDeck(configsQuery.data ?? []);
  // Filtering keeps the backend's order, decks by their most recent change, then
  // configurations by theirs.
  const selectedConfigs = (allConfigsQuery.data ?? []).filter((config) =>
    selectedIdSet.has(config.id),
  );

  // Selected ids the list of all configurations shows gone. Judged only on settled
  // data: after a round trip this page remounts onto the cached list while the
  // invalidated refetch runs, and a configuration created on that trip is only in the
  // refetched one — judging the cached list would remove it.
  // Memoised so the effect below re-runs only when the URL or the settled list changes.
  const settledConfigs = allConfigsQuery.isFetching ? undefined : allConfigsQuery.data;
  const missingIds = useMemo(() => {
    if (!settledConfigs) return [];
    const knownIds = new Set(settledConfigs.map((config) => config.id));
    return readSelectedConfigIds(params).filter((id) => !knownIds.has(id));
  }, [settledConfigs, params]);

  // Adjusting state during render, as DeckConfigurationEditor does once a deck's
  // fields land, so no setState runs in the effect below. Stays until the next Create
  // press clears it, as every topError does.
  if (missingIds.length > 0 && topError !== MISSING_CONFIGURATION_MESSAGE) {
    setTopError(MISSING_CONFIGURATION_MESSAGE);
  }

  // The one effect that writes the URL in reaction to fetched data: two
  // `setParams` calls after one render both start from that render's params, and
  // the second would overwrite the first. It drops `missingIds`, then applies the
  // returned-configuration one-shot if due, then writes once — an effect because
  // `setParams` is a navigation.
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

    let ids = readSelectedConfigIds(params).filter((id) => !missingIds.includes(id));
    if (match && configsQuery.data) {
      appliedReturnedConfig.current = true;
      const deckConfigIds = configsQuery.data
        .filter((config) => config.deck_id === match.deck_id)
        .map((config) => config.id);
      ids = selectConfig(ids, deckConfigIds, match.id);
    }
    setParams(withSelectedConfigIds(params, ids));
  }, [missingIds, returnedConfigId, configsQuery.data, params, setParams]);

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
    // The code decides only where the sentence renders: against the offending row for
    // `stale_config`, in the bar for everything else.
    onError: (error: Error) => {
      const sentence = failureSentence(error, 'Deck configuration not found.');
      if (error instanceof ApiDetailError) {
        if (error.detail.code === 'stale_config' && error.detail.config_id) {
          setRowError({ configId: error.detail.config_id, sentence });
          return;
        }
        if (error.detail.code === 'config_not_found') {
          // Removed from the URL the same way the settled-list check removes it, so
          // pressing Create again proceeds with the rest; the same state as that check,
          // so the two never show the sentence twice.
          setTopError(sentence);
          const goneId = error.detail.config_id;
          if (goneId) {
            setParams(
              withSelectedConfigIds(
                params,
                selectedIds.filter((id) => id !== goneId),
              ),
            );
          }
          queryClient.invalidateQueries({ queryKey: ['deck_practice_configs'] });
          return;
        }
      }
      setSaveError(sentence);
    },
  });

  // Changes only its own params, so the draft's `config` ids ride along.
  const setFilters = (next: { deckId: string | null }) => {
    const nextParams = new URLSearchParams(params);
    if (next.deckId) nextParams.set('deck', next.deckId);
    else nextParams.delete('deck');
    changeView(nextParams, {
      control: () => filtersRef.current?.firstElementChild ?? null,
      listStart: () =>
        pickListRef.current?.firstElementChild ?? emptyRef.current ?? failureRef.current,
    });
  };

  const changeName = (value: string) => {
    setName(value);
    const nextParams = new URLSearchParams(params);
    nextParams.set('name', value);
    setParams(nextParams);
  };

  const newConfiguration = () => {
    // Both addresses ride the URL, not router state: they have to survive a further forward
    // if the builder itself opens "New deck…" before coming back here.
    const builderParams = returnAddressParams(location, 'cancelTo', 'returnTo');
    if (deckId) builderParams.set('deck', deckId);
    navigate({ pathname: '/deck-configurations/new', search: builderParams.toString() });
  };

  const removeSelection = (configId: string) =>
    setParams(
      withSelectedConfigIds(
        params,
        selectedIds.filter((id) => id !== configId),
      ),
    );

  // The draft rides this page's URL, so addresses of the full location bring it back intact
  // after Cancel and after Save. An edit's Save hands back no result, so nothing gets
  // auto-selected.
  const editConfiguration = (configId: string) => {
    const builderParams = returnAddressParams(location, 'cancelTo', 'returnTo');
    navigate({
      pathname: `/deck-configurations/${configId}/edit`,
      search: builderParams.toString(),
    });
  };

  const cancel = () => {
    const overviewParams = new URLSearchParams();
    for (const key of OVERVIEW_PARAMS) {
      const value = params.get(key);
      if (value !== null) overviewParams.set(key, value);
    }
    navigate({ pathname: '/practice', search: overviewParams.toString() });
  };

  const selectedCount = selectedIds.length;
  const nothingSelected = selectedCount === 0;
  const nameMissing = name.trim() === '';
  const filtered = deckId !== null;

  const submit = () => {
    setRowError(null);
    setTopError(null);
    setSaveError(null);
    createMutation.mutate();
  };

  return (
    <div className="p-4">
      <h1 className="text-page leading-[1.05] font-bold tracking-[-0.02em] text-(--color-ink)">
        New practice
      </h1>

      <FormPart
        sentence={nameMissing ? 'Give this practice a name to create it.' : null}
        look="aside"
        className="mt-4 flex flex-col gap-1.5"
      >
        <label htmlFor={nameInputId} className="text-label text-(--color-aside)">
          Name
        </label>
        <input
          id={nameInputId}
          type="text"
          value={name}
          onChange={(event) => changeName(event.target.value)}
          className="h-field rounded-field outlined-line bg-(--color-surface) px-3.5 text-base text-(--color-ink)"
        />
      </FormPart>

      <div ref={filtersRef} className="mt-3">
        <PracticeFilterBar
          decks={decksQuery.data ?? []}
          deckId={deckId}
          onChange={setFilters}
        />
      </div>

      <div className="flex justify-end py-2">
        <AddButton label="New configuration…" onClick={newConfiguration} />
      </div>

      {configsQuery.isError && (
        <div ref={failureRef}>
          <FormPart sentence="Could not load configurations." look="wrong">
            {null}
          </FormPart>
        </div>
      )}

      {configsQuery.data && groups.length === 0 ? (
        <div
          ref={configsQuery.isPlaceholderData ? undefined : emptyRef}
          className="flex flex-col items-start gap-3 py-8"
        >
          <p className="text-body text-(--color-aside)">
            {filtered ? 'No configurations match these filters.' : 'No configurations yet.'}
          </p>
          {/* No New configuration… button here — the toolbar's is always on screen. */}
          {filtered && (
            <button
              type="button"
              onClick={() => setFilters({ deckId: null })}
              className="tappable-sm h-10 rounded-full bg-(--color-surface) px-3.5 text-body font-semibold text-(--color-ink)"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div ref={configsQuery.data && !configsQuery.isPlaceholderData ? pickListRef : undefined}>
          <ConfigurationPickList
            groups={groups}
            selectedIds={selectedIdSet}
            rowError={rowError}
            onToggle={(group, configId) =>
              setParams(
                withSelectedConfigIds(
                  params,
                  toggleConfig(
                    selectedIds,
                    group.configs.map((config) => config.id),
                    configId,
                  ),
                ),
              )
            }
            onEdit={editConfiguration}
          />
        </div>
      )}

      <section aria-labelledby={selectedHeadingId} className="mt-3">
        <FormPart
          sentence={
            nothingSelected
              ? 'Select at least one configuration to practice.'
              : allConfigsQuery.isError
                ? 'Could not load your selected configurations.'
                : null
          }
          look={nothingSelected ? 'aside' : 'wrong'}
          // This sentence reads at body size, larger than a form's other sentences.
          className={
            nothingSelected
              ? 'flex flex-col gap-1.5 [&>[data-reveal-sentence]]:text-body [&>[data-reveal-sentence]]:[line-height:inherit]'
              : 'flex flex-col gap-1.5'
          }
        >
          <h2 id={selectedHeadingId} className="text-label text-(--color-aside)">
            Selected
          </h2>
          {/* Nothing to hold until the selected ids resolve, and an empty block would draw a
              bare outline. */}
          {!allConfigsQuery.isError && selectedConfigs.length > 0 && (
            <SelectedConfigurationList configs={selectedConfigs} onRemove={removeSelection} />
          )}
        </FormPart>
      </section>

      <FormBar
        sentence={saveError ?? topError}
        count={selectedCount > 0 ? `${selectedCount} selected` : null}
      >
        <button
          type="button"
          onClick={cancel}
          className="tappable shrink-0 h-action rounded-2xl bg-(--color-surface) px-4.5 text-action font-semibold text-(--color-ink)"
        >
          Cancel
        </button>
        <SubmitButton
          ready={selectedCount > 0 && !nameMissing}
          busy={createMutation.isPending}
          onPress={submit}
        >
          Create
        </SubmitButton>
      </FormBar>
    </div>
  );
}
