import { useState } from 'react';
import FullScreenDialog from 'src/components/library/FullScreenDialog';
import CardFieldsForm, { type CardFieldsFormField } from 'src/components/library/CardFieldsForm';

type CardFormEditorProps = {
  open: boolean;
  fieldDefs: CardFieldsFormField[];
  /** Empty object when adding a new card; the card's current values when reopening
   * an existing one. */
  initialValues: Record<string, string>;
  onSave: (values: Record<string, string>) => void;
  /** Present only when reopening an existing in-editor card — its absence is what
   * hides the Delete action for the "add" case. */
  onDelete?: () => void;
  onClose: () => void;
};

/** CardForm's in-editor role (§4.6) — the only mode Phase 4 builds. It makes no
 * network calls; Save and Delete just report the result back to DeckEditor's
 * reducer. The standalone create/edit modes (their own routes, real API calls) are
 * Phase 5's addition to this same component.
 *
 * The caller must remount this component (a `key` that changes on every open) rather
 * than rely on `initialValues` changing identity to reset the form — DeckEditor stays
 * mounted for the editor's whole lifetime, so re-opening "Add card" twice in a row
 * both times passes the *same* empty-object reference, and reference-based resync
 * would silently leave the first card's typed values in the second card's form. */
export default function CardForm({
  open,
  fieldDefs,
  initialValues,
  onSave,
  onDelete,
  onClose,
}: CardFormEditorProps) {
  const [values, setValues] = useState(initialValues);

  return (
    <FullScreenDialog open={open} onClose={onClose} ariaLabel={onDelete ? 'Edit card' : 'Add card'}>
      <div className="flex items-center justify-between">
        <button type="button" onClick={onClose} className="text-sm font-medium text-(--color-text-secondary)">
          Cancel
        </button>
        <h2 className="text-base font-semibold text-(--color-text)">{onDelete ? 'Edit card' : 'Add card'}</h2>
        <span aria-hidden="true" className="w-[42px]" />
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <CardFieldsForm
          fieldDefs={fieldDefs}
          values={values}
          onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
        />

        <button
          type="button"
          onClick={() => onSave(values)}
          className="h-12 w-full rounded-full bg-(--color-primary) text-sm font-semibold text-(--color-primary-contrast)"
        >
          {onDelete ? 'Save' : 'Add card'}
        </button>

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="h-11 text-sm font-semibold text-(--color-danger)"
          >
            Delete card
          </button>
        )}
      </div>
    </FullScreenDialog>
  );
}
