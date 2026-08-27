import { useId, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
  emptyBoard,
  hasAnyAssignment,
  moveField,
  toggleCount,
  type BoardSlot,
  type BoardState,
  type PoolSlot,
} from 'src/lib/deckConfigurationBoard';
import { formatDateTime } from 'src/lib/datetime';
import { internalReturnTo } from 'src/lib/returnTo';
import type { components } from 'src/api/types';

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
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const configQuery = useQuery({
    queryKey: ['deck_practice_config', configId],
    queryFn: () => readDeckPracticeConfig(configId!),
    enabled: mode === 'edit' && !!configId,
  });

  if (mode === 'edit' && configQuery.isError) {
    return (
      <div className="p-4">
        <p className="text-(--color-text-muted)">Deck configuration not found.</p>
      </div>
    );
  }
  // The body is keyed on the loaded config so its `useState` initialisers run against
  // real data, the same gate DeckEditor uses for an existing deck.
  if (mode === 'edit' && !configQuery.data) return null;

  // `deckId` in router state is a deck just created through the "New deck…" round-trip
  // (DeckEditor navigates back with it) — a one-shot result, so it stays in state
  // (ADR 024). `?deck=` is the pre-filter chain's context. Both mean "start on this
  // deck", so the fresher one wins.
  const state = location.state as { deckId?: string } | null;

  return (
    <DeckConfigurationEditorBody
      mode={mode}
      config={configQuery.data}
      contextSubjectId={searchParams.get('subject')}
      contextDeckId={state?.deckId ?? searchParams.get('deck')}
      returnTo={internalReturnTo(searchParams)}
    />
  );
}

type BodyProps = {
  mode: 'create' | 'edit';
  config?: DeckPracticeConfigRead;
  contextSubjectId: string | null;
  contextDeckId: string | null;
  /** Where Cancel and a successful Save land. Null means "the deck's own page", which
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
  // Prefilled with the moment it was opened, in the browser's zone (ADR 019 — the one
  // sanctioned formatter). A config name only has to be unique per deck, and a timestamp
  // is both unique and better than "Untitled" for someone who never renames it. Computed
  // once, at mount: it names when the config was built, not when it was last re-rendered.
  const [name, setName] = useState(() => config?.name ?? formatDateTime(new Date()));
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
      navigate(returnTo ?? `/decks/${saved.deck_id}?tab=configurations`, {
        state: { configurationId: saved.id },
      });
    },
    onError: (error: Error) => {
      // A duplicate name is the one failure the user fixes in place, so it belongs on
      // the input rather than in a banner that costs them the rest of the form.
      if (/already exists/i.test(error.message)) setNameError(error.message);
      else setSaveError(error.message);
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
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between bg-(--color-surface) px-4 py-2">
        <button
          type="button"
          onClick={() =>
            navigate(returnTo ?? (deckId ? `/decks/${deckId}?tab=configurations` : '/library'))
          }
          className="text-sm font-medium text-(--color-text-secondary)"
        >
          Cancel
        </button>
        <h1 className="text-base font-semibold text-(--color-text)">
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
          className="text-sm font-semibold text-(--color-primary) disabled:opacity-40"
        >
          Save
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {/* Label and control are siblings, not a wrapping <label>: the inline error below
            would otherwise become part of the field's own accessible name. */}
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-(--color-text)">Deck</span>
          {mode === 'edit' ? (
            <span className="inline-flex h-11 items-center rounded-lg bg-(--color-surface-elevated) px-3 text-sm text-(--color-text)">
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
              // returnTo itself rides the URL (ADR 024), not state: this page's own
              // full location already contains whatever returnTo it was opened with,
              // so a nested round trip survives with nothing extra to forward by hand.
              onSelectCreate={() => {
                const params = new URLSearchParams();
                params.set('returnTo', `${location.pathname}${location.search}`);
                navigate({ pathname: '/decks/new', search: params.toString() });
              }}
              createLabel="New deck…"
              placeholder="Deck"
              renderLeading={(item) => (
                <span className="shrink-0 text-xs text-(--color-text-muted)">
                  {item.subject_name}
                </span>
              )}
            />
          )}
        </div>

        {deckId && (
          <div className="flex flex-col gap-1">
            <label htmlFor={nameInputId} className="text-sm font-medium text-(--color-text)">
              Name
            </label>
            <input
              id={nameInputId}
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setNameError(null);
              }}
              aria-invalid={nameError !== null}
              aria-describedby={nameError ? `${nameInputId}-error` : undefined}
              className="h-11 rounded-lg border border-(--color-surface-elevated) px-3 text-(--color-text)"
            />
            {nameError && (
              <span
                id={`${nameInputId}-error`}
                role="alert"
                className="text-sm text-(--color-danger)"
              >
                {nameError}
              </span>
            )}
          </div>
        )}
      </div>

      {deckId && !deck && <p className="mt-4 text-(--color-text-muted)">Loading fields…</p>}

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
        <p className="mt-3 text-sm text-(--color-text-muted)">
          {validationError ?? 'Give this config a name to save it.'}
        </p>
      )}

      {saveError && (
        <p role="alert" className="mt-3 text-sm text-(--color-danger)">
          {saveError}
        </p>
      )}

      <ConfirmDialog
        open={pendingDeck !== null}
        title="Change deck?"
        description="Fields belong to their own deck, so switching clears everything assigned here."
        confirmLabel="Change deck"
        destructive
        onConfirm={() => pendingDeck && applyDeck(pendingDeck)}
        onCancel={() => setPendingDeck(null)}
      />
    </div>
  );
}
