import { useId, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { createSubject, deleteSubject, readSubject, updateSubject } from 'src/api/subject';
import { readDeletionImpact } from 'src/api/deletion_impact';
import ConfirmDialog from 'src/components/ui/ConfirmDialog';
import FormBar from 'src/components/ui/FormBar';
import SubjectIcon from 'src/components/library/SubjectIcon';
import SubjectIconPicker from 'src/components/library/SubjectIconPicker';
import { deletionSummaryText } from 'src/lib/deletionSummary';
import { subjectIconName } from 'src/lib/subjectIcon';
import type { components } from 'src/api/types';
import { ApiDetailError, isNotFound } from 'src/api/unwrap';
import { failureSentence } from 'src/lib/failureSentence';
import { usePageTitle } from 'src/lib/pageTitle';
import { internalReturnTo } from 'src/lib/returnTo';
import { useViewParams } from 'src/lib/viewParams';

type SubjectFormProps = {
  mode: 'create' | 'edit';
};

/** Routed-page wrapper — thin: it owns navigation only. `SubjectFormBody` (below) is
 * the actual form, shared with the deck editor's create-a-subject overlay, which wraps
 * the same body in a FullScreenDialog instead of a route. */
export default function SubjectForm({ mode }: SubjectFormProps) {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { params } = useViewParams();
  const cancelTo = internalReturnTo(params, 'cancelTo');
  const returnTo = internalReturnTo(params, 'returnTo');

  const subjectQuery = useQuery({
    queryKey: ['subject', subjectId],
    queryFn: () => readSubject(subjectId!),
    enabled: mode === 'edit' && !!subjectId,
  });
  usePageTitle(mode === 'create' ? 'New subject' : subjectQuery.data ? 'Edit subject' : undefined);

  if (mode === 'edit') {
    if (subjectQuery.isError) {
      return (
        <div className="p-4">
          {isNotFound(subjectQuery.error) ? (
            <p className="text-(--color-aside)">Subject not found.</p>
          ) : (
            <p role="alert" className="text-sm text-(--color-wrong)">
              Could not load this subject.
            </p>
          )}
        </div>
      );
    }
    // Gate mounting the form body on the fetch having landed, so its `useState`
    // initializers (below) see the real values exactly once instead of needing an
    // effect to patch them in after the fact.
    if (!subjectQuery.data) return null;
  }

  return (
    <SubjectFormBody
      mode={mode}
      subjectId={subjectId}
      original={mode === 'edit' ? subjectQuery.data : undefined}
      onSuccess={(subject) => navigate(returnTo ?? `/subjects/${subject.id}`)}
      onCancel={() =>
        navigate(cancelTo ?? (mode === 'create' ? '/library' : `/subjects/${subjectId}`))
      }
      onDelete={() => navigate('/library')}
    />
  );
}

export type SubjectFormBodyProps = {
  mode: 'create' | 'edit';
  subjectId: string | undefined;
  original: components['schemas']['SubjectRead'] | undefined;
  /** Create succeeded, or edit was saved (possibly a no-op save with nothing
   * changed) — either way, the subject to treat as "the current one" now. */
  onSuccess: (subject: components['schemas']['SubjectRead']) => void;
  /** Cancel confirmed (or there was nothing to confirm). */
  onCancel: () => void;
  /** Delete confirmed and succeeded. Edit mode only — the overlay never renders the
   * Delete action, so it doesn't need to pass this. */
  onDelete?: () => void;
  /** True when the form is opened in a sheet that scrolls on its own, over another form: a
   * tap of Create then leaves the page beneath where it is. */
  inOverlay?: boolean;
};

/** Create and edit share one form — mode only changes what's prefilled, the submit
 * target, and whether Delete is offered. No navigation of its own: the two callers
 * (the routed page above, and DeckEditor's create-overlay) decide what "done" means
 * for them. */
export function SubjectFormBody({
  mode,
  subjectId,
  original,
  onSuccess,
  onCancel,
  onDelete,
  inOverlay = false,
}: SubjectFormBodyProps) {
  const queryClient = useQueryClient();
  const formId = useId();
  const { reveal } = useViewParams();

  const [name, setName] = useState(original?.name ?? '');
  const [description, setDescription] = useState(original?.description ?? '');
  // '' means no picture was chosen: a create then omits `icon` and the backend's
  // default applies.
  const [icon, setIcon] = useState(original?.icon ?? '');
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const iconButtonRef = useRef<HTMLButtonElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const nameErrorRef = useRef<HTMLSpanElement>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletionImpact, setDeletionImpact] = useState<
    components['schemas']['DeletionImpactRead'] | null
  >(null);
  const [checkingDeletionImpact, setCheckingDeletionImpact] = useState(false);

  const dirty =
    mode === 'create'
      ? name.trim() !== '' || description.trim() !== '' || icon.trim() !== ''
      : !!original &&
        (name !== original.name || description !== original.description || icon !== original.icon);

  const handleCancel = () => {
    if (dirty) {
      setConfirmCancelOpen(true);
      return;
    }
    onCancel();
  };

  const revealName = () => {
    if (inOverlay) return;
    reveal({ control: () => nameInputRef.current, listStart: () => nameErrorRef.current });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Name is required.');
      revealName();
      return;
    }
    setNameError(null);
    setFormError(null);
    setSubmitting(true);
    try {
      if (mode === 'create') {
        const created = await createSubject({
          name: trimmedName,
          ...(description.trim() && { description }),
          ...(icon.trim() && { icon }),
        });
        await queryClient.invalidateQueries({ queryKey: ['subjects'] });
        onSuccess(created);
      } else {
        const payload: { name?: string; description?: string; icon?: string } = {};
        if (original && trimmedName !== original.name) payload.name = trimmedName;
        if (original && description !== original.description) payload.description = description;
        if (original && icon !== original.icon) payload.icon = icon;
        const updated =
          Object.keys(payload).length > 0 ? await updateSubject(subjectId!, payload) : original!;
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['subject', subjectId] }),
          queryClient.invalidateQueries({ queryKey: ['subjects'] }),
        ]);
        onSuccess(updated);
      }
    } catch (err) {
      const sentence = failureSentence(err, 'Subject not found.');
      // A taken name is fixed at the input, so it is said there rather than in the bar.
      if (err instanceof ApiDetailError && err.detail.code === 'subject_name_taken') {
        setNameError(sentence);
        revealName();
      } else {
        setFormError(sentence);
      }
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await deleteSubject(subjectId!);
      await queryClient.invalidateQueries({ queryKey: ['subjects'] });
      onDelete?.();
    } catch (err) {
      setFormError(failureSentence(err, 'Subject not found.'));
      setSubmitting(false);
      setConfirmDeleteOpen(false);
    }
  };

  // The confirm's wording is a live count, not a guess — fetched fresh on every click
  // rather than kept around from mount, so it reflects whatever's changed underneath
  // since the page loaded. An error renders through the form's existing error state
  // and never opens the dialog.
  const handleDeleteClick = async () => {
    setCheckingDeletionImpact(true);
    setFormError(null);
    try {
      const impact = await readDeletionImpact({ subjectIds: [subjectId!] });
      setDeletionImpact(impact);
      setConfirmDeleteOpen(true);
    } catch (err) {
      setFormError(failureSentence(err, 'Subject not found.'));
    } finally {
      setCheckingDeletionImpact(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-page leading-[1.05] font-bold tracking-[-0.02em] text-(--color-ink)">
        {mode === 'create' ? 'New subject' : 'Edit subject'}
      </h1>

      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-label text-(--color-aside)">Name</span>
          <input
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(null);
            }}
            className="h-field rounded-field outlined-line bg-(--color-surface) px-3.5 text-base text-(--color-ink) placeholder:text-(--color-aside)"
          />
          {nameError && (
            <span ref={nameErrorRef} role="alert" className="text-sm text-(--color-wrong)">
              {nameError}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-label text-(--color-aside)">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="rounded-field outlined-line bg-(--color-surface) px-3.5 py-2.5 text-base text-(--color-ink) placeholder:text-(--color-aside)"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          {/* Hidden from screen readers: the button's own name already says "Icon". */}
          <span aria-hidden="true" className="text-label text-(--color-aside)">
            Icon
          </span>
          <button
            ref={iconButtonRef}
            type="button"
            aria-label={`Icon: ${subjectIconName(icon)}`}
            onClick={() => setIconPickerOpen(true)}
            className="tappable flex size-action items-center justify-center rounded-2xl bg-(--color-surface) text-(--color-ink)"
          >
            <SubjectIcon icon={icon} className="h-6 w-6" />
          </button>
        </div>
      </form>

      {mode === 'edit' && (
        <button
          type="button"
          onClick={() => void handleDeleteClick()}
          disabled={checkingDeletionImpact}
          className="tappable flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-(--color-surface) text-base font-semibold text-(--color-ink) disabled:border-(--color-line) disabled:text-(--color-aside) disabled:[box-shadow:none]"
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
          Delete subject
        </button>
      )}

      <FormBar sentence={formError}>
        <button type="button" onClick={handleCancel} className="tappable shrink-0 h-action rounded-2xl bg-(--color-surface) px-4.5 text-action font-semibold text-(--color-ink)">
          Cancel
        </button>
        {/* A blank name reads as not pressable yet, but stays pressable: pressing it is how
            "Name is required." appears. */}
        <button
          type="submit"
          form={formId}
          disabled={submitting}
          aria-disabled={name.trim() === '' || undefined}
          className="tappable flex-1 h-action rounded-2xl bg-(--color-main-action) px-4.5 text-action font-semibold text-(--color-ink) disabled:border-(--color-line) disabled:bg-(--color-surface) disabled:text-(--color-aside) disabled:[box-shadow:none] aria-disabled:border-(--color-line) aria-disabled:bg-(--color-surface) aria-disabled:text-(--color-aside) aria-disabled:[box-shadow:none]"
        >
          {mode === 'create' ? 'Create' : 'Save'}
        </button>
      </FormBar>

      <SubjectIconPicker
        open={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        triggerRef={iconButtonRef}
        value={icon}
        onChange={(key) => {
          setIcon(key);
          setIconPickerOpen(false);
        }}
      />

      <ConfirmDialog
        open={confirmCancelOpen}
        title="Discard changes?"
        description="You have unsaved changes. Leaving now will discard them."
        confirmLabel="Discard"
        onConfirm={onCancel}
        onCancel={() => setConfirmCancelOpen(false)}
      />

      {mode === 'edit' && (
        <ConfirmDialog
          open={confirmDeleteOpen}
          title="Delete subject?"
          description={deletionImpact ? deletionSummaryText(deletionImpact) : ''}
          confirmLabel="Delete"
          onConfirm={() => void handleDelete()}
          onCancel={() => setConfirmDeleteOpen(false)}
        />
      )}
    </div>
  );
}
