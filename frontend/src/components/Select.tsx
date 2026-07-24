import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select...',
}: {
  label?: ReactNode;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      {label && <label className="block font-semibold text-gray-900 mb-2">{label}</label>}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-gray-100 rounded-xl px-4 py-3 pr-10 text-gray-900 border border-transparent focus:outline-none focus:border-gray-900 transition-colors"
        >
          {value === '' && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={18}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
        />
      </div>
    </div>
  );
}
