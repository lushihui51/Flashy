import { useState } from 'react';
import { Pencil, Play } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { readDeck } from 'src/api/deck';
import { readSubject } from 'src/api/subject';
import { deleteDeckPracticeConfig, readDeckPracticeConfigs } from 'src/api/deck_practice_config';
import SubjectIcon from 'src/components/library/SubjectIcon';
import CardList from 'src/components/library/CardList';
import DeckConfigurationRow from 'src/components/library/DeckConfigurationRow';
import ConfirmDialog from 'src/components/ui/ConfirmDialog';
import AddButton from 'src/components/ui/AddButton';
import Breadcrumb from 'src/components/ui/Breadcrumb';
import Tabs from 'src/components/ui/Tabs';
import { pluralize } from 'src/lib/pluralize';
import { usePageTitle } from 'src/lib/pageTitle';
import { failureSentence } from 'src/lib/failureSentence';
import type { components } from 'src/api/types';
import { isNotFound } from 'src/api/unwrap';

type DeckPracticeConfigSummary = components['schemas']['DeckPracticeConfigSummary'];

const TABS = ['cards', 'configurations'] as const;
type Tab = (typeof TABS)[number];

const TAB_ITEMS: { value: Tab; label: string }[] = [
  { value: 'cards', label: 'Cards' },
  { value: 'configurations', label: 'Configurations' },
];

function isTab(value: string | null): value is Tab {
  return value !== null && (TABS as readonly string[]).includes(value);
}

export default function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // In the URL rather than component state: the configuration builder navigates away and
  // back, and landing on the deck's *cards* after saving one would lose the thread.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: Tab = isTab(searchParams.get('tab')) ? (searchParams.get('tab') as Tab) : 'cards';

  const [pendingDelete, setPendingDelete] = useState<DeckPracticeConfigSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deckQuery = useQuery({
    queryKey: ['deck', deckId],
    queryFn: () => readDeck(deckId!),
    enabled: !!deckId,
  });
  const deck = deckQuery.data;
  usePageTitle(deck?.name);

  const subjectQuery = useQuery({
    queryKey: ['subject', deck?.subject_id],
    queryFn: () => readSubject(deck!.subject_id),
    enabled: !!deck,
  });

  // Scoped to this deck, because a configuration belongs to exactly one: this is the
  // whole list there is to show here.
  const configurationsQuery = useQuery({
    queryKey: ['deck_practice_configs', null, deckId],
    queryFn: () => readDeckPracticeConfigs({ deckId: deckId! }),
    enabled: !!deckId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDeckPracticeConfig(id),
    onSuccess: async () => {
      setPendingDelete(null);
      setDeleteError(null);
      await queryClient.invalidateQueries({ queryKey: ['deck_practice_configs'] });
    },
    onError: (error) => setDeleteError(failureSentence(error, 'Deck configuration not found.')),
  });

  if (deckQuery.isError) {
    return (
      <div className="p-4">
        {isNotFound(deckQuery.error) ? (
          <p className="text-(--color-aside)">Deck not found.</p>
        ) : (
          <p role="alert" className="text-sm text-(--color-wrong)">
            Could not load this deck.
          </p>
        )}
      </div>
    );
  }

  if (!deck) return null;

  const fieldDefs = [...deck.field_defs].sort((a, b) => a.position - b.position);
  const subject = subjectQuery.data;
  const configurations = configurationsQuery.data ?? [];

  const setTab = (next: Tab) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'cards') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  // Both carry the deck in router state — the same deck-context wiring the card form
  // and the configuration builder already read on arrival.
  const addCard = () => navigate('/cards/new', { state: { deckId: deck.id } });
  const addConfiguration = () =>
    navigate('/deck-configurations/new', { state: { deckId: deck.id } });

  return (
    <div className="p-4">
      <Breadcrumb
        places={[
          { label: 'Your library', to: '/library' },
          ...(subject
            ? [
                {
                  label: subject.name,
                  to: `/subjects/${subject.id}`,
                  icon: <SubjectIcon icon={subject.icon} className="h-[15px] w-[15px]" />,
                },
              ]
            : []),
        ]}
      />

      <div className="mt-3.5 flex items-center gap-2.5">
        <h1 className="min-w-0 flex-1 break-words text-[30px] leading-[1.05] font-bold tracking-[-0.02em] text-(--color-ink)">
          {deck.name}
        </h1>
        <button
          type="button"
          // Both params, not just the deck: two decks in different subjects can share a
          // name, so the subject is what makes the filtered list unambiguous on arrival.
          onClick={() => navigate(`/practice?subject=${deck.subject_id}&deck=${deck.id}`)}
          className="tappable flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-(--color-main-action) px-3.5 text-[17px] font-semibold text-(--color-ink)"
        >
          <Play aria-hidden="true" fill="currentColor" className="h-3.5 w-3.5" />
          Practice
        </button>
        <button
          type="button"
          aria-label="Edit deck"
          onClick={() => navigate(`/decks/${deck.id}/edit`)}
          className="tappable flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-(--color-surface)"
        >
          <Pencil aria-hidden="true" className="h-[18px] w-[18px] text-(--color-ink)" />
        </button>
      </div>

      {/* This deck's two contents, in the same tab grammar the library uses for subjects
          and decks — a configuration belongs to this deck exactly as its cards do. */}
      <div className="mt-3.5">
        <Tabs ariaLabel="Deck contents" items={TAB_ITEMS} value={tab} onChange={setTab} />
      </div>

      {tab === 'cards' ? (
        <div className="mt-3.5">
          {/* Inside the tab, and labeled: a control whose meaning depends on which tab
              is open has no business sitting in the page header. */}
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-medium text-(--color-aside)">
              {pluralize(deck.cards.length, 'card')} · {pluralize(fieldDefs.length, 'field')}
            </h2>
            <AddButton label="Add card" onClick={addCard} />
          </div>
          {fieldDefs.length > 0 && deck.cards.length > 0 && (
            <div className="mt-3.5">
              <CardList
                deckName={deck.name}
                fieldDefs={fieldDefs}
                cards={deck.cards}
                cardHref={(cardId) => `/cards/${cardId}/edit`}
              />
            </div>
          )}
          {deck.cards.length === 0 && (
            <div className="py-8">
              <p className="text-[15px] text-(--color-aside)">No cards in this deck yet.</p>
            </div>
          )}
        </div>
      ) : (
        <section aria-label="Configurations" className="mt-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-medium text-(--color-aside)">
              {configurationsQuery.data
                ? pluralize(configurations.length, 'configuration')
                : 'Configurations'}
            </h2>
            <AddButton label="Add configuration" onClick={addConfiguration} />
          </div>

          {configurationsQuery.isError && (
            <p role="alert" className="mt-2 text-sm text-(--color-wrong)">
              Could not load configurations.
            </p>
          )}

          {configurationsQuery.data && configurations.length === 0 && (
            <div className="py-8">
              <p className="text-[15px] text-(--color-aside)">No configurations yet.</p>
            </div>
          )}
          {configurations.length > 0 && (
            <ul className="tappable mt-3.5 flex flex-col divide-y divide-(--color-line) rounded-[20px] bg-(--color-surface)">
              {configurations.map((configuration) => (
                <li key={configuration.id}>
                  <DeckConfigurationRow
                    configuration={configuration}
                    onDelete={() => setPendingDelete(configuration)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this configuration?"
        // A practice copied what it needed the moment it started, so nothing that has
        // already run is affected.
        description="Practices that already used it are unaffected."
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
        {/* In the dialog, since the scrim covers the page while it stays open. */}
        {deleteError && (
          <p role="alert" className="mt-2 text-sm text-(--color-wrong)">
            {deleteError}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
