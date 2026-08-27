import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createCard, deleteCard, readCard, updateCard } from 'src/api/card';
import { readDeck, readDecks } from 'src/api/deck';
import PickerCombobox from 'src/components/ui/PickerCombobox';
import CardFieldsForm from 'src/components/library/CardFieldsForm';
import ConfirmDialog from 'src/components/ui/ConfirmDialog';
import type { components } from 'src/api/types';

type CardStandaloneFormProps = {
  mode: 'create' | 'edit';
};

type LocationState = { deckId?: string } | null;

/** CardForm's standalone modes (§4.6) — its own routes (`/cards/new`,
 * `/cards/:cardId/edit`), real API calls, real navigation. A sibling to `CardForm.tsx`
 * (the in-editor role used inside DeckEditor), not a variant of it: that one is a
 * Radix Dialog controlled entirely by props with no network calls of its own, while
 * this one is a routed page like SubjectForm — different enough responsibilities
 * that sharing one component would mean branching most of its body on which world
 * it's in. They already share the one piece that's actually identical:
 * CardFieldsForm. */
export default function CardStandaloneForm({ mode }: CardStandaloneFormProps) {
  const { cardId } = useParams<{ cardId: string }>();
  const location = useLocation();

  const cardQuery = useQuery({
    queryKey: ['card', cardId],
    queryFn: () => readCard(cardId!),
    enabled: mode === 'edit' && !!cardId,
  });

  if (mode === 'edit') {
    if (cardQuery.isError) {
      return (
        <div className="p-4">
          <p className="text-(--color-text-muted)">Card not found.</p>
        </div>
      );
    }
    if (!cardQuery.data) return null;
  }

  // Same `state.deckId` shape for two different entry points (Phase 5.5 §4/§5): a
  // contextual "New card" from a deck's own page, and returning from the deck
  // editor's "New deck…" round-trip. Both preselect the deck combobox
  // now — neither locks the picker (only card **edit** mode does, below).
  const initialDeckId =
    mode === 'edit' ? cardQuery.data!.deck_id : ((location.state as LocationState)?.deckId ?? null);

  return (
    <CardStandaloneFormBody
      mode={mode}
      cardId={cardId}
      original={mode === 'edit' ? cardQuery.data : undefined}
      initialDeckId={initialDeckId}
    />
  );
}

type CardStandaloneFormBodyProps = {
  mode: 'create' | 'edit';
  cardId: string | undefined;
  original: components['schemas']['CardRead'] | undefined;
  initialDeckId: string | null;
};

function CardStandaloneFormBody({
  mode,
  cardId,
  original,
  initialDeckId,
}: CardStandaloneFormBodyProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [deckId, setDeckId] = useState(initialDeckId);
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
  // The combobox's own options. Fetched here rather than inside a picker component,
  // because a shared component takes its data as props (AGENTS.md) — and with the fetch
  // here there is nothing left for a wrapper to hold.
  const decksQuery = useQuery({ queryKey: ['decks'], queryFn: () => readDecks() });

  // Derived from `deckId` rather than kept as its own state: reverting `deckId` after a
  // cancelled "Change deck?" confirm then redisplays the previous deck by itself, with no
  // remount needed to tell the combobox its selection moved back. Falls back to the
  // single-deck fetch for the initial preselection, which lands before the list does.
  const selectedDeck =
    decksQuery.data?.find((deck) => deck.id === deckId) ??
    (deckQuery.data ? { id: deckQuery.data.id, name: deckQuery.data.name } : null);

  // A card can't move between decks once it exists — that's the only case the deck
  // combobox is ever locked for (Phase 5.5 §5). A contextual "New card" and the deck-editor
  // round-trip both just preselect via `defaultValue`, still fully editable (D1).
  const deckLocked = mode === 'edit';

  // Gate on the preselected deck's own fetch landing, so the combobox shows the real
  // deck name on its first render rather than an empty box that fills in a beat later.
  // Doesn't apply once the user has picked something themselves (`deckId` no longer
  // equals `initialDeckId`) — only the initial preselection needs this wait.
  if (deckId === initialDeckId && initialDeckId && !deckQuery.data) return null;

  const dirty =
    mode === 'create'
      ? Object.values(values).some((v) => v.trim() !== '')
      : !!original && Object.entries(values).some(([k, v]) => v !== (original.values[k] ?? ''));

  const canSubmit = deckId !== null && !!deckQuery.data && !submitting;

  const goBack = () => (deckId ? navigate(`/decks/${deckId}`) : navigate('/library'));

  const handleCancel = () => {
    if (dirty) {
      setConfirmCancelOpen(true);
      return;
    }
    goBack();
  };

  const handleDeckChange = (newDeckId: string) => {
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
    // ADR 024: returnTo rides the URL, not state.
    const params = new URLSearchParams();
    params.set('returnTo', `${location.pathname}${location.search}`);
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
      navigate(`/decks/${deckId}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong.');
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
      setFormError(err instanceof Error ? err.message : 'Something went wrong.');
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
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleCancel}
          className="text-sm font-medium text-(--color-text-secondary)"
        >
          Cancel
        </button>
        <h1 className="text-base font-semibold text-(--color-text)">
          {mode === 'create' ? 'New card' : 'Edit card'}
        </h1>
        <span aria-hidden="true" className="w-[42px]" />
      </div>

      {formError && (
        <p role="alert" className="text-sm text-(--color-danger)">
          {formError}
        </p>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <PickerCombobox
          items={decksQuery.data ?? []}
          selected={selectedDeck}
          onSelect={(item) => handleDeckChange(item.id)}
          // No inline create (D4: creating a card never creates a deck) — a deck editor is
          // too heavy to nest in a dialog, so this always means leaving the page, and only
          // this form knows whether there are typed values to confirm away first.
          onSelectCreate={handleCreateNewDeck}
          createLabel="New deck…"
          placeholder="Deck"
          locked={deckLocked}
        />

        {deckId && deckQuery.data && (
          <CardFieldsForm
            fieldDefs={fieldDefs}
            values={values}
            onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
          />
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="h-12 w-full rounded-full bg-(--color-primary) text-sm font-semibold text-(--color-primary-contrast) disabled:opacity-60"
        >
          {mode === 'create' ? 'Add card' : 'Save'}
        </button>
      </form>

      {mode === 'edit' && (
        <button
          type="button"
          onClick={() => setConfirmDeleteOpen(true)}
          className="h-11 text-sm font-semibold text-(--color-danger)"
        >
          Delete card
        </button>
      )}

      <ConfirmDialog
        open={confirmCancelOpen}
        title="Discard this card?"
        description="You have unsaved changes. Leaving now will discard them."
        confirmLabel="Discard"
        destructive
        onConfirm={goBack}
        onCancel={() => setConfirmCancelOpen(false)}
      />

      <ConfirmDialog
        open={deckChange !== null}
        title="Change deck?"
        description="Switching decks will clear the card you were filling in."
        confirmLabel="Change deck"
        destructive
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
        destructive
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
          destructive
          onConfirm={() => void handleDelete()}
          onCancel={() => setConfirmDeleteOpen(false)}
        />
      )}
    </div>
  );
}
