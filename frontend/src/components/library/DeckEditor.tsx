import { useEffect, useReducer, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreVertical, Plus, X } from 'lucide-react';
import { createDeck, deleteDeck, readDeck, updateDeck } from 'src/api/deck';
import { readSubject } from 'src/api/subject';
import {
  deckEditorReducer,
  initialDeckEditorState,
  deckDetailToEditorState,
  isDeckEditorValid,
  buildDeckCreatePayload,
  type DeckEditorState,
  type EditorField,
  type EditorCard,
} from 'src/lib/deckEditorReducer';
import { buildDeckBatchEditPayload } from 'src/lib/deckEditorDiff';
import { SUPPORTED_FIELD_TYPES } from 'src/lib/fieldTypes';
import { pluralize } from 'src/lib/pluralize';
import SubjectPicker from 'src/components/library/SubjectPicker';
import ListRow from 'src/components/library/ListRow';
import ConfirmDialog from 'src/components/library/ConfirmDialog';
import CardForm from 'src/components/library/CardForm';
import type { components } from 'src/api/types';

type DeckDetail = components['schemas']['DeckDetail'];
type SubjectRead = components['schemas']['SubjectRead'];

function FieldOverflowMenu({
  fieldName,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  fieldName: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleDocPointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', handleDocPointerDown);
    return () => document.removeEventListener('pointerdown', handleDocPointerDown);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label={`Reorder ${fieldName || 'field'}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 shrink-0 items-center justify-center"
      >
        <MoreVertical aria-hidden="true" className="h-4 w-4 text-(--color-text-muted)" />
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute right-0 z-10 mt-1 w-36 rounded-lg border border-(--color-surface-elevated) bg-(--color-surface) py-1 shadow-lg"
        >
          <li role="none">
            <button
              role="menuitem"
              type="button"
              disabled={!canMoveUp}
              onClick={() => {
                onMoveUp();
                setOpen(false);
              }}
              className="flex w-full px-3 py-2 text-left text-sm text-(--color-text) disabled:opacity-40"
            >
              Move up
            </button>
          </li>
          <li role="none">
            <button
              role="menuitem"
              type="button"
              disabled={!canMoveDown}
              onClick={() => {
                onMoveDown();
                setOpen(false);
              }}
              className="flex w-full px-3 py-2 text-left text-sm text-(--color-text) disabled:opacity-40"
            >
              Move down
            </button>
          </li>
        </ul>
      )}
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

/** Reorder via the Move up/down overflow menu only — no drag. A pointer-events-based
 * drag handle was built and worked under Playwright's *mouse*-simulated events, but
 * that only exercises the "engage immediately" branch; the touch-specific long-press
 * gate (the part real phone users would actually hit) was never verified on a real or
 * touch-emulated device, and this app is mobile-first. Rather than ship an unverified
 * gesture, the buttons — fully tested and keyboard-operable — are the only mechanism.
 *
 * Phase 7.5: removing a *saved* field (one with an `id`) no longer deletes the row —
 * it stages the row pending-removal in place (struck through, ghosted, every control
 * disabled) until Save or the header's single global Undo, which is the *only* way to
 * bring it back — there is deliberately no control on the row itself for that. A
 * brand-new field still deletes outright — there's nothing on the server to stage
 * against. */
function FieldsSection({ fields, onRename, onMove, onRemove, onAdd }: FieldsSectionProps) {
  const activeCount = fields.filter((f) => !f.pendingRemoval).length;

  return (
    <section className="mt-6">
      <h2 className="text-sm font-medium text-(--color-text-muted)">Fields</h2>
      <ul className="mt-1 flex flex-col">
        {fields.map((field, index) => {
          if (field.pendingRemoval) {
            return (
              <li key={field.key}>
                <div className="flex h-14 items-center gap-2 opacity-50">
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      aria-label="Field name"
                      value={field.name}
                      disabled
                      className="h-9 w-full rounded-lg border border-(--color-surface-elevated) px-2 text-(--color-text) line-through"
                    />
                  </div>
                  <select
                    aria-label="Field type"
                    value={field.type}
                    disabled
                    className="h-9 shrink-0 rounded-lg border border-(--color-surface-elevated) px-2 text-sm text-(--color-text)"
                  >
                    {SUPPORTED_FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t === 'text' ? 'Text' : t}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label={`Reorder ${field.name || 'field'}`}
                    disabled
                    className="flex h-9 w-9 shrink-0 items-center justify-center opacity-40"
                  >
                    <MoreVertical aria-hidden="true" className="h-4 w-4 text-(--color-text-muted)" />
                  </button>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center opacity-40">
                    <X aria-hidden="true" className="h-4 w-4 text-(--color-text-muted)" />
                  </span>
                </div>
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
          const error = trimmed === '' ? 'Name is required' : isDuplicate ? 'Duplicate name' : null;

          return (
            <li key={field.key}>
              <div className="flex h-14 items-center gap-2">
                <div className="min-w-0 flex-1">
                  <input
                    type="text"
                    aria-label="Field name"
                    value={field.name}
                    onChange={(e) => onRename(field.key, e.target.value)}
                    className="h-9 w-full rounded-lg border border-(--color-surface-elevated) px-2 text-(--color-text)"
                  />
                </div>

                <select
                  aria-label="Field type"
                  value={field.type}
                  disabled
                  className="h-9 shrink-0 rounded-lg border border-(--color-surface-elevated) px-2 text-sm text-(--color-text)"
                >
                  {SUPPORTED_FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t === 'text' ? 'Text' : t}
                    </option>
                  ))}
                </select>

                <FieldOverflowMenu
                  fieldName={field.name}
                  canMoveUp={index > 0}
                  canMoveDown={index < fields.length - 1}
                  onMoveUp={() => onMove(field.key, index - 1)}
                  onMoveDown={() => onMove(field.key, index + 1)}
                />

                <button
                  type="button"
                  aria-label={`Remove ${field.name || 'field'}`}
                  title={activeCount <= 2 ? 'A deck needs at least two fields.' : undefined}
                  disabled={activeCount <= 2}
                  onClick={() => onRemove(field.key)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center disabled:opacity-40"
                >
                  <X aria-hidden="true" className="h-4 w-4 text-(--color-text-muted)" />
                </button>
              </div>
              {error && <p className="text-sm text-(--color-danger)">{error}</p>}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={onAdd}
        className="mt-2 flex h-9 items-center gap-1 text-sm font-semibold text-(--color-primary)"
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
        Add field
      </button>
    </section>
  );
}

type CardsSectionProps = {
  fields: EditorField[];
  cards: EditorCard[];
  onAdd: () => void;
  onOpen: (key: string) => void;
};

/** Phase 7.5: a *saved* card removed from inside the in-editor `CardForm` is staged
 * the same way a saved field is — struck through, no longer opens the form, no
 * control of its own. Only the header's global Undo can bring it back. A brand-new
 * card still deletes outright. Title/subtitle for every row — pending or not — read
 * from the deck's *active* fields only, matching what the row will actually show
 * once a pending field is really gone. */
function CardsSection({ fields, cards, onAdd, onOpen }: CardsSectionProps) {
  const activeFields = fields.filter((f) => !f.pendingRemoval);
  const firstField = activeFields[0];
  const secondField = activeFields[1];

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-(--color-text-muted)">{pluralize(cards.length, 'card')}</h2>
        <button
          type="button"
          onClick={onAdd}
          className="flex h-9 items-center gap-1 text-sm font-semibold text-(--color-primary)"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add card
        </button>
      </div>
      <ul className="mt-1 flex flex-col divide-y divide-(--color-surface-elevated)">
        {cards.map((card) => {
          const firstValue = firstField ? (card.values[firstField.key] ?? '').trim() : '';
          const secondValue = secondField ? (card.values[secondField.key] ?? '').trim() : '';

          if (card.pendingRemoval) {
            return (
              <li key={card.key}>
                <div className="flex min-h-16 items-center gap-3 py-[14px] opacity-50">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] leading-5 text-(--color-text) line-through">
                      {firstValue === '' ? 'empty' : firstValue}
                    </span>
                    {secondValue !== '' && (
                      <span className="block truncate text-[13px] leading-4 text-(--color-text-secondary)">
                        {secondValue}
                      </span>
                    )}
                  </span>
                </div>
              </li>
            );
          }

          return (
            <li key={card.key}>
              <ListRow
                title={
                  firstValue === '' ? (
                    <span className="italic text-(--color-text-muted)">empty</span>
                  ) : (
                    firstValue
                  )
                }
                subtitle={secondValue !== '' ? secondValue : undefined}
                onClick={() => onOpen(card.key)}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

type CreateLocationState = {
  subject?: { id: string; name: string; icon: string };
  /** Set when this editor was opened from a DeckPicker's "New deck…" row (Phase 5.5
   * §4) — where to go back to, and with what, once this deck is saved or abandoned.
   * Create mode only — an edit is never entered via that round-trip. */
  returnTo?: string;
} | null;

// A stable reference for the "adding a new card" case — a fresh `{}` literal on every
// render would defeat CardForm's render-time resync guard (it compares `initialValues`
// by reference to detect "a different card was opened") and keep resetting the form
// back to blank as the user types.
const EMPTY_CARD_VALUES: Record<string, string> = {};

type DeckEditorProps = {
  mode: 'create' | 'edit';
};

/** Full-screen route page (§4.7). Mode is derived from the route (`/decks/new` vs.
 * `/decks/:deckId/edit`, App.tsx), same pattern as `SubjectForm`/`CardStandaloneForm`.
 * Edit mode (Phase 7) loads the existing `DeckDetail` — and its subject, since
 * `SubjectPicker` needs the full `{id, name, icon}` object, not just an id — before
 * mounting the body, gated the same way `CardStandaloneForm` gates on its deck. */
export default function DeckEditor({ mode }: DeckEditorProps) {
  const { deckId } = useParams<{ deckId: string }>();
  const location = useLocation();

  const deckQuery = useQuery({
    queryKey: ['deck', deckId],
    queryFn: () => readDeck(deckId!),
    enabled: mode === 'edit' && !!deckId,
  });
  const subjectId = deckQuery.data?.subject_id;
  const subjectQuery = useQuery({
    queryKey: ['subject', subjectId],
    queryFn: () => readSubject(subjectId!),
    enabled: mode === 'edit' && !!subjectId,
  });

  if (mode === 'edit') {
    if (deckQuery.isError) {
      return (
        <div className="p-4">
          <p className="text-(--color-text-muted)">Deck not found.</p>
        </div>
      );
    }
    if (!deckQuery.data || !subjectQuery.data) return null;
  }

  const createLocationState = mode === 'create' ? (location.state as CreateLocationState) : null;

  return (
    <DeckEditorBody
      mode={mode}
      deckId={deckId}
      deck={mode === 'edit' ? deckQuery.data : undefined}
      subject={mode === 'edit' ? subjectQuery.data : undefined}
      contextualSubject={createLocationState?.subject ?? null}
      returnTo={createLocationState?.returnTo}
    />
  );
}

type DeckEditorBodyProps = {
  mode: 'create' | 'edit';
  deckId: string | undefined;
  deck: DeckDetail | undefined;
  subject: SubjectRead | undefined;
  contextualSubject: { id: string; name: string; icon: string } | null;
  returnTo: string | undefined;
};

/** Phase 7.5 §2: counts what the current changeset would actually delete — the only
 * thing the aggregated save confirm needs, and what decides whether it shows at all. */
function destructiveCounts(state: DeckEditorState) {
  const fieldCount = state.fields.filter((f) => f.pendingRemoval).length;
  const cardCount = state.cards.filter((c) => c.pendingRemoval).length;
  return { fieldCount, cardCount };
}

/** One aggregate sentence, counts only — no per-field breakdown (Phase 7.5 §3). */
function destructiveSummaryText({ fieldCount, cardCount }: ReturnType<typeof destructiveCounts>): string {
  const parts: string[] = [];
  if (fieldCount > 0) parts.push(pluralize(fieldCount, 'field'));
  if (cardCount > 0) parts.push(pluralize(cardCount, 'card'));
  return `This deletes ${parts.join(' and ')}. This can't be undone.`;
}

function DeckEditorBody({ mode, deckId, deck, subject, contextualSubject, returnTo }: DeckEditorBodyProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Computed once, at mount — the same rule as SubjectPicker/DeckPicker's own
  // `defaultValue`. `original` doubles as the frozen baseline the edit-mode diff
  // compares against: deckDetailToEditorState mints a fresh client `key` per field
  // and card, and calling it twice would mint two different sets of keys for the
  // same rows, breaking every id-based comparison in buildDeckBatchEditPayload.
  // Unlike Phase 7, this is no longer frozen for the component's whole lifetime —
  // Phase 7.5 rebases it after every successful edit-mode save (§4), and the global
  // Undo (§2) reverts to it directly.
  const [original, setOriginal] = useState<DeckEditorState>(() =>
    mode === 'edit' && deck ? deckDetailToEditorState(deck) : initialDeckEditorState(contextualSubject?.id ?? null),
  );
  const [state, dispatch] = useReducer(deckEditorReducer, original);

  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [saveConfirm, setSaveConfirm] = useState<ReturnType<typeof destructiveCounts> | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // 'new' | <card key> | null — TypeScript collapses this to plain `string | null`
  // ('new' is a subtype of string), so every read site below checks `!== 'new'`
  // explicitly via `editingCardKey` rather than relying on `typeof`.
  const [cardFormState, setCardFormState] = useState<string | null>(null);
  // Bumped on every open so CardForm (mounted for DeckEditor's whole lifetime) gets a
  // fresh `key` and therefore a fresh remount each time — see CardForm's own comment
  // for why reusing the same instance across repeated "Add card" opens is unsafe.
  const [cardFormOpenSeq, setCardFormOpenSeq] = useState(0);
  const openCardForm = (next: string) => {
    setCardFormState(next);
    setCardFormOpenSeq((n) => n + 1);
  };
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Phase 7.5 §4: a transient "Saved ✓" on the Save control after an edit-mode save.
  const [savedFlash, setSavedFlash] = useState(false);
  useEffect(() => {
    if (!savedFlash) return;
    const timer = setTimeout(() => setSavedFlash(false), 2000);
    return () => clearTimeout(timer);
  }, [savedFlash]);

  const valid = isDeckEditorValid(state);
  // Nothing to save/undo when the form hasn't changed since it was loaded (or since
  // the last successful save, once `original` has been rebased) — Save and Undo
  // disable exactly then (§4), rather than staying clickable for a no-op.
  const canSave = valid && state.dirty && !saving;
  const canUndo = state.dirty && !saving;

  // Create mode opened via a DeckPicker's "New deck…" round-trip → both Save and
  // Cancel go back to wherever that picker lives. Edit mode always returns to the
  // deck's own detail page — there's no round-trip to return to.
  const goBack = () => navigate(mode === 'edit' ? `/decks/${deckId}` : (returnTo ?? '/library'));

  const handleCancel = () => {
    if (state.dirty) {
      setConfirmCancelOpen(true);
      return;
    }
    goBack();
  };

  // Phase 7.5 §2: the single global Undo — discards every uncommitted change
  // (renames, reorders, added rows, and every staged removal) in one step, back to
  // `original`. No confirm: nothing has reached the server yet.
  const handleUndo = () => dispatch({ type: 'LOAD', state: original });

  const handleSaveCreate = async () => {
    const created = await createDeck(buildDeckCreatePayload(state));
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['decks'] }),
      queryClient.invalidateQueries({ queryKey: ['decks', state.subjectId] }),
      queryClient.invalidateQueries({ queryKey: ['subjects'] }),
    ]);
    if (returnTo) {
      navigate(returnTo, { state: { deckId: created.id } });
      return;
    }
    navigate(`/decks/${created.id}`);
  };

  const handleSaveEdit = async () => {
    const payload = buildDeckBatchEditPayload(original, state);
    if (Object.keys(payload).length === 0) return; // Save is disabled in this state; nothing to do.
    const updated = await updateDeck(deckId!, payload);
    // §4: stay on the page. Rebuild both the live state and the frozen baseline from
    // the response, one call — this resolves every client_key to a real id and
    // clears every pending flag naturally, since nothing pending survived the save.
    const rebuilt = deckDetailToEditorState(updated);
    setOriginal(rebuilt);
    dispatch({ type: 'LOAD', state: rebuilt });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['deck', deckId] }),
      queryClient.invalidateQueries({ queryKey: ['decks'] }),
      queryClient.invalidateQueries({ queryKey: ['decks', original.subjectId] }),
      ...(state.subjectId !== original.subjectId
        ? [queryClient.invalidateQueries({ queryKey: ['decks', state.subjectId] })]
        : []),
      queryClient.invalidateQueries({ queryKey: ['subjects'] }),
    ]);
    setSavedFlash(true);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      await (mode === 'edit' ? handleSaveEdit() : handleSaveCreate());
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  // Phase 7.6: ignores whatever's staged/unsaved in the editor, same as
  // SubjectForm/CardStandaloneForm's own deletes — deleting the whole deck makes
  // any pending edit moot. Navigates to the deck's own parent (its subject), the
  // same "one level up" pattern as a card's delete going to its deck.
  const handleDeleteDeck = async () => {
    setDeleting(true);
    setSaveError(null);
    try {
      await deleteDeck(deckId!);
      // Deliberately not invalidating ['deck', deckId] — that query is still
      // mounted on this very page until navigate() below unmounts it, and
      // invalidating it would trigger an immediate refetch of a deck that no
      // longer exists (a 404) before navigation ever runs. Same reason
      // SubjectForm/CardStandaloneForm's own deletes never invalidate the entity
      // they just deleted, only the list/parent queries that reference it.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['decks'] }),
        queryClient.invalidateQueries({ queryKey: ['decks', original.subjectId] }),
        queryClient.invalidateQueries({ queryKey: ['subjects'] }),
      ]);
      navigate(`/subjects/${original.subjectId}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong.');
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  };

  // §3: the confirm is destructive-changeset-only, and only in edit mode — create
  // mode has nothing on the server yet for a changeset to destroy.
  const handleSaveClick = () => {
    if (!canSave) return;
    if (mode === 'edit') {
      const counts = destructiveCounts(state);
      if (counts.fieldCount > 0 || counts.cardCount > 0) {
        setSaveConfirm(counts);
        return;
      }
    }
    void handleSave();
  };

  const handleRemoveField = (key: string) => dispatch({ type: 'REMOVE_FIELD', key });

  // A pending field is on its way out — CardForm shouldn't offer an input for it.
  const cardFormFieldDefs = state.fields
    .filter((f) => !f.pendingRemoval)
    .map((f) => ({ key: f.key, name: f.name, type: f.type }));
  const editingCardKey = cardFormState !== null && cardFormState !== 'new' ? cardFormState : null;
  const editingCard = editingCardKey ? state.cards.find((c) => c.key === editingCardKey) : undefined;

  const subjectDefaultValue =
    mode === 'edit' && subject ? { id: subject.id, name: subject.name, icon: subject.icon } : contextualSubject;

  // §4: "Done" once the editor has nothing unsaved to lose, "Cancel" while it does —
  // create mode never has a "clean, already saved" state to return to, so it always
  // reads "Cancel".
  const showDone = mode === 'edit' && !state.dirty;

  return (
    <div className="p-4">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between bg-(--color-surface) px-4 py-2">
        <button
          type="button"
          onClick={showDone ? goBack : handleCancel}
          className="text-sm font-medium text-(--color-text-secondary)"
        >
          {showDone ? 'Done' : 'Cancel'}
        </button>
        <h1 className="text-base font-semibold text-(--color-text)">{mode === 'edit' ? 'Edit deck' : 'New deck'}</h1>
        <div className="flex items-center gap-3">
          {mode === 'edit' && (
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              className="text-sm font-semibold text-(--color-text-secondary) disabled:text-(--color-text-muted) disabled:opacity-50"
            >
              Undo
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={!canSave}
            className="text-sm font-semibold text-(--color-primary) disabled:text-(--color-text-muted)"
          >
            {/* Reverts the instant a new edit re-dirties the form, not just after the
                2s timer — "Saved ✓" while something's already unsaved again reads wrong. */}
            {savedFlash && !state.dirty ? 'Saved ✓' : 'Save'}
          </button>
        </div>
      </div>

      {saveError && (
        <p role="alert" className="mt-2 text-sm text-(--color-danger)">
          {saveError}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-(--color-text)">Deck name</span>
          <input
            type="text"
            value={state.name}
            onChange={(e) => dispatch({ type: 'SET_NAME', name: e.target.value })}
            className="h-11 rounded-lg border border-(--color-surface-elevated) px-3 text-(--color-text)"
          />
        </label>
        <SubjectPicker
          defaultValue={subjectDefaultValue}
          onChange={(subjectId) => dispatch({ type: 'SET_SUBJECT', subjectId })}
        />
      </div>

      <FieldsSection
        fields={state.fields}
        onRename={(key, name) => dispatch({ type: 'RENAME_FIELD', key, name })}
        onMove={(key, toIndex) => dispatch({ type: 'MOVE_FIELD', key, toIndex })}
        onRemove={handleRemoveField}
        onAdd={() => dispatch({ type: 'ADD_FIELD' })}
      />

      <CardsSection
        fields={state.fields}
        cards={state.cards}
        onAdd={() => openCardForm('new')}
        onOpen={(key) => openCardForm(key)}
      />

      {mode === 'edit' && (
        <button
          type="button"
          onClick={() => setConfirmDeleteOpen(true)}
          disabled={deleting}
          className="mt-6 h-11 text-sm font-semibold text-(--color-danger) disabled:opacity-60"
        >
          Delete deck
        </button>
      )}

      <ConfirmDialog
        open={confirmCancelOpen}
        title="Discard this deck?"
        description="You have unsaved changes. Leaving now will discard them."
        confirmLabel="Discard"
        destructive
        onConfirm={goBack}
        onCancel={() => setConfirmCancelOpen(false)}
      />

      <ConfirmDialog
        open={saveConfirm !== null}
        title="Save changes?"
        description={saveConfirm ? destructiveSummaryText(saveConfirm) : ''}
        confirmLabel="Save changes"
        destructive
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
          description={
            deck && deck.cards.length > 0
              ? `This will also delete ${pluralize(deck.cards.length, 'card')}. This can't be undone.`
              : "This can't be undone."
          }
          confirmLabel="Delete"
          destructive
          onConfirm={() => void handleDeleteDeck()}
          onCancel={() => setConfirmDeleteOpen(false)}
        />
      )}

      <CardForm
        key={cardFormOpenSeq}
        open={cardFormState !== null}
        fieldDefs={cardFormFieldDefs}
        initialValues={editingCard?.values ?? EMPTY_CARD_VALUES}
        onSave={(values) => {
          if (cardFormState === 'new') dispatch({ type: 'ADD_CARD', values });
          else if (editingCardKey) dispatch({ type: 'UPDATE_CARD', key: editingCardKey, values });
          setCardFormState(null);
        }}
        onDelete={
          editingCardKey
            ? () => {
                dispatch({ type: 'REMOVE_CARD', key: editingCardKey });
                setCardFormState(null);
              }
            : undefined
        }
        onClose={() => setCardFormState(null)}
      />
    </div>
  );
}
