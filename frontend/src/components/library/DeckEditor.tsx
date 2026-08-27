import { useEffect, useReducer, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreVertical, Plus, X } from 'lucide-react';
import { createDeck, deleteDeck, readDeck, updateDeck } from 'src/api/deck';
import { readSubject, readSubjects } from 'src/api/subject';
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
import PickerCombobox from 'src/components/ui/PickerCombobox';
import FullScreenDialog from 'src/components/ui/FullScreenDialog';
import SubjectIcon from 'src/components/library/SubjectIcon';
import { SubjectFormBody } from 'src/components/library/SubjectForm';
import ConfirmDialog from 'src/components/ui/ConfirmDialog';
import { internalReturnTo } from 'src/lib/returnTo';
import type { components } from 'src/api/types';

type DeckDetail = components['schemas']['DeckDetail'];
type SubjectRead = components['schemas']['SubjectRead'];

/** Only what the subject combobox displays — satisfied by SubjectSummary (the list
 * from readSubjects), SubjectRead (what createSubject returns), or the `{id, name,
 * icon}` a contextual entry point hands over in router state. Deliberately narrower
 * than any of them so none needs reshaping to pass through. */
type SubjectItem = { id: string; name: string; icon?: string | null };

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
                    <MoreVertical
                      aria-hidden="true"
                      className="h-4 w-4 text-(--color-text-muted)"
                    />
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

type CreateLocationState = {
  subject?: { id: string; name: string; icon: string };
} | null;

type DeckEditorProps = {
  mode: 'create' | 'edit';
};

/** Full-screen route page (§4.7). Mode is derived from the route (`/decks/new` vs.
 * `/decks/:deckId/edit`, App.tsx), same pattern as `SubjectForm`/`CardStandaloneForm`.
 * Edit mode (Phase 7) loads the existing `DeckDetail` — and its subject, since the
 * subject combobox needs the full `{id, name, icon}` object, not just an id — before
 * mounting the body, gated the same way `CardStandaloneForm` gates on its deck. */
export default function DeckEditor({ mode }: DeckEditorProps) {
  const { deckId } = useParams<{ deckId: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();

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
      // ADR 024: returnTo rides the URL, not state — create mode only; an edit is
      // never entered via a "New deck…" round-trip.
      returnTo={mode === 'create' ? internalReturnTo(searchParams) : null}
    />
  );
}

type DeckEditorBodyProps = {
  mode: 'create' | 'edit';
  deckId: string | undefined;
  deck: DeckDetail | undefined;
  subject: SubjectRead | undefined;
  contextualSubject: { id: string; name: string; icon: string } | null;
  returnTo: string | null;
};

/** Phase 7.5 §2: counts what the current changeset would actually delete — the only
 * thing the aggregated save confirm needs, and what decides whether it shows at all. */
/** What a deck delete takes with it, and what it leaves. The cascade is ADR 015's:
 * cards, fields and configurations are deck-owned and go; `review_log` is history and
 * is never deleted, so mastery survives the deck it was earned on. */
function deleteDeckSummaryText(deck: DeckDetail | undefined): string {
  const owned = [
    ...(deck && deck.cards.length > 0 ? [pluralize(deck.cards.length, 'card')] : []),
    ...(deck && deck.field_defs.length > 0 ? [pluralize(deck.field_defs.length, 'field')] : []),
    'its practice configurations',
  ];
  const list = owned.length > 1 ? `${owned.slice(0, -1).join(', ')} and ${owned.at(-1)}` : owned[0];
  return `This also deletes ${list}. Your review history is kept. This can't be undone.`;
}

function destructiveCounts(state: DeckEditorState) {
  return { fieldCount: state.fields.filter((f) => f.pendingRemoval).length };
}

/** One aggregate sentence, counts only — no per-field breakdown (Phase 7.5 §3).
 * Archiving a field keeps its existing card values as inert history (ADR 010), which
 * is why this says the field goes and not the content behind it. */
function destructiveSummaryText({ fieldCount }: ReturnType<typeof destructiveCounts>): string {
  return `This removes ${pluralize(fieldCount, 'field')} from every card in this deck. This can't be undone.`;
}

function DeckEditorBody({
  mode,
  deckId,
  deck,
  subject,
  contextualSubject,
  returnTo,
}: DeckEditorBodyProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const subjectsQuery = useQuery({ queryKey: ['subjects'], queryFn: readSubjects });

  // Computed once, at mount — the same rule as the subject combobox's own initial
  // selection below. `original` doubles as the frozen baseline the edit-mode diff
  // compares against: deckDetailToEditorState mints a fresh client `key` per field
  // and card, and calling it twice would mint two different sets of keys for the
  // same rows, breaking every id-based comparison in buildDeckBatchEditPayload.
  // Unlike Phase 7, this is no longer frozen for the component's whole lifetime —
  // Phase 7.5 rebases it after every successful edit-mode save (§4), and the global
  // Undo (§2) reverts to it directly.
  const [original, setOriginal] = useState<DeckEditorState>(() =>
    mode === 'edit' && deck
      ? deckDetailToEditorState(deck)
      : initialDeckEditorState(contextualSubject?.id ?? null),
  );
  const [state, dispatch] = useReducer(deckEditorReducer, original);

  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [saveConfirm, setSaveConfirm] = useState<ReturnType<typeof destructiveCounts> | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  // Create mode opened via the card form's "New deck…" round-trip → both Save and
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
      if (counts.fieldCount > 0) {
        setSaveConfirm(counts);
        return;
      }
    }
    void handleSave();
  };

  const handleRemoveField = (key: string) => dispatch({ type: 'REMOVE_FIELD', key });

  const subjectDefaultValue: SubjectItem | null =
    mode === 'edit' && subject
      ? { id: subject.id, name: subject.name, icon: subject.icon }
      : contextualSubject;

  // The subject combobox is wired here rather than behind a picker component of its own:
  // the fetch has to live in a page-level component (shared components take their data as
  // props), and once it does, the wrapper is only holding this selection and the create
  // overlay — both of which belong to the one screen that uses them.
  //
  // `selectedSubject` is owned here, not read straight off `subjectDefaultValue`:
  // PickerCombobox compares its displayed text against the selected item's name to decide
  // whether reopening shows the full list or a filtered one, so a selection that never
  // advanced past the initial default would leave that comparison pointing at the wrong
  // name.
  const [selectedSubject, setSelectedSubject] = useState<SubjectItem | null>(subjectDefaultValue);
  const [subjectOverlayOpen, setSubjectOverlayOpen] = useState(false);
  const subjectInputRef = useRef<HTMLInputElement>(null);

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
        <h1 className="text-base font-semibold text-(--color-text)">
          {mode === 'edit' ? 'Edit deck' : 'New deck'}
        </h1>
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
        <PickerCombobox<SubjectItem>
          items={subjectsQuery.data ?? []}
          selected={selectedSubject}
          onSelect={(item) => {
            setSelectedSubject(item);
            dispatch({ type: 'SET_SUBJECT', subjectId: item.id });
          }}
          onSelectCreate={() => setSubjectOverlayOpen(true)}
          createLabel="New subject…"
          placeholder="Subject"
          renderLeading={(item) => <SubjectIcon icon={item.icon} className="h-4 w-4" />}
          inputRef={subjectInputRef}
        />
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
          onClick={() => setConfirmDeleteOpen(true)}
          disabled={deleting}
          className="mt-6 h-11 text-sm font-semibold text-(--color-danger) disabled:opacity-60"
        >
          Delete deck
        </button>
      )}

      {/* Creating a subject from the combobox's create row happens *over* this editor
          rather than navigating away — unlike "New deck…" in the card form, there is
          nothing heavy to nest here and everything typed so far would otherwise be lost. */}
      <FullScreenDialog
        open={subjectOverlayOpen}
        onClose={() => setSubjectOverlayOpen(false)}
        ariaLabel="New subject"
        triggerRef={subjectInputRef}
      >
        <SubjectFormBody
          mode="create"
          subjectId={undefined}
          original={undefined}
          deckCount={0}
          onSuccess={(subject) => {
            void queryClient.invalidateQueries({ queryKey: ['subjects'] });
            setSelectedSubject(subject);
            dispatch({ type: 'SET_SUBJECT', subjectId: subject.id });
            setSubjectOverlayOpen(false);
          }}
          onCancel={() => setSubjectOverlayOpen(false)}
        />
      </FullScreenDialog>

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
          // Names everything that goes with it (ADR 015: the deck owns its cards,
          // fields and configurations, and they cascade), and says what does not —
          // review history is never deleted, so past practice still counts.
          description={deleteDeckSummaryText(deck)}
          confirmLabel="Delete"
          destructive
          onConfirm={() => void handleDeleteDeck()}
          onCancel={() => setConfirmDeleteOpen(false)}
        />
      )}
    </div>
  );
}
