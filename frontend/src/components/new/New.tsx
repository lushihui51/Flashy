import { useState } from 'react';

export type NewField = {
  displayName: string;
  mandatory: boolean;
};

export default function New({
  title,
  caption,
  fields,
  onSubmit,
  onClose,
  isSubmitting = false,
  error = null,
}: {
  title: string;
  caption: string;
  fields: Record<string, NewField>;
  onSubmit: (values: Record<string, string>) => void;
  onClose: () => void;
  isSubmitting?: boolean;
  error?: Error | null;
}) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(Object.keys(fields).map((key) => [key, ''])),
  );

  const handleCreate = () => {
    onSubmit(values);
  };
  return (
    <div>
      <h1>{title}</h1>
      <p>{caption}</p>
      {Object.entries(fields).map(([key, field]) => (
        <div key={key}>
          <label>
            {field.displayName}
            {field.mandatory ? ' *' : ''}
          </label>
          <input
            type="text"
            value={values[key]}
            onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
          />
        </div>
      ))}
      <button onClick={handleCreate} disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create'}
      </button>
      {error && <p>Error: {error.message}</p>}
      <button onClick={onClose}>Close</button>
    </div>
  );
}
