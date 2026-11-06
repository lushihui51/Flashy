import { useId, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { createCard, deleteCard, readCard, updateCard } from 'src/api/card';
import { readDeck, readDecks } from 'src/api/deck';
import DeckPicker from 'src/components/library/DeckPicker';
import CardFieldsForm from 'src/components/library/CardFieldsForm';
import ConfirmDialog from 'src/components/ui/ConfirmDialog';
import FormBar from 'src/components/ui/FormBar';
import type { components } from 'src/api/types';
import { isNotFound } from 'src/api/unwrap';
import { failureSentence } from 'src/lib/failureSentence';
import { usePageTitle } from 'src/lib/pageTitle';
import { internalReturnTo, returnAddressParams } from 'src/lib/returnTo';
import { useViewParams } from 'src/lib/viewParams';

type CardStandaloneFormProps = {
  mode: 'create' | 'edit';
};

type LocationState = { deckId?: string } | null;

/** Standalone card create/edit — its own routes (`/cards/new`, `/cards/:cardId/edit`),
 * real API calls, real navigation, a routed page like SubjectForm. */
export default function CardStandaloneForm({ mode }: CardStandaloneFormProps) {
  const { cardId } = useParams<{ cardId: string }>();
  const location = useLocation();
  const { params } = useViewParams();

  const cardQuery = useQuery({
    queryKey: ['card', cardId],
    queryFn: () => readCard(cardId!),
    enabled: mode === 'edit' && !!cardId,
  });
  usePageTitle(mode === 'create' ? 'New card' : cardQuery.data ? 'Edit card' : undefined);

  if (mode === 'edit') {
    if (cardQuery.isError) {
      return (
        <div className="p-4">
          {isNotFound(cardQuery.error) ? (
            <p className="text-(--color-aside)">Card not found.</p>
          ) : (
            <p role="alert" className="text-sm text-(--color-wrong)">
              Could not load this card.
            </p>
          )}
        </div>
      );
    }
    if (!cardQuery.data) return null;
  }

  // Same `state.deckId` shape for two different entry points: a contextual "New card"
  // from a deck's own page, and returning from the deck editor's "New deck…"
  // round-trip. Both preselect the deck combobox — neither locks the picker (only card
  // **edit** mode does, below).
  const initialDeckId =
    mode === 'edit' ? cardQuery.data!.deck_id : ((location.state as LocationState)?.deckId ?? null);

  return (
    <CardStandaloneFormBody
      mode={mode}
      cardId={cardId}
      original={mode === 'edit' ? cardQuery.data : undefined}
      initialDeckId={initialDeckId}
      cancelTo={internalReturnTo(params, 'cancelTo')}
      returnTo={internalReturnTo(params, 'returnTo')}
    />
  );
}

type CardStandaloneFormBodyProps = {
  mode: 'create' | 'edit';
  cardId: string | undefined;
  original: components['schemas']['CardRead'] | undefined;
  initialDeckId: string | null;
  cancelTo: string | null;
  returnTo: string | null;
};

function CardStandaloneFormBody({
  mode,
  cardId,
  original,
  initialDeckId,
  cancelTo,
  returnTo,
}: CardStandaloneFormBodyProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const formId = useId();
  const { reveal } = useViewParams();
  const deckInputRef = useRef<HTMLInputElement>(null);
  const deckErrorRef = useRef<HTMLSpanElement>(null);

  const [deckId, setDeckId] = useState(initialDeckId);
  const [deckError, setDeckError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>(original?.values ?? {});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deckChange, setDeckChange] = useState<{ previousDeckId: string | null } | null>(null);
  const [confirmCreateDeckOpen, setConfirmCreateDeckOpen] = useState(false);

  const deckQuery = useQuery({
    queryKey: ['deck', deckId],
    queryFn: () => readDeck(deckId!),
    enabled: !!deckId,
  });
  // The combobox's own options. Fetched here rather than inside the picker, because a
  // shared component takes its data as props (AGENTS.md).
  const decksQuery = useQuery({ queryKey: ['decks'], queryFn: () => readDecks() });

  // Derived from `deckId` rather than kept as its own state: reverting `deckId` after a
  // cancelled "Change deck?" confirm then redisplays the previous deck by itself, with no
  // remount needed to tell the combobox its selection moved back. Falls back to the
  // single-deck fetch for the initial preselection, which lands before the list does. That
  // read carries no subject's name; a chosen deck shows only its own name, so none is missed.
  const selectedDeck =
    decksQuery.data?.find((deck) => deck.id === deckId) ??
    (deckQuery.data ? { id: deckQuery.data.id, name: deckQuery.data.name, subject_name: '' } : null);

  // A card can't move between decks once it exists, so editing one shows its deck as a
  // fixed value. A contextual "New card" and the deck-editor round-trip both just
  // preselect the combobox, still fully editable.
  const deckLocked = mode === 'edit';

  // Gate on the preselected deck's own fetch landing, so the combobox shows the real
  // deck name on its first render rather than an empty box that fills in a beat later.
  // Doesn't apply once the user has picked something themselves (`deckId` differs from
  // `initialDeckId`) — only the initial preselection needs this wait.
  if (deckId === initialDeckId && initialDeckId && !deckQuery.data) return null;

  const dirty =
    mode === 'create'
      ? Object.values(values).some((v) => v.trim() !== '')
      : !!original && Object.entries(values).some(([k, v]) => v !== (original.values[k] ?? ''));

  const canSubmit = deckId !== null && !!deckQuery.data && !submitting;

  const leaveByCancel = () => navigate(cancelTo ?? (deckId ? `/decks/${deckId}` : '/library'));

  const handleCancel = () => {
    if (dirty) {
      setConfirmCancelOpen(true);
      return;
    }
    leaveByCancel();
  };

  const handleDeckChange = (newDeckId: string) => {
    setDeckError(null);
    const hasTypedValues = Object.values(values).some((v) => v.trim() !== '');
    if (deckId && newDeckId !== deckId && hasTypedValues) {
      setDeckChange({ previousDeckId: deckId });
      setDeckId(newDeckId);
      return;
    }
    setDeckId(newDeckId);
    setValues({});
  };

  const goToCreateDeck = () => {
    const params = returnAddressParams(location, 'cancelTo', 'returnTo');
    navigate({ pathname: '/decks/new', search: params.toString() });
  };

  const handleCreateNewDeck = () => {
    const hasTypedValues = Object.values(values).some((v) => v.trim() !== '');
    if (hasTypedValues) {
      setConfirmCreateDeckOpen(true);
      return;
    }
    goToCreateDeck();
  };

  const invalidateAfterWrite = async (writtenDeckId: string, subjectId: string | undefined) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['deck', writtenDeckId] }),
      queryClient.invalidateQueries({ queryKey: ['decks'] }),
      ...(subjectId ? [queryClient.invalidateQueries({ queryKey: ['decks', subjectId] })] : []),
    ]);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!deckId) {
      setDeckError('Choose a deck to create a card.');
      reveal({ control: () => deckInputRef.current, listStart: () => deckErrorRef.current });
    }
    if (!deckId || !deckQuery.data) return;
    setFormError(null);
    setSubmitting(true);
    try {
      if (mode === 'create') {
        await createCard({ deck_id: deckId, values });
      } else if (original) {
        const changed: Record<string, string> = {};
        for (const [key, value] of Object.entries(values)) {
          if (value !== (original.values[key] ?? '')) changed[key] = value;
        }
        if (Object.keys(changed).length > 0) {
          await updateCard(cardId!, { values: changed });
        }
      }
      await invalidateAfterWrite(deckId, deckQuery.data.subject_id);
      navigate(returnTo ?? `/decks/${deckId}`);
    } catch (err) {
      setFormError(failureSentence(err, 'Card not found.'));
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deckId) return;
    setSubmitting(true);
    try {
      await deleteCard(cardId!);
      await invalidateAfterWrite(deckId, deckQuery.data?.subject_id);
      navigate(`/decks/${deckId}`);
    } catch (err) {
      setFormError(failureSentence(err, 'Card not found.'));
      setSubmitting(false);
      setConfirmDeleteOpen(false);
    }
  };

  const fieldDefs = (deckQuery.data?.field_defs ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((f) => ({ key: f.id, name: f.name, type: f.type }));

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-page leading-[1.05] font-bold tracking-[-0.02em] text-(--color-ink)">
        {mode === 'create' ? 'New card' : 'Edit card'}
      </h1>

      <form id={formId} onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        {deckLocked ? (
          <div className="flex items-baseline gap-2.5">
            <span className="text-label text-(--color-aside)">Deck</span>
            <span className="text-body font-semibold text-(--color-ink)">
              {selectedDeck?.name ?? ''}
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <DeckPicker
              items={decksQuery.data ?? []}
              selected={selectedDeck}
              onSelect={(item) => handleDeckChange(item.id)}
              // No inline create (creating a card never creates a deck) — a deck editor is too
              // heavy to nest in a dialog, so this always means leaving the page, and only this
              // form knows whether there are typed values to confirm away first.
              onSelectCreate={handleCreateNewDeck}
              createLabel="New deck…"
              placeholder="Deck"
              inputRef={deckInputRef}
            />
            {deckError && (
              <span ref={deckErrorRef} role="alert" className="text-sm text-(--color-wrong)">
                {deckError}
              </span>
            )}
          </div>
        )}

        {deckId && deckQuery.data && (
          <CardFieldsForm
            fieldDefs={fieldDefs}
            values={values}
            onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
          />
        )}
      </form>

      {mode === 'edit' && (
        <button
          type="button"
          onClick={() => setConfirmDeleteOpen(true)}
          className="tappable flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-(--color-surface) text-base font-semibold text-(--color-ink) disabled:border-(--color-line) disabled:text-(--color-aside) disabled:[box-shadow:none]"
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
          Delete card
        </button>
      )}

      <FormBar sentence={formError}>
        <button type="button" onClick={handleCancel} className="tappable shrink-0 h-action rounded-2xl bg-(--color-surface) px-4.5 text-action font-semibold text-(--color-ink)">
          Cancel
        </button>
        <button
          type="submit"
          form={formId}
          disabled={submitting}
          aria-disabled={!canSubmit || undefined}
          className="tappable flex-1 h-action rounded-2xl bg-(--color-main-action) px-4.5 text-action font-semibold text-(--color-ink) disabled:border-(--color-line) disabled:bg-(--color-surface) disabled:text-(--color-aside) disabled:[box-shadow:none] aria-disabled:border-(--color-line) aria-disabled:bg-(--color-surface) aria-disabled:text-(--color-aside) aria-disabled:[box-shadow:none]"
        >
          {mode === 'create' ? 'Create' : 'Save'}
        </button>
      </FormBar>

      <ConfirmDialog
        open={confirmCancelOpen}
        title="Discard this card?"
        description="You have unsaved changes. Leaving now will discard them."
        confirmLabel="Discard"
        onConfirm={leaveByCancel}
        onCancel={() => setConfirmCancelOpen(false)}
      />

      <ConfirmDialog
        open={deckChange !== null}
        title="Change deck?"
        description="Switching decks will clear the card you were filling in."
        confirmLabel="Continue"
        onConfirm={() => {
          setValues({});
          setDeckChange(null);
        }}
        onCancel={() => {
          if (deckChange) setDeckId(deckChange.previousDeckId);
          setDeckChange(null);
        }}
      />

      <ConfirmDialog
        open={confirmCreateDeckOpen}
        title="Create a new deck?"
        description="This will clear the card you were filling in."
        confirmLabel="Continue"
        onConfirm={() => {
          setValues({});
          goToCreateDeck();
        }}
        onCancel={() => setConfirmCreateDeckOpen(false)}
      />

      {mode === 'edit' && (
        <ConfirmDialog
          open={confirmDeleteOpen}
          title="Delete card?"
          description="This can't be undone."
          confirmLabel="Delete"
          onConfirm={() => void handleDelete()}
          onCancel={() => setConfirmDeleteOpen(false)}
        />
      )}
    </div>
  );
}
