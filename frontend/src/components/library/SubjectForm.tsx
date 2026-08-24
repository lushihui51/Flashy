import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createSubject, deleteSubject, readSubject, updateSubject } from 'src/api/subject';
import { readDecks } from 'src/api/deck';
import ConfirmDialog from 'src/components/library/ConfirmDialog';
import { pluralize } from 'src/lib/pluralize';
import type { components } from 'src/api/types';

type SubjectFormProps = {
  mode: 'create' | 'edit';
};

/** Routed-page wrapper (Phase 3) — thin: it owns navigation only. `SubjectFormBody`
 * (below) is the actual form, shared with SubjectPicker's create-overlay (Phase 5.5
 * §3), which wraps the same body in a FullScreenDialog instead of a route. */
export default function SubjectForm({ mode }: SubjectFormProps) {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();

  const subjectQuery = useQuery({
    queryKey: ['subject', subjectId],
    queryFn: () => readSubject(subjectId!),
    enabled: mode === 'edit' && !!subjectId,
  });
  const decksQuery = useQuery({
    queryKey: ['decks', subjectId],
    queryFn: () => readDecks(subjectId),
    enabled: mode === 'edit' && !!subjectId,
  });

  if (mode === 'edit') {
    if (subjectQuery.isError) {
      return (
        <div className="p-4">
          <p className="text-(--color-text-muted)">Subject not found.</p>
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
      deckCount={decksQuery.data?.length ?? 0}
      onSuccess={(subject) => navigate(`/subjects/${subject.id}`)}
      onCancel={() => navigate(mode === 'create' ? '/library' : `/subjects/${subjectId}`)}
      onDelete={() => navigate('/library')}
    />
  );
}

export type SubjectFormBodyProps = {
  mode: 'create' | 'edit';
  subjectId: string | undefined;
  original: components['schemas']['SubjectRead'] | undefined;
  /** Only meaningful in edit mode — names the count in the delete confirm. The
   * create-overlay caller (SubjectPicker) never renders that branch, so it can pass
   * 0 without fetching anything. */
  deckCount: number;
  /** Create succeeded, or edit was saved (possibly a no-op save with nothing
   * changed) — either way, the subject to treat as "the current one" now. */
  onSuccess: (subject: components['schemas']['SubjectRead']) => void;
  /** Cancel confirmed (or there was nothing to confirm). */
  onCancel: () => void;
  /** Delete confirmed and succeeded. Edit mode only — the overlay never renders the
   * Delete action, so it doesn't need to pass this. */
  onDelete?: () => void;
};

/** Create and edit share one form (D1) — mode only changes what's prefilled, the
 * submit target, and whether Delete is offered. No navigation of its own: the two
 * callers (the routed page above, and SubjectPicker's create-overlay) decide what
 * "done" means for them. */
export function SubjectFormBody({
  mode,
  subjectId,
  original,
  deckCount,
  onSuccess,
  onCancel,
  onDelete,
}: SubjectFormBodyProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState(original?.name ?? '');
  const [description, setDescription] = useState(original?.description ?? '');
  const [icon, setIcon] = useState(original?.icon ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const dirty =
    mode === 'create'
      ? name.trim() !== '' || description.trim() !== '' || icon.trim() !== ''
      : !!original && (name !== original.name || description !== original.description || icon !== original.icon);

  const handleCancel = () => {
    if (dirty) {
      setConfirmCancelOpen(true);
      return;
    }
    onCancel();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Name is required.');
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
      setFormError(err instanceof Error ? err.message : 'Something went wrong.');
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
      setFormError(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
      setConfirmDeleteOpen(false);
    }
  };

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
          {mode === 'create' ? 'New subject' : 'Edit subject'}
        </h1>
        <span aria-hidden="true" className="w-[42px]" />
      </div>

      {formError && (
        <p role="alert" className="text-sm text-(--color-danger)">
          {formError}
        </p>
      )}

      {/* No fixed/sticky positioning on the submit button — it sits in normal
          document flow so a mobile keyboard opening (which shrinks the visual
          viewport) never overlaps it; the page just scrolls. */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-(--color-text)">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 rounded-lg border border-(--color-surface-elevated) px-3 text-(--color-text)"
          />
          {nameError && (
            <span role="alert" className="text-sm text-(--color-danger)">
              {nameError}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-(--color-text)">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="rounded-lg border border-(--color-surface-elevated) px-3 py-2 text-(--color-text)"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-(--color-text)">Icon</span>
          {/* TODO(defer:icon-picker) plain text identifier input until a real picker
              exists; see frontend/src/lib/subjectIcon.ts for the curated set this
              maps into and its fallback. */}
          <input
            type="text"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="book-open"
            className="h-11 rounded-lg border border-(--color-surface-elevated) px-3 text-(--color-text)"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="h-12 w-full rounded-full bg-(--color-primary) text-sm font-semibold text-(--color-primary-contrast) disabled:opacity-60"
        >
          {mode === 'create' ? 'Create subject' : 'Save changes'}
        </button>
      </form>

      {mode === 'edit' && (
        <button
          type="button"
          onClick={() => setConfirmDeleteOpen(true)}
          className="h-11 text-sm font-semibold text-(--color-danger)"
        >
          Delete subject
        </button>
      )}

      <ConfirmDialog
        open={confirmCancelOpen}
        title="Discard changes?"
        description="You have unsaved changes. Leaving now will discard them."
        confirmLabel="Discard"
        destructive
        onConfirm={onCancel}
        onCancel={() => setConfirmCancelOpen(false)}
      />

      {mode === 'edit' && (
        <ConfirmDialog
          open={confirmDeleteOpen}
          title="Delete subject?"
          description={
            deckCount > 0
              ? `This will also delete ${pluralize(deckCount, 'deck')} and all of their cards. This can't be undone.`
              : "This can't be undone."
          }
          confirmLabel="Delete"
          destructive
          onConfirm={() => void handleDelete()}
          onCancel={() => setConfirmDeleteOpen(false)}
        />
      )}
    </div>
  );
}
