import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import { createDeck, deleteDeck, readDeck, updateDeck } from 'src/api/deck';
import { readDeletionImpact } from 'src/api/deletion_impact';
import {
  deckEditorReducer,
  initialDeckEditorState,
  deckDetailToEditorState,
  isDeckEditorValid,
  buildDeckCreatePayload,
  type DeckEditorState,
  type EditorField,
} from 'src/lib/deckEditorReducer';
import { buildDeckBatchEditPayload } from 'src/lib/deckEditorDiff';
import { SUPPORTED_FIELD_TYPES } from 'src/lib/fieldTypes';
import { pluralize } from 'src/lib/pluralize';
import { joinClauses } from 'src/lib/joinClauses';
import { deletionSummaryText } from 'src/lib/deletionSummary';
import ConfirmDialog from 'src/components/ui/ConfirmDialog';
import { internalReturnTo } from 'src/lib/returnTo';
import { useLeaveForm } from 'src/lib/leaveForm';
import type { components } from 'src/api/types';
import { ApiDetailError, isNotFound } from 'src/api/unwrap';
import { failureSentence } from 'src/lib/failureSentence';
import { usePageTitle } from 'src/lib/pageTitle';
import { useViewParams } from 'src/lib/viewParams';
import FormBar from 'src/components/ui/FormBar';
import FormPart from 'src/components/ui/FormPart';
import SubmitButton from 'src/components/ui/SubmitButton';

type DeckDetail = components['schemas']['DeckDetail'];

// Centres a button's h-9 box on the h-field input or type beside it, in a row aligned to its bottom.
const FIELD_ICON_MARGIN = 'my-1.25';
const FIELD_ICON_BUTTON = `${FIELD_ICON_MARGIN} flex h-9 w-9 shrink-0 items-center justify-center rounded-tight outlined-reserved text-(--color-ink) disabled:border-(--color-line) disabled:text-(--color-aside)`;
const FIELD_TYPE_SELECT =
  'h-field shrink-0 appearance-none rounded-field outlined-line bg-(--color-ground) px-2.5 text-sm text-(--color-aside) disabled:opacity-100';
// Shown only where the list of fields is too narrow for a field's one row, as at a large text
// size on a phone.
const FIELD_LABEL = 'hidden text-label text-(--color-aside) @max-[16rem]:block';
// Each field its own card where the list of fields is too narrow for a field's one row.
const FIELD_CARD =
  '@max-[16rem]:rounded-block @max-[16rem]:outlined-line @max-[16rem]:bg-(--color-surface) @max-[16rem]:px-3.25 @max-[16rem]:py-3';

type FieldRowProps = {
  field: EditorField;
  /** Whether "Primary" stands above the field's name. */
  primary: boolean;
  /** The field's name input, given the id its label points at. */
  nameInput: (id: string) => ReactNode;
  /** The Move up, Move down and Remove buttons, or what stands in their place. */
  buttons: ReactNode;
};

/** One field of the deck form: its name input, its type and its buttons on one row, or, where
 * the `@container` around the list is narrower than 16rem, stacked with the name and the type
 * each under a visible label at the full width. */
function FieldRow({ field, primary, nameInput, buttons }: FieldRowProps) {
  const nameId = `field-${field.key}-name`;
  const typeId = `field-${field.key}-type`;

  // Each wrapper below is `contents` on the one row, so the row's flex items are the input, the
  // type and the buttons alone.
  return (
    <div className="flex items-end gap-1 py-3 @max-[16rem]:flex-col @max-[16rem]:items-stretch @max-[16rem]:gap-2 @max-[16rem]:py-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1 @max-[16rem]:flex-none">
        {primary && <span className="text-label text-(--color-aside)">Primary</span>}
        <div className="contents @max-[16rem]:flex @max-[16rem]:flex-col @max-[16rem]:gap-1.5">
          <label htmlFor={nameId} className={FIELD_LABEL}>
            Field name
          </label>
          {nameInput(nameId)}
        </div>
      </div>
      <div className="contents @max-[16rem]:flex @max-[16rem]:flex-wrap @max-[16rem]:items-end @max-[16rem]:gap-x-1 @max-[16rem]:gap-y-2">
        <div className="contents @max-[16rem]:flex @max-[16rem]:flex-auto @max-[16rem]:flex-col @max-[16rem]:gap-1.5">
          <label htmlFor={typeId} className={FIELD_LABEL}>
            Field type
          </label>
          <select
            id={typeId}
            aria-label="Field type"
            value={field.type}
            disabled
            className={FIELD_TYPE_SELECT}
          >
            {SUPPORTED_FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === 'text' ? 'Text' : t}
              </option>
            ))}
          </select>
        </div>
        <div className="contents @max-[16rem]:flex @max-[16rem]:gap-1">{buttons}</div>
      </div>
    </div>
  );
}

type FieldsSectionProps = {
  fields: EditorField[];
  onRename: (key: string, name: string) => void;
  onMove: (key: string, toIndex: number) => void;
  onRemove: (key: string) => void;
  onAdd: () => void;
};

/** Reorder via each row's Move up and Move down buttons only — no drag. A pointer-events drag
 * handle can be exercised under Playwright's *mouse*-simulated events, but that only
 * covers the "engage immediately" branch; the touch-specific long-press gate (the part
 * real phone users would actually hit) cannot be verified here on a real or
 * touch-emulated device, and this app is mobile-first. Rather than ship an unverified
 * gesture, the buttons — fully tested and keyboard-operable — are the only mechanism.
 *
 * Removing a *saved* field (one with an `id`) stages the row pending-removal in place
 * (struck through, every control disabled) until Save or the bar's single
 * global Undo, which is the *only* way to bring it back — there is deliberately no
 * control on the row itself for that. A brand-new field deletes outright — there's
 * nothing on the server to stage against. */
function FieldsSection({ fields, onRename, onMove, onRemove, onAdd }: FieldsSectionProps) {
  const activeCount = fields.filter((f) => !f.pendingRemoval).length;
  // The primary field is the first field still active (not staged for removal), in
  // array order — array index doubles as position here, exactly what the Move up/down
  // handlers below already reorder. Derived on every render, never stored, and never
  // landing on a row about to disappear.
  const primaryIndex = fields.findIndex((f) => !f.pendingRemoval);

  return (
    <section className="mt-6 @container">
      <h2 className="text-sm font-medium text-(--color-aside)">Fields</h2>
      <p className="text-label text-(--color-aside)">
        The first field identifies this card in lists and summaries.
      </p>
      <ul className="tappable mt-2 flex flex-col divide-y divide-(--color-line) rounded-block bg-(--color-surface) px-3 @max-[16rem]:gap-3 @max-[16rem]:divide-y-0 @max-[16rem]:border-0 @max-[16rem]:bg-transparent @max-[16rem]:px-0 @max-[16rem]:shadow-none">
        {fields.map((field, index) => {
          if (field.pendingRemoval) {
            return (
              <li key={field.key} className={FIELD_CARD}>
                <FieldRow
                  field={field}
                  primary={false}
                  nameInput={(id) => (
                    <input
                      id={id}
                      type="text"
                      aria-label="Field name"
                      value={field.name}
                      disabled
                      className="h-field w-full rounded-field outlined-line bg-(--color-ground) px-3 text-base text-(--color-aside) line-through"
                    />
                  )}
                  buttons={
                    <>
                      <button
                        type="button"
                        aria-label={`Move ${field.name || 'field'} up`}
                        disabled
                        className={FIELD_ICON_BUTTON}
                      >
                        <ArrowUp aria-hidden="true" className="size-icon" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${field.name || 'field'} down`}
                        disabled
                        className={FIELD_ICON_BUTTON}
                      >
                        <ArrowDown aria-hidden="true" className="size-icon" />
                      </button>
                      <span
                        className={`${FIELD_ICON_MARGIN} flex h-9 w-9 shrink-0 items-center justify-center text-(--color-aside)`}
                      >
                        <X aria-hidden="true" className="size-icon" />
                      </span>
                    </>
                  }
                />
              </li>
            );
          }

          const trimmed = field.name.trim();
          const isDuplicate =
            trimmed !== '' &&
            fields.some(
              (other) =>
                !other.pendingRemoval &&
                other.key !== field.key &&
                other.name.trim().toLowerCase() === trimmed.toLowerCase(),
            );
          const error =
            trimmed === '' ? 'Name is required.' : isDuplicate ? 'Duplicate name' : null;

          return (
            <li key={field.key} className={FIELD_CARD}>
              <FormPart
                sentence={error}
                look="wrong"
                className="[&>[data-reveal-sentence]]:pb-3 @max-[16rem]:flex @max-[16rem]:flex-col @max-[16rem]:gap-2 @max-[16rem]:[&>[data-reveal-sentence]]:pb-0"
              >
                <FieldRow
                  field={field}
                  primary={index === primaryIndex}
                  nameInput={(id) => (
                    <input
                      id={id}
                      type="text"
                      aria-label="Field name"
                      value={field.name}
                      onChange={(e) => onRename(field.key, e.target.value)}
                      className="h-field w-full rounded-field outlined-line bg-(--color-surface) px-3 text-base text-(--color-ink)"
                    />
                  )}
                  buttons={
                    <>
                      <button
                        type="button"
                        aria-label={`Move ${field.name || 'field'} up`}
                        disabled={index === 0}
                        onClick={() => onMove(field.key, index - 1)}
                        className={FIELD_ICON_BUTTON}
                      >
                        <ArrowUp aria-hidden="true" className="size-icon" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${field.name || 'field'} down`}
                        disabled={index === fields.length - 1}
                        onClick={() => onMove(field.key, index + 1)}
                        className={FIELD_ICON_BUTTON}
                      >
                        <ArrowDown aria-hidden="true" className="size-icon" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${field.name || 'field'}`}
                        title={activeCount <= 2 ? 'A deck needs at least two fields.' : undefined}
                        disabled={activeCount <= 2}
                        onClick={() => onRemove(field.key)}
                        className={FIELD_ICON_BUTTON}
                      >
                        <X aria-hidden="true" className="size-icon" />
                      </button>
                    </>
                  }
                />
              </FormPart>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={onAdd}
        className="tappable-sm mt-3 flex h-10 items-center gap-1.5 rounded-full bg-(--color-surface) px-3.5 text-body font-semibold text-(--color-ink)"
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
        Add field
      </button>
    </section>
  );
}

type DeckEditorProps = {
  mode: 'create' | 'edit';
};

/** Full-screen route page. Mode is derived from the route (`/decks/new` vs.
 * `/decks/:deckId/edit`, App.tsx), same pattern as `CardStandaloneForm`.
 * Edit mode loads the existing `DeckDetail` before mounting the body, gated the same
 * way `CardStandaloneForm` gates on its deck. */
export default function DeckEditor({ mode }: DeckEditorProps) {
  const { deckId } = useParams<{ deckId: string }>();
  const { params } = useViewParams();

  const deckQuery = useQuery({
    queryKey: ['deck', deckId],
    queryFn: () => readDeck(deckId!),
    enabled: mode === 'edit' && !!deckId,
  });
  usePageTitle(mode === 'create' ? 'New deck' : deckQuery.data ? 'Edit deck' : undefined);

  if (mode === 'edit') {
    if (deckQuery.isError) {
      return (
        <div className="p-4">
          {isNotFound(deckQuery.error) ? (
            <p className="text-(--color-aside)">Deck not found.</p>
          ) : (
            <FormPart sentence="Could not load this deck." look="wrong">
              {null}
            </FormPart>
          )}
        </div>
      );
    }
    if (!deckQuery.data) return null;
  }

  return (
    <DeckEditorBody
      mode={mode}
      deckId={deckId}
      deck={mode === 'edit' ? deckQuery.data : undefined}
      cancelTo={internalReturnTo(params, 'cancelTo')}
      returnTo={internalReturnTo(params, 'returnTo')}
    />
  );
}

type DeckEditorBodyProps = {
  mode: 'create' | 'edit';
  deckId: string | undefined;
  deck: DeckDetail | undefined;
  cancelTo: string | null;
  returnTo: string | null;
};

type ImpactSummaryCounts = {
  fieldsDeleted: number;
  cardsDeleted: number;
  cardsAffected: number;
  runsDeleted: number;
};

/** The editor save confirm's one sentence, for a changeset that deletes fields and/or
 * cards — the same closure a direct field or card delete goes through, worded from
 * `fieldsDeleted`/`cardsDeleted` (the changeset itself) plus `runsDeleted` (the
 * deletion-impact query). */
function impactSummaryText({
  fieldsDeleted,
  cardsDeleted,
  cardsAffected,
  runsDeleted,
}: ImpactSummaryCounts): string {
  const clauses = [
    ...(fieldsDeleted > 0
      ? [
          cardsAffected > 0
            ? `removes ${pluralize(fieldsDeleted, 'field')} from ${pluralize(cardsAffected, 'card')}`
            : `removes ${pluralize(fieldsDeleted, 'field')}`,
        ]
      : []),
    ...(cardsDeleted > 0 ? [`deletes ${pluralize(cardsDeleted, 'card')}`] : []),
    ...(runsDeleted > 0 ? [`deletes ${pluralize(runsDeleted, 'active run')}`] : []),
  ];
  return `This ${joinClauses(clauses)}. This can't be undone.`;
}

function DeckEditorBody({ mode, deckId, deck, cancelTo, returnTo }: DeckEditorBodyProps) {
  const leaveForm = useLeaveForm();
  const queryClient = useQueryClient();
  const { revealFirstSentence } = useViewParams();
  const rootRef = useRef<HTMLDivElement>(null);

  // Computed once, at mount. `original` doubles as the baseline the edit-mode diff compares
  // against: deckDetailToEditorState mints a fresh client `key` per field, and calling
  // it twice would mint two different sets of keys for the same rows, breaking every
  // id-based comparison in buildDeckBatchEditPayload. It is rebased after every
  // successful edit-mode save, and the global Undo reverts to it directly.
  const [original, setOriginal] = useState<DeckEditorState>(() =>
    mode === 'edit' && deck ? deckDetailToEditorState(deck) : initialDeckEditorState(),
  );
  const [state, dispatch] = useReducer(deckEditorReducer, original);

  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [saveConfirm, setSaveConfirm] = useState<ImpactSummaryCounts | null>(null);
  const [checkingSaveImpact, setCheckingSaveImpact] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletionImpact, setDeletionImpact] = useState<
    components['schemas']['DeletionImpactRead'] | null
  >(null);
  const [checkingDeletionImpact, setCheckingDeletionImpact] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  // A transient "Saved ✓" on the Save control after an edit-mode save.
  const [savedFlash, setSavedFlash] = useState(false);
  useEffect(() => {
    if (!savedFlash) return;
    const timer = setTimeout(() => setSavedFlash(false), 2000);
    return () => clearTimeout(timer);
  }, [savedFlash]);

  const valid = isDeckEditorValid(state);
  // Nothing to save/undo when the form hasn't changed since it was loaded (or since
  // the last successful save, once `original` has been rebased) — Save reads not ready
  // and Undo disables exactly then.
  const canSave = valid && state.dirty && !saving;
  const canUndo = state.dirty && !saving;

  const leaveByCancel = () =>
    void leaveForm(cancelTo ?? (mode === 'edit' ? `/decks/${deckId}` : '/library'));
  const leaveByDone = () => void leaveForm(returnTo ?? `/decks/${deckId}`);

  const handleCancel = () => {
    if (state.dirty) {
      setConfirmCancelOpen(true);
      return;
    }
    leaveByCancel();
  };

  // The single global Undo — discards every uncommitted change (renames, reorders,
  // added rows, and every staged removal) in one step, back to `original`. No confirm:
  // nothing has reached the server yet.
  const handleUndo = () => {
    dispatch({ type: 'LOAD', state: original });
    setNameError(null);
  };

  const handleSaveCreate = async () => {
    const created = await createDeck(buildDeckCreatePayload(state));
    await queryClient.invalidateQueries({ queryKey: ['decks'] });
    if (returnTo) {
      await leaveForm(returnTo, { deckId: created.id });
      return;
    }
    await leaveForm(`/decks/${created.id}`);
  };

  const handleSaveEdit = async () => {
    const payload = buildDeckBatchEditPayload(original, state);
    if (Object.keys(payload).length === 0) return; // Save reads not ready in this state; nothing to do.
    const updated = await updateDeck(deckId!, payload);
    // Stay on the page. Rebuild both the live state and the baseline from the
    // response, one call — this resolves every client_key to a real id and clears
    // every pending flag naturally, since nothing pending survived the save.
    const rebuilt = deckDetailToEditorState(updated);
    setOriginal(rebuilt);
    dispatch({ type: 'LOAD', state: rebuilt });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['deck', deckId] }),
      queryClient.invalidateQueries({ queryKey: ['decks'] }),
    ]);
    setSavedFlash(true);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    setNameError(null);
    try {
      await (mode === 'edit' ? handleSaveEdit() : handleSaveCreate());
    } catch (err) {
      const sentence = failureSentence(err, 'Deck not found.');
      // A taken name is fixed at the input, so it is said there rather than in the bar.
      if (err instanceof ApiDetailError && err.detail.code === 'deck_name_taken') {
        setNameError(sentence);
        revealFirstSentence(rootRef.current);
      } else {
        setSaveError(sentence);
      }
    } finally {
      setSaving(false);
    }
  };

  // Ignores whatever's staged/unsaved in the editor, same as CardStandaloneForm's own
  // delete — deleting the whole deck makes any pending edit moot. Lands on Your library,
  // the place a deck sits in.
  const handleDeleteDeck = async () => {
    setDeleting(true);
    setSaveError(null);
    try {
      await deleteDeck(deckId!);
      await queryClient.invalidateQueries({ queryKey: ['decks'] });
      await leaveForm('/library');
      // Only once the form is gone: it watches the deck's query until it unmounts, and
      // dropping the query sooner refetches a deck that no longer exists.
      queryClient.removeQueries({ queryKey: ['deck', deckId] });
    } catch (err) {
      setSaveError(failureSentence(err, 'Deck not found.'));
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  };

  // The confirm's wording is a live count, not a guess — fetched fresh on every click
  // rather than kept around from mount, so it reflects whatever's changed underneath
  // (a card added, a run started) since the page loaded. An error renders through the
  // form's existing error state and never opens the dialog.
  const handleDeleteClick = async () => {
    setCheckingDeletionImpact(true);
    setSaveError(null);
    try {
      const impact = await readDeletionImpact({ deckIds: [deckId!] });
      setDeletionImpact(impact);
      setConfirmDeleteOpen(true);
    } catch (err) {
      setSaveError(failureSentence(err, 'Deck not found.'));
    } finally {
      setCheckingDeletionImpact(false);
    }
  };

  // The confirm is destructive-changeset-only, and only in edit mode — create mode has
  // nothing on the server yet for a changeset to destroy. fields_deleted/cards_deleted
  // come straight off the changeset the editor itself built;
  // runs_deleted comes from the same deletion-impact query a
  // direct field delete previews with, fetched only when the changeset deletes a
  // field. cards.delete is always empty here — buildDeckBatchEditPayload never sends
  // card ops, see deckEditorDiff.ts — but the sentence has a clause for deleted cards,
  // so the check reads it symmetrically with field_defs.delete.
  const handleSaveClick = async () => {
    if (mode === 'edit') {
      const payload = buildDeckBatchEditPayload(original, state);
      const fieldIds = payload.field_defs?.delete ?? [];
      const cardIds = payload.cards?.delete ?? [];
      const fieldsDeleted = fieldIds.length;
      const cardsDeleted = cardIds.length;
      if (fieldsDeleted > 0 || cardsDeleted > 0) {
        const cardsAffected = deck?.cards.length ?? 0;
        if (fieldsDeleted === 0) {
          setSaveConfirm({
            fieldsDeleted,
            cardsDeleted,
            cardsAffected,
            runsDeleted: 0,
          });
          return;
        }
        setCheckingSaveImpact(true);
        setSaveError(null);
        try {
          const impact = await readDeletionImpact({ fieldIds });
          setSaveConfirm({
            fieldsDeleted,
            cardsDeleted,
            cardsAffected,
            runsDeleted: impact.runs_deleted,
          });
        } catch (err) {
          setSaveError(failureSentence(err, 'Deck not found.'));
        } finally {
          setCheckingSaveImpact(false);
        }
        return;
      }
    }
    void handleSave();
  };

  const sayWhatIsMissing = () => {
    if (state.name.trim() === '') setNameError('Name is required.');
  };

  const handleRemoveField = (key: string) => dispatch({ type: 'REMOVE_FIELD', key });

  // "Done" once the editor has nothing unsaved to lose, "Cancel" while it does — create
  // mode never has a "clean, already saved" state to return to, so it always reads
  // "Cancel".
  const showDone = mode === 'edit' && !state.dirty;

  return (
    <div ref={rootRef} className="p-4">
      <h1 className="text-page leading-[1.05] font-bold tracking-[-0.02em] text-(--color-ink)">
        {mode === 'edit' ? 'Edit deck' : 'New deck'}
      </h1>

      <div className="mt-4 flex flex-col gap-3">
        <FormPart sentence={nameError} look="wrong" className="flex flex-col gap-1.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-label text-(--color-aside)">Deck name</span>
            <input
              type="text"
              value={state.name}
              onChange={(e) => {
                dispatch({ type: 'SET_NAME', name: e.target.value });
                setNameError(null);
              }}
              className="h-field rounded-field outlined-line bg-(--color-surface) px-3.5 text-base text-(--color-ink) placeholder:text-(--color-aside)"
            />
          </label>
        </FormPart>
      </div>

      <FieldsSection
        fields={state.fields}
        onRename={(key, name) => dispatch({ type: 'RENAME_FIELD', key, name })}
        onMove={(key, toIndex) => dispatch({ type: 'MOVE_FIELD', key, toIndex })}
        onRemove={handleRemoveField}
        onAdd={() => dispatch({ type: 'ADD_FIELD' })}
      />

      {mode === 'edit' && (
        <button
          type="button"
          onClick={() => void handleDeleteClick()}
          disabled={deleting || checkingDeletionImpact}
          className="mt-6 tappable flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-(--color-surface) text-base font-semibold text-(--color-ink) disabled:border-(--color-line) disabled:text-(--color-aside) disabled:[box-shadow:none]"
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
          Delete deck
        </button>
      )}

      <FormBar sentence={saveError}>
        <button
          type="button"
          onClick={showDone ? leaveByDone : handleCancel}
          className="tappable shrink-0 h-action rounded-2xl bg-(--color-surface) px-4.5 text-action font-semibold text-(--color-ink)"
        >
          {showDone ? 'Done' : 'Cancel'}
        </button>
        {mode === 'edit' && (
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            className="tappable shrink-0 h-action rounded-2xl bg-(--color-surface) px-4.5 text-action font-semibold text-(--color-ink) disabled:border-(--color-line) disabled:text-(--color-aside) disabled:[box-shadow:none]"
          >
            Undo
          </button>
        )}
        <SubmitButton
          ready={valid && state.dirty}
          busy={saving || checkingSaveImpact}
          onNotReady={sayWhatIsMissing}
          onPress={() => void handleSaveClick()}
        >
          {/* Reverts the instant a new edit re-dirties the form, not just after the
              2s timer — "Saved ✓" while something's already unsaved again reads wrong. */}
          {mode === 'create' ? 'Create' : savedFlash && !state.dirty ? 'Saved ✓' : 'Save'}
        </SubmitButton>
      </FormBar>

      <ConfirmDialog
        open={confirmCancelOpen}
        title="Discard this deck?"
        description="You have unsaved changes. Leaving now will discard them."
        confirmLabel="Discard"
        onConfirm={leaveByCancel}
        onCancel={() => setConfirmCancelOpen(false)}
      />

      <ConfirmDialog
        open={saveConfirm !== null}
        title="Save changes?"
        description={saveConfirm ? impactSummaryText(saveConfirm) : ''}
        confirmLabel="Save"
        onConfirm={() => {
          setSaveConfirm(null);
          void handleSave();
        }}
        onCancel={() => setSaveConfirm(null)}
      />

      {mode === 'edit' && (
        <ConfirmDialog
          open={confirmDeleteOpen}
          title="Delete deck?"
          // Everything that references the deck cascades with it, review history
          // included — nothing about it survives the delete.
          description={deletionImpact ? deletionSummaryText(deletionImpact) : ''}
          confirmLabel="Delete"
          onConfirm={() => void handleDeleteDeck()}
          onCancel={() => setConfirmDeleteOpen(false)}
        />
      )}
    </div>
  );
}
