import { useState } from 'react';
import Icon from 'src/components/new/Icon';
import Select from 'src/components/new/Select';
import KeyValueList from 'src/components/new/KeyValueList';

export type FieldProperties =
  | { displayName: string; mandatory: boolean; type?: 'text' }
  | { displayName: string; mandatory: boolean; type: 'icon' }
  | {
      displayName: string;
      mandatory: boolean;
      type: 'select';
      options: { value: string; label: string }[];
    }
  | { displayName: string; mandatory: boolean; type: 'keyvalue' };

type FieldValue = string | Record<string, string>;

export default function FormModal<T extends Record<string, FieldValue>>({
  title,
  caption,
  fields,
  initialValues,
  onSubmit,
  handleClose,
  isSubmitting = false,
  error = null,
}: {
  title: string;
  caption: string;
  fields: Record<keyof T, FieldProperties>;
  initialValues?: Partial<T>;
  onSubmit: (values: T) => void;
  handleClose: () => void;
  isSubmitting?: boolean;
  error?: Error | null;
}) {
  const [values, setValues] = useState<T>(
    () =>
      Object.fromEntries(
        Object.entries<FieldProperties>(fields).map(([key, field]) => [
          key,
          initialValues?.[key as keyof T] ?? (field.type === 'keyvalue' ? {} : ''),
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
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
      onClick={handleClose}
    >
      <div className="bg-white p-6 rounded shadow-md" onClick={(e) => e.stopPropagation()}>
        <h1>{title}</h1>
        <p>{caption}</p>
        {Object.entries<FieldProperties>(fields).map(([key, field]) => {
          const label = `${field.displayName}${field.mandatory ? '*' : ''}`;
          return (
            <div key={key}>
              {field.type === 'icon' && (
                <Icon
                  label={label}
                  value={(values[key as keyof T] as string) ?? ''}
                  onChange={(value) => setValues((prev) => ({ ...prev, [key]: value }) as T)}
                />
              )}
              {field.type === 'select' && (
                <Select
                  label={label}
                  value={(values[key as keyof T] as string) ?? ''}
                  options={field.options}
                  onChange={(value) => setValues((prev) => ({ ...prev, [key]: value }) as T)}
                />
              )}
              {field.type === 'keyvalue' && (
                <KeyValueList
                  label={label}
                  value={(values[key as keyof T] as Record<string, string>) ?? {}}
                  onChange={(value) => setValues((prev) => ({ ...prev, [key]: value }) as T)}
                />
              )}
              {(!field.type || field.type === 'text') && (
                <>
                  <label>{label}</label>
                  <input
                    type="text"
                    value={(values[key as keyof T] as string) ?? ''}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [key]: e.target.value }) as T)
                    }
                  />
                </>
              )}
            </div>
          );
        })}
        <button onClick={handleCreate} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
        {attemptedSubmit && missingFields.length > 0 && (
          <p>
            {missingFields.join(', ')} {missingFields.length > 1 ? 'are' : 'is'} required
          </p>
        )}
        {error && <p>Error: {error.message}</p>}
        <button onClick={handleClose}>Close</button>
      </div>
    </div>
  );
}
