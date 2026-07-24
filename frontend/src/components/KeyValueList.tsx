import { useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';

type Row = { id: number; name: string; type: string };

const TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Image' },
];

export default function KeyValueList({
  label,
  value,
  onChange,
  typeOptions = TYPE_OPTIONS,
}: {
  label?: ReactNode;
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  typeOptions?: { value: string; label: string }[];
}) {
  // Rows carry a stable id so typing in the name input doesn't lose focus
  // or reorder entries the way keying by the record's keys would.
  const [rows, setRows] = useState<Row[]>(() => {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return [{ id: 0, name: '', type: typeOptions[0]?.value || 'text' }];
    }
    return entries.map(([name, type], index) => ({ id: index, name, type }));
  });
  const nextId = useRef(Math.max(1, Object.entries(value).length));

  const emit = (nextRows: Row[]) => {
    setRows(nextRows);
    onChange(
      Object.fromEntries(
        nextRows.filter((row) => row.name.trim()).map((row) => [row.name.trim(), row.type]),
      ),
    );
  };

  const updateRow = (id: number, patch: Partial<Omit<Row, 'id'>>) =>
    emit(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const addRow = () =>
    emit([...rows, { id: nextId.current++, name: '', type: typeOptions[0]?.value || 'text' }]);

  const removeRow = (id: number) => emit(rows.filter((row) => row.id !== id));

  return (
    <div>
      <div className="flex items-baseline justify-between">
        {label ? (
          <label className="block font-semibold text-gray-900 mb-2">{label}</label>
        ) : (
          <span />
        )}
        <span className="text-sm text-gray-400">
          {rows.length} {rows.length === 1 ? 'field' : 'fields'}
        </span>
      </div>

      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={row.id} className="flex items-center gap-2">
            <input
              type="text"
              value={row.name}
              placeholder={`Field ${index + 1} name`}
              onChange={(e) => updateRow(row.id, { name: e.target.value })}
              className="flex-1 min-w-0 bg-gray-100 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 border border-transparent focus:outline-none focus:border-gray-900 transition-colors"
            />
            <div className="relative">
              <select
                value={row.type}
                onChange={(e) => updateRow(row.id, { type: e.target.value })}
                className="appearance-none bg-gray-100 rounded-xl pl-4 pr-9 py-3 text-gray-900 border border-transparent focus:outline-none focus:border-gray-900 transition-colors"
              >
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
            </div>
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              aria-label={`Remove field ${index + 1}`}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1.5 mt-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Plus size={16} />
        Add field
      </button>
    </div>
  );
}
