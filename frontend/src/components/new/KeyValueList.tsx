import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

type Row = { id: string; key: string; value: string };

let nextRowId = 0;
const generateRowId = () => `row-${nextRowId++}`;

export default function KeyValueList({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
}) {
  const [rows, setRows] = useState<Row[]>(() => {
    const entries = Object.entries(value);
    return entries.length > 0
      ? entries.map(([key, val]) => ({ id: generateRowId(), key, value: val }))
      : [{ id: generateRowId(), key: '', value: '' }];
  });

  const emitChange = (nextRows: Row[]) => {
    const record = Object.fromEntries(
      nextRows.filter((row) => row.key.trim()).map((row) => [row.key.trim(), row.value]),
    );
    onChange(record);
  };

  const updateRow = (id: string, patch: Partial<Row>) => {
    const nextRows = rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
    setRows(nextRows);
    emitChange(nextRows);
  };

  const addRow = () => {
    setRows((prev) => [...prev, { id: generateRowId(), key: '', value: '' }]);
  };

  const removeRow = (id: string) => {
    const nextRows = rows.filter((row) => row.id !== id);
    setRows(nextRows);
    emitChange(nextRows);
  };

  return (
    <div>
      <label>{label}</label>
      {rows.map((row) => (
        <div key={row.id} className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Field name"
            value={row.key}
            onChange={(e) => updateRow(row.id, { key: e.target.value })}
          />
          <input
            type="text"
            placeholder="Field type"
            value={row.value}
            onChange={(e) => updateRow(row.id, { value: e.target.value })}
          />
          <button type="button" onClick={() => removeRow(row.id)}>
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <button type="button" onClick={addRow} className="flex items-center gap-1">
        <Plus size={15} />
        Add field
      </button>
    </div>
  );
}
