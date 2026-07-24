import { useState } from 'react';
import Icon from 'src/components/Icon';
import Select from 'src/components/Select';
import KeyValueList from 'src/components/KeyValueList';
import FieldLabel, { FieldLabelContent } from 'src/components/FieldLabel';

export type FieldProperties =
  | { displayName: string; mandatory: boolean; type?: 'text'; placeholder?: string }
  | { displayName: string; mandatory: boolean; type: 'textarea'; placeholder?: string }
  | { displayName: string; mandatory: boolean; type: 'icon' }
  | {
      displayName: string;
      mandatory: boolean;
      type: 'select';
      options: { value: string; label: string }[];
    }
  | { displayName: string; mandatory: boolean; type: 'keyvalue' };

type FieldValue = string | Record<string, string>;

const inputClasses =
  'w-full bg-gray-100 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 ' +
  'border border-transparent focus:outline-none focus:border-gray-900 transition-colors';

export default function FormModal<T extends Record<string, FieldValue>>({
  title,
  caption,
  fields,
  initialValues,
  onSubmit,
  handleClose,
  isSubmitting = false,
  error = null,
  submitLabel = 'Submit',
}: {
  title: string;
  caption: string;
  fields: Record<keyof T, FieldProperties>;
  initialValues?: Partial<T>;
  onSubmit: (values: T) => void;
  handleClose: () => void;
  isSubmitting?: boolean;
  error?: Error | null;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<T>(
    () =>
      Object.fromEntries(
        Object.entries<FieldProperties>(fields).map(([key, field]) => [
          key,
          initialValues?.[key as keyof T] ??
            (field.type === 'keyvalue' ? {} : field.type === 'icon' ? 'book-open' : ''),
        ]),
      ) as T,
  );
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const missingFields = Object.entries<FieldProperties>(fields)
    .filter(([key, field]) => {
      if (!field.mandatory) {
        return false;
      }
      const value = values[key as keyof T];
      if (field.type === 'keyvalue') {
        return Object.keys(value as Record<string, string>).length === 0;
      }
      return !(value as string)?.trim();
    })
    .map(([, field]) => field.displayName);

  const handleCreate = () => {
    setAttemptedSubmit(true);
    if (missingFields.length > 0) {
      return;
    }
    onSubmit(values);
  };

  const setValue = (key: string, value: FieldValue) =>
    setValues((prev) => ({ ...prev, [key]: value }) as T);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
          >
            &times;
          </button>
        </div>
        <p className="text-gray-500 mt-1 mb-6">{caption}</p>

        {/* Fields */}
        <div className="space-y-5">
          {Object.entries<FieldProperties>(fields).map(([key, field]) => {
            const label = `${field.displayName}${field.mandatory ? ' (required)' : ''}`;
            const labelContent = (
              <FieldLabelContent name={field.displayName} mandatory={field.mandatory} />
            );
            return (
              <div key={key}>
                {field.type === 'icon' && (
                  <Icon
                    label={label}
                    value={(values[key as keyof T] as string) ?? ''}
                    onChange={(value) => setValue(key, value)}
                  />
                )}
                {field.type === 'select' && (
                  <Select
                    label={labelContent}
                    value={(values[key as keyof T] as string) ?? ''}
                    options={field.options}
                    onChange={(value) => setValue(key, value)}
                  />
                )}
                {field.type === 'keyvalue' && (
                  <KeyValueList
                    label={labelContent}
                    value={(values[key as keyof T] as Record<string, string>) ?? {}}
                    onChange={(value) => setValue(key, value)}
                  />
                )}
                {field.type === 'textarea' && (
                  <>
                    <FieldLabel name={field.displayName} mandatory={field.mandatory} />
                    <textarea
                      rows={3}
                      value={(values[key as keyof T] as string) ?? ''}
                      placeholder={field.placeholder}
                      onChange={(e) => setValue(key, e.target.value)}
                      className={`${inputClasses} resize-none`}
                    />
                  </>
                )}
                {(!field.type || field.type === 'text') && (
                  <>
                    <FieldLabel name={field.displayName} mandatory={field.mandatory} />
                    <input
                      type="text"
                      value={(values[key as keyof T] as string) ?? ''}
                      placeholder={field.placeholder}
                      onChange={(e) => setValue(key, e.target.value)}
                      className={inputClasses}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Validation + error messages */}
        {attemptedSubmit && missingFields.length > 0 && (
          <p className="text-sm text-red-600 mt-4">
            {missingFields.join(', ')} {missingFields.length > 1 ? 'are' : 'is'} required
          </p>
        )}
        {error && <p className="text-sm text-red-600 mt-4">Error: {error.message}</p>}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 mt-6 pt-5">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 text-gray-500 hover:text-gray-700 font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Submitting...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
