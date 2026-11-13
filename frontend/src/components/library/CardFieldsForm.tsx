import { isSupportedFieldType } from 'src/lib/fieldTypes';
import { fieldLabel } from 'src/lib/fieldLabel';

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

/** One labelled input per field, in the order given. No network call of its own — just
 * controlled inputs over `values`. A field whose type isn't in SUPPORTED_FIELD_TYPES
 * (`image`/`audio`) renders read-only with its stored value rather than crashing or
 * offering an editable widget for a type the form cannot edit. */
export default function CardFieldsForm({ fieldDefs, values, onChange }: CardFieldsFormProps) {
  return (
    <div className="flex flex-col gap-4">
      {fieldDefs.map((field) => {
        const supported = isSupportedFieldType(field.type);
        return (
          <label key={field.key} className="flex flex-col gap-1.5">
            <span className="text-label text-(--color-aside)">{fieldLabel(field.name)}</span>
            <input
              type="text"
              value={values[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              readOnly={!supported}
              className="h-field rounded-field outlined-line bg-(--color-surface) px-3.5 text-base text-(--color-ink) placeholder:text-(--color-aside) read-only:bg-(--color-ground) read-only:text-(--color-aside)"
            />
            {!supported && (
              <span className="text-sm text-(--color-aside)">
                Unsupported field type
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}
