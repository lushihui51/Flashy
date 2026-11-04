import { useId, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { readDeck, readDecks } from 'src/api/deck';
import { readSubjects } from 'src/api/subject';
import {
  createDeckPracticeConfig,
  readDeckPracticeConfig,
  updateDeckPracticeConfig,
} from 'src/api/deck_practice_config';
import FieldAssignmentBoard from 'src/components/library/FieldAssignmentBoard';
import PickerCombobox from 'src/components/ui/PickerCombobox';
import ConfirmDialog from 'src/components/ui/ConfirmDialog';
import {
  boardFromConfig,
  boardToPayload,
  boardValidationError,
  defaultConfigurationName,
  emptyBoard,
  hasAnyAssignment,
  moveField,
  toggleCount,
  type BoardSlot,
  type BoardState,
  type PoolSlot,
} from 'src/lib/deckConfigurationBoard';
import { internalReturnTo } from 'src/lib/returnTo';
import type { components } from 'src/api/types';
import { ApiDetailError, isNotFound } from 'src/api/unwrap';
import { failureSentence } from 'src/lib/failureSentence';
import { usePageTitle } from 'src/lib/pageTitle';
import { useViewParams } from 'src/lib/viewParams';
import StickyPageRow from 'src/components/ui/StickyPageRow';

type DeckSummary = components['schemas']['DeckSummary'];
type DeckDetail = components['schemas']['DeckDetail'];
type DeckPracticeConfigRead = components['schemas']['DeckPracticeConfigRead'];

type DeckOption = { id: string; name: string; subject_id: string; subject_name: string };

/** Context decks first, then the rest — the picker itself never sorts (it renders items
 * in the order given), so arriving from a subject or a deck page means its decks are the
 * ones already at the top of the list. */
function orderedDeckOptions(
  decks: DeckSummary[],
  subjectNameById: Map<string, string>,
  contextSubjectId: string | null,
): DeckOption[] {
  const options = decks.map((deck) => ({
    id: deck.id,
    name: deck.name,
    subject_id: deck.subject_id,
    subject_name: subjectNameById.get(deck.subject_id) ?? '',
  }));
  if (!contextSubjectId) return options;
  return [
    ...options.filter((deck) => deck.subject_id === contextSubjectId),
    ...options.filter((deck) => deck.subject_id !== contextSubjectId),
  ];
}

type DeckConfigurationEditorProps = {
  mode: 'create' | 'edit';
};

/**
 * The deck configuration builder, one surface for both create and edit.
 *
 * A deck configuration says which of *one deck's* fields act as prompts and which as
 * answers; it is not a practice, and it configures no practice. A practice is assembled
 * later by choosing configurations (at most one per deck) and naming the run.
 *
 * Like card creation, nothing below the deck picker renders until a deck is chosen and
 * its live fields have loaded: which fields exist *is* the rest of the form.
 */
export default function DeckConfigurationEditor({ mode }: DeckConfigurationEditorProps) {
  const { configId } = useParams<{ configId: string }>();
  const { params } = useViewParams();
  const location = useLocation();

  const configQuery = useQuery({
    queryKey: ['deck_practice_config', configId],
    queryFn: () => readDeckPracticeConfig(configId!),
    enabled: mode === 'edit' && !!configId,
  });
  usePageTitle(
    mode === 'create' ? 'New configuration' : configQuery.data ? 'Edit configuration' : undefined,
  );

  if (mode === 'edit' && configQuery.isError) {
    return (
      <div className="p-4">
        {isNotFound(configQuery.error) ? (
          <p className="text-(--color-aside)">Deck configuration not found.</p>
        ) : (
          <p role="alert" className="text-sm text-(--color-wrong)">
            Could not load this deck configuration.
          </p>
        )}
      </div>
    );
  }
  // The body is keyed on the loaded config so its `useState` initialisers run against
  // real data, the same gate DeckEditor uses for an existing deck.
  if (mode === 'edit' && !configQuery.data) return null;

  // `deckId` in router state is a deck just created through the "New deck…" round-trip
  // (DeckEditor navigates back with it) — a one-shot result, so it stays in state.
  // `?deck=` is the pre-filter chain's context. Both mean "start on this deck", so the
  // fresher one wins.
  const state = location.state as { deckId?: string } | null;

  return (
    <DeckConfigurationEditorBody
      mode={mode}
      config={configQuery.data}
      contextSubjectId={params.get('subject')}
      contextDeckId={state?.deckId ?? params.get('deck')}
      returnTo={internalReturnTo(params)}
    />
  );
}

type BodyProps = {
  mode: 'create' | 'edit';
  config?: DeckPracticeConfigRead;
  contextSubjectId: string | null;
  contextDeckId: string | null;
  /** Where Cancel and a successful Create or Save land. Null means "the deck's own page", which
   * is only knowable once a deck is chosen. */
  returnTo: string | null;
};

function DeckConfigurationEditorBody({
  mode,
  config,
  contextSubjectId,
  contextDeckId,
  returnTo,
}: BodyProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const nameInputId = useId();

  // A config can never move between decks — its uniqueness and every field id in it are
  // deck-scoped — so edit mode pins the deck instead of offering the picker.
  const [deckId, setDeckId] = useState<string | null>(config?.deck_id ?? contextDeckId);
  // In create mode the name follows the board — derived from its layout — until the
  // user types, after which it is theirs through further assignments and a deck
  // change. Edit mode starts with the stored name, so it is never re-derived.
  // null until the user types (create mode); the stored name from the start (edit mode).
  const [typedName, setTypedName] = useState<string | null>(config?.name ?? null);
  const [board, setBoard] = useState<BoardState | null>(null);
  const [pendingDeck, setPendingDeck] = useState<DeckOption | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const subjectsQuery = useQuery({ queryKey: ['subjects'], queryFn: readSubjects });
  const decksQuery = useQuery({ queryKey: ['decks'], queryFn: () => readDecks() });
  const deckQuery = useQuery({
    queryKey: ['deck', deckId],
    queryFn: () => readDeck(deckId!),
    enabled: !!deckId,
  });

  const subjectNameById = new Map((subjectsQuery.data ?? []).map((s) => [s.id, s.name]));
  const deckOptions = orderedDeckOptions(
    decksQuery.data ?? [],
    subjectNameById,
    contextSubjectId ??
      (decksQuery.data ?? []).find((deck) => deck.id === contextDeckId)?.subject_id ??
      null,
  );
  const selectedDeck = deckOptions.find((deck) => deck.id === deckId) ?? null;

  const deck: DeckDetail | undefined = deckQuery.data;
  const name =
    typedName ?? (deck && board ? defaultConfigurationName(board, deck.field_defs) : '');
  // Built during render once the chosen deck's fields land, and cleared back to null by
  // every deck change — the field set *is* the board, so there is nothing to build from
  // before then. (Adjusting state while rendering rather than in an effect, the same
  // pattern PickerCombobox uses to resync its text.)
  if (deck && deckId === deck.id && board === null) {
    setBoard(
      config && config.deck_id === deck.id
        ? boardFromConfig(deck.field_defs, config)
        : emptyBoard(deck.field_defs),
    );
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { deck_id: deckId!, name: name.trim(), ...boardToPayload(board!) };
      return mode === 'edit' && config
        ? updateDeckPracticeConfig(config.id, payload)
        : createDeckPracticeConfig(payload);
    },
    onSuccess: async (saved) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['deck_practice_configs'] }),
        queryClient.invalidateQueries({ queryKey: ['deck_practice_config', saved.id] }),
      ]);
      // `{configurationId}` is a create-only hand-back: building a configuration from
      // New practice means wanting to use it, so New practice auto-selects it; an edit
      // says nothing about wanting it and returns with no result.
      navigate(
        returnTo ?? `/decks/${saved.deck_id}?tab=configurations`,
        mode === 'create' ? { state: { configurationId: saved.id } } : undefined,
      );
    },
    onError: (error) => {
      const sentence = failureSentence(error, 'Deck configuration not found.');
      // A duplicate name is the one failure the user fixes in place, so it belongs on
      // the input rather than in a banner that costs them the rest of the form.
      if (error instanceof ApiDetailError && error.detail.code === 'configuration_name_taken') {
        setNameError(sentence);
      } else {
        setSaveError(sentence);
      }
    },
  });

  const applyDeck = (next: DeckOption) => {
    setDeckId(next.id);
    setBoard(null);
    setPendingDeck(null);
  };

  const chooseDeck = (next: DeckOption) => {
    // Field ids are deck-scoped, so nothing on the board can survive a deck change.
    if (board && hasAnyAssignment(board)) setPendingDeck(next);
    else applyDeck(next);
  };

  const validationError = board ? boardValidationError(board) : 'Choose a deck first.';
  const nameMissing = name.trim() === '';
  const canSave =
    !!deckId && !!board && !nameMissing && !validationError && !saveMutation.isPending;

  return (
    <div className="p-4">
      <StickyPageRow>
        <button
          type="button"
          onClick={() =>
            navigate(returnTo ?? (deckId ? `/decks/${deckId}?tab=configurations` : '/library'))
          }
          className="text-[15px] font-medium text-(--color-aside)"
        >
          Cancel
        </button>
        <h1 className="text-[19px] font-bold text-(--color-ink)">
          {mode === 'edit' ? 'Edit configuration' : 'New configuration'}
        </h1>
        <button
          type="button"
          disabled={!canSave}
          onClick={() => {
            setNameError(null);
            setSaveError(null);
            saveMutation.mutate();
          }}
          className="tappable-sm h-10 shrink-0 rounded-[14px] bg-(--color-main-action) px-4 text-[15px] font-semibold text-(--color-ink) disabled:border-(--color-line) disabled:bg-(--color-surface) disabled:text-(--color-aside) disabled:[box-shadow:none]"
        >
          {mode === 'edit' ? 'Save' : 'Create'}
        </button>
      </StickyPageRow>

      <div className="mt-3 flex flex-col gap-3">
        {/* Label and control are siblings, not a wrapping <label>: the inline error below
            would otherwise become part of the field's own accessible name. */}
        <div
          className={mode === 'edit' ? 'flex items-baseline gap-2.5' : 'flex flex-col gap-1.5'}
        >
          <span className="text-[13px] text-(--color-aside)">Deck</span>
          {mode === 'edit' ? (
            <span className="text-[15px] font-semibold text-(--color-ink)">
              {selectedDeck
                ? `${selectedDeck.subject_name} · ${selectedDeck.name}`
                : (deck?.name ?? '')}
            </span>
          ) : (
            <PickerCombobox<DeckOption>
              items={deckOptions}
              selected={selectedDeck}
              onSelect={chooseDeck}
              // Leaves the page, so it carries back where to return *including* the
              // context params — DeckEditor answers with the new deck's id in state.
              // returnTo itself rides the URL, not state: this page's own full
              // location already contains whatever returnTo it was opened with, so a
              // nested round trip survives with nothing extra to forward by hand.
              onSelectCreate={() => {
                const params = new URLSearchParams();
                params.set('returnTo', `${location.pathname}${location.search}`);
                navigate({ pathname: '/decks/new', search: params.toString() });
              }}
              createLabel="New deck…"
              placeholder="Deck"
              renderLeading={(item) => (
                <span className="shrink-0 text-xs text-(--color-aside)">
                  {item.subject_name}
                </span>
              )}
            />
          )}
        </div>

        {deckId && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={nameInputId} className="text-[13px] text-(--color-aside)">
              Name
            </label>
            <input
              id={nameInputId}
              type="text"
              value={name}
              onChange={(event) => {
                setTypedName(event.target.value);
                setNameError(null);
              }}
              aria-invalid={nameError !== null}
              aria-describedby={nameError ? `${nameInputId}-error` : undefined}
              className="h-[46px] rounded-[14px] border-[1.5px] border-(--color-line) bg-(--color-surface) px-3.5 text-base text-(--color-ink) placeholder:text-(--color-aside)"
            />
            {nameError && (
              <span
                id={`${nameInputId}-error`}
                role="alert"
                className="text-sm text-(--color-wrong)"
              >
                {nameError}
              </span>
            )}
          </div>
        )}
      </div>

      {deckId && !deck && <p className="mt-4 text-(--color-aside)">Loading fields…</p>}

      {deck && board && (
        <div className="mt-4">
          <FieldAssignmentBoard
            fieldDefs={deck.field_defs}
            state={board}
            onMove={(fieldId: string, to: BoardSlot) =>
              setBoard((current) => (current ? moveField(current, fieldId, to) : current))
            }
            onToggleCount={(slot: PoolSlot, count: number) =>
              setBoard((current) => (current ? toggleCount(current, slot, count) : current))
            }
          />
        </div>
      )}

      {deck && board && (validationError || nameMissing) && (
        <p className="mt-3 text-sm text-(--color-aside)">
          {validationError ??
            (mode === 'edit'
              ? 'Give this configuration a name to save it.'
              : 'Give this configuration a name to create it.')}
        </p>
      )}

      {saveError && (
        <p role="alert" className="mt-3 text-sm text-(--color-wrong)">
          {saveError}
        </p>
      )}

      <ConfirmDialog
        open={pendingDeck !== null}
        title="Change deck?"
        description="Fields belong to their own deck, so switching clears everything assigned here."
        confirmLabel="Continue"
        onConfirm={() => pendingDeck && applyDeck(pendingDeck)}
        onCancel={() => setPendingDeck(null)}
      />
    </div>
  );
}
