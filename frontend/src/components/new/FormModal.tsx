import { useState } from 'react';
import Icon from 'src/components/new/Icon';

export type FieldProperties = {
  displayName: string;
  mandatory: boolean;
  type?: 'text' | 'icon';
};

export default function FormModal<T extends Record<string, string>>({
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
        Object.keys(fields).map((key) => [key, initialValues?.[key as keyof T] ?? '']),
      ) as T,
  );
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const missingFields = Object.entries<FieldProperties>(fields)
    .filter(([key, field]) => field.mandatory && !values[key as keyof T]?.trim())
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
        {Object.entries<FieldProperties>(fields).map(([key, field]) => (
          <div key={key}>
            {field.type === 'icon' ? (
              <Icon
                label={`${field.displayName}${field.mandatory ? '*' : ''}`}
                value={values[key as keyof T] ?? ''}
                onChange={(value) => setValues((prev) => ({ ...prev, [key]: value }) as T)}
              />
            ) : (
              <>
                <label>
                  {field.displayName}
                  {field.mandatory ? '*' : ''}
                </label>
                <input
                  type="text"
                  value={values[key as keyof T] ?? ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }) as T)}
                />
              </>
            )}
          </div>
        ))}
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
