import { useState } from 'react';
import { ChevronLeft, Pencil, Play } from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { readDeck } from 'src/api/deck';
import { readSubject } from 'src/api/subject';
import { deleteDeckPracticeConfig, readDeckPracticeConfigs } from 'src/api/deck_practice_config';
import SubjectIcon from 'src/components/library/SubjectIcon';
import CardTable from 'src/components/library/CardTable';
import DeckConfigurationRow from 'src/components/library/DeckConfigurationRow';
import ConfirmDialog from 'src/components/ui/ConfirmDialog';
import AddButton from 'src/components/ui/AddButton';
import { pluralize } from 'src/lib/pluralize';
import type { components } from 'src/api/types';

type DeckPracticeConfigSummary = components['schemas']['DeckPracticeConfigSummary'];

const TABS = ['cards', 'configurations'] as const;
type Tab = (typeof TABS)[number];

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
    onError: (error: Error) => setDeleteError(error.message),
  });

  if (deckQuery.isError) {
    return (
      <div className="p-4">
        <p className="text-(--color-text-muted)">Deck not found.</p>
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
  const newConfiguration = () =>
    navigate('/deck-configurations/new', { state: { deckId: deck.id } });

  return (
    <div className="p-4">
      <div className="inline-flex items-center gap-1 text-[13px] text-(--color-text-secondary)">
        <ChevronLeft aria-hidden="true" className="h-[15px] w-[15px]" />
        <Link to="/library">Your library</Link>
        {subject && (
          <>
            <span aria-hidden="true" className="text-(--color-text-muted)">
              ›
            </span>
            <Link to={`/subjects/${subject.id}`} className="inline-flex items-center gap-1">
              <SubjectIcon icon={subject.icon} className="h-[15px] w-[15px]" />
              {subject.name}
            </Link>
          </>
        )}
      </div>

      <h1 className="mt-1 text-[22px] font-medium text-(--color-text)">{deck.name}</h1>
      <p className="text-[13px] text-(--color-text-muted)">
        {pluralize(deck.cards.length, 'card')} · {pluralize(fieldDefs.length, 'field')}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          // Both params, not just the deck: two decks in different subjects can share a
          // name, so the subject is what makes the filtered list unambiguous on arrival.
          onClick={() => navigate(`/practice?subject=${deck.subject_id}&deck=${deck.id}`)}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-(--color-primary) text-sm font-semibold text-(--color-primary-contrast)"
        >
          <Play aria-hidden="true" className="h-4 w-4" />
          Practice
        </button>
        <button
          type="button"
          aria-label="Edit deck"
          onClick={() => navigate(`/decks/${deck.id}/edit`)}
          className="flex h-11 w-11 shrink-0 items-center justify-center"
        >
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-(--color-text-muted)">
            <Pencil aria-hidden="true" className="h-4 w-4 text-(--color-text)" />
          </span>
        </button>
      </div>

      {/* This deck's two contents, in the same tab grammar the library uses for subjects
          and decks — a configuration belongs to this deck exactly as its cards do. */}
      <div
        role="tablist"
        aria-label="Deck contents"
        className="mt-4 flex gap-4 border-b border-(--color-surface-elevated)"
      >
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`h-11 border-b-2 px-1 text-sm font-medium ${
              tab === t
                ? 'border-(--color-primary) text-(--color-text)'
                : 'border-transparent text-(--color-text-muted)'
            }`}
          >
            {t === 'cards' ? 'Cards' : 'Configurations'}
          </button>
        ))}
      </div>

      {tab === 'cards' ? (
        /* The table (and its header row) renders whenever the deck has any active
           fields, regardless of card count — a zero-card deck still has a schema, and
           that's exactly what an empty deck has to show. The empty state is a sibling
           below it, outside CardTable's own horizontally-scrolling wrapper, so it
           stays put under the frozen first column instead of scrolling away with the
           header (2.5 §1.4). */
        <div className="mt-2">
          {/* Inside the tab, and labeled: a control whose meaning depends on which tab
              is open has no business sitting in the page header. */}
          <div className="flex justify-end py-2">
            <AddButton label="Add card" onClick={addCard} />
          </div>
          {fieldDefs.length > 0 && (
            <CardTable
              deckName={deck.name}
              fieldDefs={fieldDefs}
              cards={deck.cards}
              cardHref={(cardId) => `/cards/${cardId}/edit`}
            />
          )}
          {deck.cards.length === 0 && (
            <div className="flex flex-col items-start gap-3 px-3 py-8">
              <p className="text-(--color-text-muted)">No cards in this deck yet.</p>
              <AddButton label="Add card" onClick={addCard} />
            </div>
          )}
        </div>
      ) : (
        <section aria-label="Configurations" className="mt-2">
          <div className="flex justify-end py-2">
            <AddButton label="New configuration" onClick={newConfiguration} />
          </div>

          {configurationsQuery.isError && (
            <p role="alert" className="mt-2 text-sm text-(--color-danger)">
              Could not load this deck&apos;s configurations.
            </p>
          )}

          {configurationsQuery.data && configurations.length === 0 ? (
            <div className="flex flex-col items-start gap-3 py-8">
              <p className="text-(--color-text-muted)">
                No configurations yet. One says which of this deck&apos;s fields are prompts and
                which are answers; a practice is built out of them.
              </p>
              <AddButton label="New configuration" onClick={newConfiguration} />
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-(--color-surface-elevated)">
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

          {deleteError && (
            <p role="alert" className="mt-2 text-sm text-(--color-danger)">
              {deleteError}
            </p>
          )}
        </section>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this configuration?"
        // A practice copied what it needed the moment it started (ADR 013), so nothing
        // that has already run is affected.
        description="Practices that already used it are unaffected."
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
