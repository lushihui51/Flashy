export default function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const hasEmptyOption = options.some((option) => option.value === '');
  return (
    <div>
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {!hasEmptyOption && (
          <option value="" disabled>
            Select {label}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
