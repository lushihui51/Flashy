import { isSupportedFieldType } from 'src/lib/fieldTypes';

export type CardFieldsFormField = {
  /** Identifies the field within `values` — a real field id for a persisted deck's
   * fields, or DeckEditor's client-generated key for an in-progress one. Either way
   * the caller has already sorted this list into position order. */
  key: string;
  name: string;
  type: string;
};

type CardFieldsFormProps = {
  fieldDefs: CardFieldsFormField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
};

/** One labelled input per field, in the order given (§4.5). Shared between the
 * in-editor card role today and, from Phase 5, the standalone card form — neither
 * makes a network call itself, it's just controlled inputs over `values`. A field
 * whose type isn't in SUPPORTED_FIELD_TYPES (pre-rewrite `image`/`audio` data) renders
 * read-only with its stored value rather than crashing or offering an editable
 * widget that doesn't exist yet (§2.5). */
export default function CardFieldsForm({ fieldDefs, values, onChange }: CardFieldsFormProps) {
  return (
    <div className="flex flex-col gap-4">
      {fieldDefs.map((field) => {
        const supported = isSupportedFieldType(field.type);
        return (
          <label key={field.key} className="flex flex-col gap-1">
            <span className="text-sm font-medium text-(--color-text)">{field.name}</span>
            <input
              type="text"
              value={values[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              readOnly={!supported}
              className="h-11 rounded-lg border border-(--color-surface-elevated) px-3 text-(--color-text) read-only:bg-(--color-surface-elevated) read-only:text-(--color-text-muted)"
            />
            {!supported && (
              <span className="text-sm text-(--color-text-muted)">
                {/* TODO(defer:field-types) no editable widget exists yet for this type. */}
                Unsupported field type
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}
